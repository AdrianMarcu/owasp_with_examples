const request = require('supertest');
const app = require('../server');

test('GET /demo.css returns a stylesheet', async () => {
  const res = await request(app).get('/demo.css');
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch(/css/);
});

test('GET /slides/a01.json returns slide JSON with explain fields', async () => {
  const res = await request(app).get('/slides/a01.json');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('explain');
  expect(res.body.explain).toHaveProperty('what');
  expect(res.body.explain).toHaveProperty('example');
  expect(res.body.explain).toHaveProperty('impact');
});
