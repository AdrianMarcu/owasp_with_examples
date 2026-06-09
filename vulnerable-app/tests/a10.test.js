const request = require('supertest');
const express = require('express');
const makeRouter = require('../routes/a10-error-handling');

const app = express();
app.use(express.json());
app.use('/a10', makeRouter());

test('vulnerable: short (invalid) token grants access anyway', async () => {
  const res = await request(app).post('/a10/vulnerable/access')
    .send({ token: 'short' });
  expect(res.status).toBe(200);
  expect(res.body.access).toBe('granted');
});

test('fixed: short token is denied with 503', async () => {
  const res = await request(app).post('/a10/fixed/access')
    .send({ token: 'short' });
  expect(res.status).toBe(503);
  expect(res.body).not.toHaveProperty('access');
});

test('fixed: missing token is denied', async () => {
  const res = await request(app).post('/a10/fixed/access').send({});
  expect(res.status).toBe(503);
});
