const request = require('supertest');
const express = require('express');
const makeRouter = require('../routes/a08-integrity');

const app = express();
app.use(express.json());
app.use('/a08', makeRouter());

test('vulnerable: eval executes arithmetic', async () => {
  const res = await request(app).post('/a08/vulnerable/calculate')
    .send({ formula: '2 + 2' });
  expect(res.body.result).toBe('4');
});

test('vulnerable: eval executes non-math expression', async () => {
  const res = await request(app).post('/a08/vulnerable/calculate')
    .send({ formula: "'hello ' + 'world'" });
  expect(res.status).toBe(200);
  expect(res.body.result).toBe('hello world');
});

test('fixed: rejects non-math formula', async () => {
  const res = await request(app).post('/a08/fixed/calculate')
    .send({ formula: "'hello ' + 'world'" });
  expect(res.status).toBe(400);
});

test('fixed: accepts valid math', async () => {
  const res = await request(app).post('/a08/fixed/calculate')
    .send({ formula: '(10 + 5) * 2' });
  expect(res.status).toBe(200);
  expect(res.body.result).toBe(30);
});
