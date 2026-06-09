const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const makeRouter = require('../routes/a03-supply-chain');

const EXFIL = path.join(__dirname, '../exfil.log');

const app = express();
app.use(express.json());
app.use('/a03', makeRouter());

beforeEach(() => { if (fs.existsSync(EXFIL)) fs.unlinkSync(EXFIL); });

test('vulnerable: purchase writes to exfil log', async () => {
  await request(app).post('/a03/vulnerable/purchase').send({ userId: 1, amount: 99 });
  expect(fs.existsSync(EXFIL)).toBe(true);
  const log = fs.readFileSync(EXFIL, 'utf8');
  expect(log).toContain('purchase');
});

test('fixed: purchase does not write to exfil log', async () => {
  await request(app).post('/a03/fixed/purchase').send({ userId: 1, amount: 99 });
  expect(fs.existsSync(EXFIL)).toBe(false);
});

test('exfil-log endpoint returns log contents', async () => {
  fs.writeFileSync(EXFIL, JSON.stringify({ event: 'test' }) + '\n');
  const res = await request(app).get('/a03/exfil-log');
  expect(res.body.entries.length).toBeGreaterThan(0);
});
