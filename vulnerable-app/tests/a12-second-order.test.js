const request = require('supertest');
const express = require('express');
const { makeTestDb } = require('./setup');
const makeRouter = require('../routes/a12-second-order');

function makeApp(db) {
  const app = express();
  app.use(express.json());
  app.use('/a12', makeRouter(db));
  return app;
}

let app, db;
beforeEach(() => { db = makeTestDb(); app = makeApp(db); });

// ── Vulnerable endpoint tests ────────────────────────────────

test('vulnerable: save returns 200 for a normal filter', async () => {
  const res = await request(app)
    .post('/a12/vulnerable/save')
    .set('x-user-id', '1')
    .send({ q: 'Widget' });
  expect(res.status).toBe(200);
  expect(res.body.saved).toBe(true);
});

test('vulnerable: run after saving Widget returns matching products', async () => {
  // Seed products named "Widget A" and "Widget B" to match
  db.prepare('INSERT INTO products VALUES (10, ?, 9.99, ?)').run('Widget A', 'WGT-A');
  db.prepare('INSERT INTO products VALUES (11, ?, 4.99, ?)').run('Widget B', 'WGT-B');

  await request(app)
    .post('/a12/vulnerable/save')
    .set('x-user-id', '1')
    .send({ q: 'Widget' });

  const res = await request(app)
    .get('/a12/vulnerable/run')
    .set('x-user-id', '1');
  expect(res.status).toBe(200);
  const names = res.body.results.map(r => r.name);
  expect(names).toEqual(expect.arrayContaining(['Widget A', 'Widget B']));
});

test('vulnerable: save with injection payload returns 200', async () => {
  const res = await request(app)
    .post('/a12/vulnerable/save')
    .set('x-user-id', '1')
    .send({ q: "' OR '1'='1" });
  expect(res.status).toBe(200);
  expect(res.body.saved).toBe(true);
});

test('vulnerable: run with injection payload returns all products (injection worked)', async () => {
  await request(app)
    .post('/a12/vulnerable/save')
    .set('x-user-id', '1')
    .send({ q: "' OR '1'='1" });

  const res = await request(app)
    .get('/a12/vulnerable/run')
    .set('x-user-id', '1');
  expect(res.status).toBe(200);
  // The injection ' OR '1'='1 causes all 3 seeded products to be returned
  expect(res.body.results.length).toBe(3);
});

test('vulnerable: run with no prior save returns 404', async () => {
  const res = await request(app)
    .get('/a12/vulnerable/run')
    .set('x-user-id', '1');
  expect(res.status).toBe(404);
  expect(res.body).toHaveProperty('error');
});

test('vulnerable: save with missing q returns 400', async () => {
  const res = await request(app)
    .post('/a12/vulnerable/save')
    .set('x-user-id', '1')
    .send({});
  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty('error');
});

// ── Fixed endpoint tests ─────────────────────────────────────

test('fixed: save with injection payload returns 200', async () => {
  const res = await request(app)
    .post('/a12/fixed/save')
    .set('x-user-id', '1')
    .send({ q: "' OR '1'='1" });
  expect(res.status).toBe(200);
  expect(res.body.saved).toBe(true);
});

test('fixed: run with injection payload returns empty results (injection neutralized)', async () => {
  await request(app)
    .post('/a12/fixed/save')
    .set('x-user-id', '1')
    .send({ q: "' OR '1'='1" });

  const res = await request(app)
    .get('/a12/fixed/run')
    .set('x-user-id', '1');
  expect(res.status).toBe(200);
  // Parameterized query treats the payload as literal text — no product name contains it
  expect(res.body.results).toEqual([]);
});
