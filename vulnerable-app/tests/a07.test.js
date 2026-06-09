const request = require('supertest');
const express = require('express');
const { makeTestDb } = require('./setup');
const makeRouter = require('../routes/a07-auth-failures');

function makeApp(db) {
  const app = express();
  app.use(express.json());
  app.set('trust proxy', 1);
  app.use('/a07', makeRouter(db));
  return app;
}

let app, db;
beforeEach(() => { db = makeTestDb(); app = makeApp(db); });

test('vulnerable: valid login succeeds', async () => {
  const res = await request(app).post('/a07/vulnerable/login')
    .send({ username: 'alice', password: 'password123' });
  expect(res.status).toBe(200);
});

test('vulnerable: invalid login returns 401', async () => {
  const res = await request(app).post('/a07/vulnerable/login')
    .send({ username: 'alice', password: 'wrong' });
  expect(res.status).toBe(401);
});

test('vulnerable: allows 10 rapid attempts without lockout', async () => {
  const attempts = Array.from({ length: 10 }, () =>
    request(app).post('/a07/vulnerable/login').send({ username: 'alice', password: 'wrong' })
  );
  const results = await Promise.all(attempts);
  const blocked = results.filter(r => r.status === 429);
  expect(blocked.length).toBe(0);
});
