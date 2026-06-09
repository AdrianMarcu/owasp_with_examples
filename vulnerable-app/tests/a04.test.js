const request = require('supertest');
const express = require('express');
const { makeTestDb } = require('./setup');
const makeRouter = require('../routes/a04-crypto');

function makeApp(db) {
  const app = express();
  app.use(express.json());
  app.use('/a04', makeRouter(db));
  return app;
}

let app, db;
beforeEach(() => { db = makeTestDb(); app = makeApp(db); });

test('vulnerable register: returns MD5 hash', async () => {
  const res = await request(app).post('/a04/vulnerable/register')
    .send({ username: 'testuser', password: 'hunter2' });
  expect(res.status).toBe(201);
  expect(res.body.algorithm).toBe('MD5');
  expect(res.body.stored_hash).toMatch(/^[a-f0-9]{32}$/);
});

test('vulnerable login: succeeds with correct password', async () => {
  await request(app).post('/a04/vulnerable/register')
    .send({ username: 'testuser', password: 'hunter2' });
  const res = await request(app).post('/a04/vulnerable/login')
    .send({ username: 'testuser', password: 'hunter2' });
  expect(res.status).toBe(200);
});

test('fixed register: does not return hash', async () => {
  const res = await request(app).post('/a04/fixed/register')
    .send({ username: 'secureuser', password: 'hunter2' });
  expect(res.status).toBe(201);
  expect(res.body).not.toHaveProperty('stored_hash');
  expect(res.body.algorithm).toContain('bcrypt');
}, 15000);
