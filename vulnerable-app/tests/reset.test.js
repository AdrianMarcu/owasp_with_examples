const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { makeTestDb } = require('./setup');
const makeResetRouter = require('../routes/reset');

const EXFIL = path.join(__dirname, '../exfil.log');

function makeApp(db, resetLimiter = () => {}) {
  const app = express();
  app.use(express.json());
  app.use('/reset', makeResetRouter(db, resetLimiter));
  return app;
}

let app, db;
beforeEach(() => {
  db = makeTestDb();
  app = makeApp(db);
  if (fs.existsSync(EXFIL)) fs.unlinkSync(EXFIL);
});
afterEach(() => {
  if (fs.existsSync(EXFIL)) fs.unlinkSync(EXFIL);
});

test('POST /reset returns { reset: true }', async () => {
  const res = await request(app).post('/reset');
  expect(res.status).toBe(200);
  expect(res.body.reset).toBe(true);
});

test('POST /reset restores account 1 balance to 1000', async () => {
  db.prepare('UPDATE accounts SET balance = 0 WHERE id = 1').run();
  await request(app).post('/reset');
  const acc = db.prepare('SELECT balance FROM accounts WHERE id = 1').get();
  expect(acc.balance).toBe(1000.0);
});

test('POST /reset restores account 2 balance to 500', async () => {
  db.prepare('UPDATE accounts SET balance = 0 WHERE id = 2').run();
  await request(app).post('/reset');
  const acc = db.prepare('SELECT balance FROM accounts WHERE id = 2').get();
  expect(acc.balance).toBe(500.0);
});

test('POST /reset resets coupon times_used to 0', async () => {
  db.prepare("UPDATE coupons SET times_used = 5 WHERE code = 'SAVE10'").run();
  await request(app).post('/reset');
  const c = db.prepare("SELECT times_used FROM coupons WHERE code = 'SAVE10'").get();
  expect(c.times_used).toBe(0);
});

test('POST /reset deletes all coupon_usages', async () => {
  db.prepare('INSERT INTO coupon_usages VALUES (1, 1)').run();
  await request(app).post('/reset');
  const rows = db.prepare('SELECT * FROM coupon_usages').all();
  expect(rows.length).toBe(0);
});

test('POST /reset resets all order discounts to 0', async () => {
  db.prepare('UPDATE orders SET discount = 50 WHERE id = 1').run();
  await request(app).post('/reset');
  const order = db.prepare('SELECT discount FROM orders WHERE id = 1').get();
  expect(order.discount).toBe(0);
});

test('POST /reset clears audit_log', async () => {
  db.prepare(
    "INSERT INTO audit_log (timestamp, action, user_id, details) VALUES ('2026-01-01','TEST',1,'x')"
  ).run();
  await request(app).post('/reset');
  const logs = db.prepare('SELECT * FROM audit_log').all();
  expect(logs.length).toBe(0);
});

test('POST /reset removes users with id > 3', async () => {
  db.prepare('INSERT INTO users (id, username, password_md5) VALUES (99, ?, ?)').run('testuser_99', 'abc');
  await request(app).post('/reset');
  const user = db.prepare('SELECT * FROM users WHERE id = 99').get();
  expect(user).toBeUndefined();
});

test('POST /reset preserves seed users (id <= 3)', async () => {
  await request(app).post('/reset');
  const users = db.prepare('SELECT * FROM users WHERE id <= 3').all();
  expect(users.length).toBe(3);
});

test('POST /reset deletes exfil.log when it exists', async () => {
  fs.writeFileSync(EXFIL, '{"event":"test"}\n');
  await request(app).post('/reset');
  expect(fs.existsSync(EXFIL)).toBe(false);
});

test('POST /reset succeeds when exfil.log does not exist', async () => {
  const res = await request(app).post('/reset');
  expect(res.status).toBe(200);
});

test('POST /reset calls resetLimiter', async () => {
  let called = false;
  const app2 = makeApp(makeTestDb(), () => { called = true; });
  await request(app2).post('/reset');
  expect(called).toBe(true);
});

test('a07 module exports resetLimiter as a function', () => {
  const mod = require('../routes/a07-auth-failures');
  expect(typeof mod.resetLimiter).toBe('function');
});

test('a07 resetLimiter does not throw when called', () => {
  const mod = require('../routes/a07-auth-failures');
  expect(() => mod.resetLimiter()).not.toThrow();
});

test('POST /reset resets order 2 discount to 0', async () => {
  db.prepare('UPDATE orders SET discount = 50 WHERE id = 2').run();
  await request(app).post('/reset');
  const order = db.prepare('SELECT discount FROM orders WHERE id = 2').get();
  expect(order.discount).toBe(0);
});
