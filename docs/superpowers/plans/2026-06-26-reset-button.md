# Reset Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `POST /reset` endpoint and a "🔄 Reset Demo" button on every demo page so teachers can restore seed state mid-class without restarting the server.

**Architecture:** A new `reset.js` route module resets all drifting DB tables, deletes `exfil.log`, and clears the A07 rate-limiter's in-memory store. `a07-auth-failures.js` exports a `resetLimiter` function; `server.js` wires it into the reset route. All 10 demo-page HTML strings get a purple reset button that calls `POST /reset`.

**Tech Stack:** Node.js, Express, better-sqlite3, express-rate-limit v7 (MemoryStore), Jest + Supertest.

## Global Constraints

- Node.js + Express — no new dependencies
- Jest + Supertest for all automated tests — match existing test file pattern
- In-memory DB via `makeTestDb()` from `tests/setup.js` — no real `data.db` touched in tests
- Button color `#6e40c9` (matches A03 "Show Exfiltration Log" button — already established purple utility style)
- All files live under `vulnerable-app/`

---

### Task 1: Backend reset — a07 export + reset route + server wiring

**Files:**
- Modify: `vulnerable-app/routes/a07-auth-failures.js`
- Create: `vulnerable-app/routes/reset.js`
- Modify: `vulnerable-app/server.js`
- Create: `vulnerable-app/tests/reset.test.js`

**Interfaces:**
- Produces: `require('./routes/reset')` → `function(db, resetLimiter) → Express Router`
- Produces: `require('./routes/a07-auth-failures').resetLimiter` → `() => void`

---

- [ ] **Step 1: Write the failing tests**

Create `vulnerable-app/tests/reset.test.js`:

```js
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
```

- [ ] **Step 2: Run tests — verify they all fail**

```bash
cd vulnerable-app && npx jest tests/reset.test.js --no-coverage 2>&1 | tail -20
```

Expected: all 13 tests FAIL (cannot find module `../routes/reset`).

- [ ] **Step 3: Export `resetLimiter` from a07-auth-failures.js**

Open `vulnerable-app/routes/a07-auth-failures.js`. Add one line after the closing `};` of the exported function (the very last line of the file):

Current last line:
```js
  return router;
};
```

Replace with:
```js
  return router;
};

module.exports.resetLimiter = () => loginLimiter.store.hits.clear();
```

- [ ] **Step 4: Create `vulnerable-app/routes/reset.js`**

```js
const express = require('express');
const fs = require('fs');
const path = require('path');

const EXFIL = path.join(__dirname, '../exfil.log');

module.exports = function (db, resetLimiter) {
  const router = express.Router();

  router.post('/', (req, res) => {
    db.prepare('UPDATE coupons SET times_used = 0').run();
    db.prepare('DELETE FROM coupon_usages').run();
    db.prepare('UPDATE orders SET discount = 0').run();
    db.prepare('UPDATE accounts SET balance = 1000.00 WHERE id = 1').run();
    db.prepare('UPDATE accounts SET balance = 500.00 WHERE id = 2').run();
    db.prepare('DELETE FROM audit_log').run();
    db.prepare('DELETE FROM users WHERE id > 3').run();

    try { fs.unlinkSync(EXFIL); } catch {}

    resetLimiter();

    res.json({ reset: true });
  });

  return router;
};
```

- [ ] **Step 5: Run the reset tests — verify they pass**

```bash
cd vulnerable-app && npx jest tests/reset.test.js --no-coverage 2>&1 | tail -20
```

Expected: 13 tests PASS.

- [ ] **Step 6: Wire into server.js**

Open `vulnerable-app/server.js`. Replace the a07 line and add the reset mount.

Current:
```js
app.use('/a07', require('./routes/a07-auth-failures')(db));
```

Replace with:
```js
const makeA07 = require('./routes/a07-auth-failures');
app.use('/a07', makeA07(db));
app.use('/reset', require('./routes/reset')(db, makeA07.resetLimiter));
```

- [ ] **Step 7: Run the full test suite — verify nothing broke**

```bash
cd vulnerable-app && npx jest --no-coverage 2>&1 | tail -20
```

Expected: all existing tests + 13 new tests PASS (42 total).

- [ ] **Step 8: Commit**

```bash
git add vulnerable-app/routes/reset.js \
        vulnerable-app/routes/a07-auth-failures.js \
        vulnerable-app/server.js \
        vulnerable-app/tests/reset.test.js
git commit -m "feat: add POST /reset endpoint to restore demo seed state"
```

---

### Task 2: Reset button on all 10 demo pages

**Files:**
- Modify: `vulnerable-app/routes/a01-access-control.js`
- Modify: `vulnerable-app/routes/a02-misconfiguration.js`
- Modify: `vulnerable-app/routes/a03-supply-chain.js`
- Modify: `vulnerable-app/routes/a04-crypto.js`
- Modify: `vulnerable-app/routes/a05-injection.js`
- Modify: `vulnerable-app/routes/a06-insecure-design.js`
- Modify: `vulnerable-app/routes/a07-auth-failures.js`
- Modify: `vulnerable-app/routes/a08-integrity.js`
- Modify: `vulnerable-app/routes/a09-logging.js`
- Modify: `vulnerable-app/routes/a10-error-handling.js`

**Interfaces:**
- Consumes: `POST /reset` from Task 1

The reset button and handler are **identical** on every page. In each route file, make two edits to the inline HTML string in the `GET /` handler:

**Edit A — add the button** after the last existing `<button>` in the button row:
```html
<button onclick="resetDemo()" style="background:#6e40c9">🔄 Reset Demo</button>
```

