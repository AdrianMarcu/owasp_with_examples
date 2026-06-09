const request = require('supertest');
const express = require('express');
const { makeTestDb } = require('./setup');
const makeRouter = require('../routes/a01-access-control');

function makeApp(db) {
  const app = express();
  app.use(express.json());
  app.use('/a01', makeRouter(db));
  return app;
}

let app, db;
beforeEach(() => { db = makeTestDb(); app = makeApp(db); });

test('vulnerable: user 1 can read invoice belonging to user 2', async () => {
  const res = await request(app)
    .get('/a01/vulnerable/invoice/2')
    .set('x-user-id', '1');
  expect(res.status).toBe(200);
  expect(res.body.user_id).toBe(2);
});

test('fixed: user 1 cannot read invoice belonging to user 2', async () => {
  const res = await request(app)
    .get('/a01/fixed/invoice/2')
    .set('x-user-id', '1');
  expect(res.status).toBe(403);
});

test('fixed: user 1 can read their own invoice', async () => {
  const res = await request(app)
    .get('/a01/fixed/invoice/1')
    .set('x-user-id', '1');
  expect(res.status).toBe(200);
  expect(res.body.user_id).toBe(1);
});
