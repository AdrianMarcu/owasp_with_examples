const request = require('supertest');
const express = require('express');
const { makeTestDb } = require('./setup');
const makeRouter = require('../routes/a05-injection');

function makeApp(db) {
  const app = express();
  app.use('/a05', makeRouter(db));
  return app;
}

let app, db;
beforeEach(() => { db = makeTestDb(); app = makeApp(db); });

test('vulnerable: SQL injection dumps all rows', async () => {
  const res = await request(app).get("/a05/vulnerable/search?q=' OR '1'='1");
  expect(res.status).toBe(200);
  expect(res.body.results.length).toBeGreaterThan(1);
  expect(res.body.results[0]).toHaveProperty('internal_code');
});

test('fixed: injection payload returns no results', async () => {
  const res = await request(app).get("/a05/fixed/search?q=' OR '1'='1");
  expect(res.status).toBe(200);
  expect(res.body.results.length).toBe(0);
});

test('fixed: normal search works', async () => {
  const res = await request(app).get('/a05/fixed/search?q=Laptop');
  expect(res.body.results.length).toBe(1);
  expect(res.body.results[0].name).toBe('Laptop');
  expect(res.body.results[0]).not.toHaveProperty('internal_code');
});