**Edit B — add the JS function** inside the existing `<script>` block, before `</script>`:
```js
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
}
```

Apply these two edits to each file as follows:

---

- [ ] **Step 1: Edit a01-access-control.js**

Find in the HTML string:
```
<button onclick="fetch_('/a01/fixed/invoice/'+document.getElementById('iid').value,'fixed')" style="background:#1f6feb">Fixed</button>
```
Replace with:
```
<button onclick="fetch_('/a01/fixed/invoice/'+document.getElementById('iid').value,'fixed')" style="background:#1f6feb">Fixed</button>
<button onclick="resetDemo()" style="background:#6e40c9">🔄 Reset Demo</button>
```

Find in the HTML string:
```
</script></body></html>
```
Replace with:
```
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
}
</script></body></html>
```

---

- [ ] **Step 2: Edit a02-misconfiguration.js**

Find:
```
<button onclick="hit('/a02/fixed/data','fixed')" style="background:#1f6feb">Fixed</button>
```
Replace with:
```
<button onclick="hit('/a02/fixed/data','fixed')" style="background:#1f6feb">Fixed</button>
<button onclick="resetDemo()" style="background:#6e40c9">🔄 Reset Demo</button>
```

Find:
```
</script></body></html>
```
Replace with:
```
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
}
</script></body></html>
```

---

- [ ] **Step 3: Edit a03-supply-chain.js**

Find:
```
<button onclick="showLog()" style="background:#6e40c9">Show Exfiltration Log</button>
```
Replace with:
```
<button onclick="showLog()" style="background:#6e40c9">Show Exfiltration Log</button>
<button onclick="resetDemo()" style="background:#6e40c9">🔄 Reset Demo</button>
```

Find:
```
</script></body></html>
```
Replace with:
```
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
}
</script></body></html>
```

---

- [ ] **Step 4: Edit a04-crypto.js**

Find:
```
<button onclick="reg('fixed')" style="background:#1f6feb">Register (Fixed bcrypt)</button>
```
Replace with:
```
<button onclick="reg('fixed')" style="background:#1f6feb">Register (Fixed bcrypt)</button>
<button onclick="resetDemo()" style="background:#6e40c9">🔄 Reset Demo</button>
```

Find:
```
</script></body></html>
```
Replace with:
```
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
}
</script></body></html>
```

---

- [ ] **Step 5: Edit a05-injection.js**

Find:
```
<button onclick="search('fixed')" style="background:#1f6feb">Search (Fixed)</button></p>
```
Replace with:
```
<button onclick="search('fixed')" style="background:#1f6feb">Search (Fixed)</button>
<button onclick="resetDemo()" style="background:#6e40c9">🔄 Reset Demo</button></p>
```

Find:
```
</script></body></html>
```
Replace with:
```
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
}
</script></body></html>
```

---

- [ ] **Step 6: Edit a06-insecure-design.js**

Find:
```
<button onclick="getOrder()">Check Order Total</button>
```
Replace with:
```
<button onclick="getOrder()">Check Order Total</button>
<button onclick="resetDemo()" style="background:#6e40c9">🔄 Reset Demo</button>
```

Find:
```
</script></body></html>
```
Replace with:
```
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
}
</script></body></html>
```

---

- [ ] **Step 7: Edit a07-auth-failures.js**

Find:
```
<button onclick="bruteForce('fixed')" style="background:#1f6feb">Brute Force (Fixed)</button>
```
Replace with:
```
<button onclick="bruteForce('fixed')" style="background:#1f6feb">Brute Force (Fixed)</button>
<button onclick="resetDemo()" style="background:#6e40c9">🔄 Reset Demo</button>
```

Find:
```
</script></body></html>
```
Replace with:
```
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
}
</script></body></html>
```

---

- [ ] **Step 8: Edit a08-integrity.js**

Find:
```
<button onclick="calc('fixed')" style="background:#1f6feb">Calculate (Fixed)</button>
```
Replace with:
```
<button onclick="calc('fixed')" style="background:#1f6feb">Calculate (Fixed)</button>
<button onclick="resetDemo()" style="background:#6e40c9">🔄 Reset Demo</button>
```

Find:
```
</script></body></html>
```
Replace with:
```
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
}
</script></body></html>
```

---

- [ ] **Step 9: Edit a09-logging.js**

Find:
```
<button onclick="showLog()">Show Audit Log</button>
```
Replace with:
```
<button onclick="showLog()">Show Audit Log</button>
<button onclick="resetDemo()" style="background:#6e40c9">🔄 Reset Demo</button>
```

Find:
```
</script></body></html>
```
Replace with:
```
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
}
</script></body></html>
```

---

- [ ] **Step 10: Edit a10-error-handling.js**

Find:
```
<button onclick="access('fixed')" style="background:#1f6feb">Access (Fixed)</button></p>
```
Replace with:
```
<button onclick="access('fixed')" style="background:#1f6feb">Access (Fixed)</button>
<button onclick="resetDemo()" style="background:#6e40c9">🔄 Reset Demo</button></p>
```

Find:
```
</script></body></html>
```
Replace with:
```
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
}
</script></body></html>
```

---

- [ ] **Step 11: Run the full test suite one final time**

```bash
cd vulnerable-app && npx jest --no-coverage 2>&1 | tail -20
```

Expected: all 42 tests PASS.

- [ ] **Step 12: Commit**

```bash
git add vulnerable-app/routes/
git commit -m "feat: add Reset Demo button to all 10 demo pages"
```
