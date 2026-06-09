const request = require('supertest');
const express = require('express');
const makeRouter = require('../routes/a02-misconfiguration');

const app = express();
app.use('/a02', makeRouter());

test('vulnerable: error response contains stack and env', async () => {
  const res = await request(app).get('/a02/vulnerable/data');
  expect(res.status).toBe(500);
  expect(res.body).toHaveProperty('stack');
  expect(res.body).toHaveProperty('env');
});

test('fixed: error response has only generic message', async () => {
  const res = await request(app).get('/a02/fixed/data');
  expect(res.status).toBe(500);
  expect(res.body).not.toHaveProperty('stack');
  expect(res.body).not.toHaveProperty('env');
  expect(res.body.error).toBe('Something went wrong. Please try again.');
});
