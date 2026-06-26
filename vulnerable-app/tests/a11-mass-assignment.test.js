const request = require('supertest');
const express = require('express');
const { makeTestDb } = require('./setup');
const makeRouter = require('../routes/a11-mass-assignment');

function makeApp(db) {
  const app = express();
  app.use(express.json());
  app.use('/a11', makeRouter(db));
  return app;
}

let app, db;
beforeEach(() => { db = makeTestDb(); app = makeApp(db); });

// ── Vulnerable endpoint tests ────────────────────────────────

test('vulnerable: GET profile returns profile including is_admin field', async () => {
  const res = await request(app)
    .get('/a11/vulnerable/profile/1')
    .set('x-user-id', '1');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('is_admin');
  expect(res.body.name).toBe('Alice Smith');
});

test('vulnerable: GET profile returns 404 for unknown user', async () => {
  const res = await request(app)
    .get('/a11/vulnerable/profile/999')
    .set('x-user-id', '1');
  expect(res.status).toBe(404);
});

test('vulnerable: IDOR — body user_id redirects update to another user', async () => {
  const res = await request(app)
    .put('/a11/vulnerable/profile')
    .set('x-user-id', '1')
    .send({ user_id: 2, name: 'Pwned' });
  expect(res.status).toBe(200);
  expect(res.body.target_user_id).toBe(2);
});

test('vulnerable: IDOR — Bob\'s profile is actually changed after attack', async () => {
  await request(app)
    .put('/a11/vulnerable/profile')
    .set('x-user-id', '1')
    .send({ user_id: 2, name: 'Pwned' });
  const bob = db.prepare('SELECT * FROM profiles WHERE user_id = 2').get();
  expect(bob.name).toBe('Pwned');
});

test('vulnerable: privilege escalation — is_admin accepted from client', async () => {
  const res = await request(app)
    .put('/a11/vulnerable/profile')
    .set('x-user-id', '1')
    .send({ is_admin: 1, bio: 'I am now admin' });
  expect(res.status).toBe(200);
});

test('vulnerable: privilege escalation — Alice becomes admin after sending is_admin:1', async () => {
  await request(app)
    .put('/a11/vulnerable/profile')
    .set('x-user-id', '1')
    .send({ is_admin: 1, bio: 'I am now admin' });
  const alice = db.prepare('SELECT * FROM profiles WHERE user_id = 1').get();
  expect(alice.is_admin).toBe(1);
});

test('vulnerable: no auth header returns 401', async () => {
  const res = await request(app)
    .put('/a11/vulnerable/profile')
    .send({ name: 'NoAuth' });
  expect(res.status).toBe(401);
});

test('vulnerable: empty payload returns 400', async () => {
  const res = await request(app)
    .put('/a11/vulnerable/profile')
    .set('x-user-id', '1')
    .send({});
  expect(res.status).toBe(400);
});

// ── Fixed endpoint tests ─────────────────────────────────────

test('fixed: GET profile does NOT include is_admin field', async () => {
  const res = await request(app)
    .get('/a11/fixed/profile/1')
    .set('x-user-id', '1');
  expect(res.status).toBe(200);
  expect(res.body).not.toHaveProperty('is_admin');
  expect(res.body).not.toHaveProperty('email');
});

test('fixed: PUT with user_id and is_admin in body updates own profile only', async () => {
  const res = await request(app)
    .put('/a11/fixed/profile')
    .set('x-user-id', '1')
    .send({ user_id: 2, is_admin: 1, name: 'Hack Attempt' });
  expect(res.status).toBe(200);
  // profile returned belongs to authUser (1), not user 2
  expect(res.body.profile.user_id).toBe(1);
  expect(res.body.profile.name).toBe('Hack Attempt');
});

test('fixed: PUT does not modify another user\'s profile', async () => {
  await request(app)
    .put('/a11/fixed/profile')
    .set('x-user-id', '1')
    .send({ user_id: 2, is_admin: 1, name: 'Hack Attempt' });
  const bob = db.prepare('SELECT * FROM profiles WHERE user_id = 2').get();
  expect(bob.name).toBe('Bob Jones');
});

test('fixed: PUT does not escalate is_admin', async () => {
  await request(app)
    .put('/a11/fixed/profile')
    .set('x-user-id', '1')
    .send({ is_admin: 1, name: 'Still Alice' });
  const alice = db.prepare('SELECT * FROM profiles WHERE user_id = 1').get();
  expect(alice.is_admin).toBe(0);
});

test('fixed: no auth header returns 401', async () => {
  const res = await request(app)
    .put('/a11/fixed/profile')
    .send({ name: 'NoAuth' });
  expect(res.status).toBe(401);
});

test('fixed: empty allowed fields returns 400', async () => {
  const res = await request(app)
    .put('/a11/fixed/profile')
    .set('x-user-id', '1')
    .send({ user_id: 2, is_admin: 1 }); // no name or bio
  expect(res.status).toBe(400);
});
