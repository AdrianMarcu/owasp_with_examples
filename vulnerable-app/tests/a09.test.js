const request = require('supertest');
const express = require('express');
const { makeTestDb } = require('./setup');
const makeRouter = require('../routes/a09-logging');

function makeApp(db) {
  const app = express();
  app.use(express.json());
  app.use('/a09', makeRouter(db));
  return app;
}

let app, db;
beforeEach(() => { db = makeTestDb(); app = makeApp(db); });

test('vulnerable: transfer leaves no audit log', async () => {
  await request(app).post('/a09/vulnerable/transfer')
    .send({ fromId: 1, toId: 2, amount: 100 });
  const logs = db.prepare('SELECT * FROM audit_log').all();
  expect(logs.length).toBe(0);
});

test('fixed: successful transfer writes to audit log', async () => {
  await request(app).post('/a09/fixed/transfer')
    .send({ fromId: 1, toId: 2, amount: 100 });
  const logs = db.prepare('SELECT * FROM audit_log').all();
  expect(logs.length).toBe(1);
  expect(logs[0].action).toBe('TRANSFER_OK');
});

test('fixed: failed transfer also writes to audit log', async () => {
  await request(app).post('/a09/fixed/transfer')
    .send({ fromId: 1, toId: 2, amount: 9999 });
  const logs = db.prepare('SELECT * FROM audit_log').all();
  expect(logs.length).toBe(1);
  expect(logs[0].action).toBe('TRANSFER_FAILED');
});
