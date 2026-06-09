const request = require('supertest');
const express = require('express');
const { makeTestDb } = require('./setup');
const makeRouter = require('../routes/a06-insecure-design');

function makeApp(db) {
  const app = express();
  app.use(express.json());
  app.use('/a06', makeRouter(db));
  return app;
}

let app, db;
beforeEach(() => { db = makeTestDb(); app = makeApp(db); });

test('vulnerable: same coupon can be applied multiple times', async () => {
  await request(app).post('/a06/vulnerable/apply-coupon').send({ orderId: 1, code: 'SAVE10' });
  const res = await request(app).post('/a06/vulnerable/apply-coupon').send({ orderId: 1, code: 'SAVE10' });
  expect(res.status).toBe(200);
  const order = db.prepare('SELECT discount FROM orders WHERE id=1').get();
  expect(order.discount).toBe(20);
});

test('fixed: coupon can only be applied once', async () => {
  await request(app).post('/a06/fixed/apply-coupon').send({ orderId: 1, code: 'SAVE10' });
  const res = await request(app).post('/a06/fixed/apply-coupon').send({ orderId: 1, code: 'SAVE10' });
  expect(res.status).toBe(400);
});
