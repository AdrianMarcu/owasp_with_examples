# Demo Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all 10 `/aXX` demo pages with structured explanation cards and a production-ready dark UI, eliminating duplicated inline CSS.

**Architecture:** A shared `demo.css` is served from a new `vulnerable-app/public/` directory. `server.js` gets two new middleware lines: one to serve that directory, one to proxy the presentation slide JSON from port 3000's static files. Each of the 10 route files gets its `GET /` handler replaced with structured HTML that links to `demo.css`, fetches its slide JSON for explanation cards, and uses a shared `showOutput()` helper for consistent response display.

**Tech Stack:** Node.js, Express, `express.static`, vanilla JS, CSS Grid.

## Global Constraints

- No new npm dependencies
- All files under `vulnerable-app/` (CSS goes in `vulnerable-app/public/demo.css`)
- Slide JSON fetched from `/slides/aXX.json` (same-origin, served via new static middleware)
- Badge colors must match dashboard: A01 `#f85149`, A02 `#d29922`, A03 `#8957e5`, A04 `#1f6feb`, A05 `#f85149`, A06 `#da3633`, A07 `#e36209`, A08 `#8957e5`, A09 `#388bfd`, A10 `#3fb950`
- Vulnerable button color: `#da3633` (red) — changed from green to signal danger
- Fixed button color: `#1f6feb` (blue)
- Reset button color: `#6e40c9` (purple)
- `showOutput(status, data)` signature — used in all 10 pages
- `resetDemo()` hides `#out` on reset (sets `display:none`), does NOT show text
- Existing 44 tests must continue to pass (endpoint logic is untouched)

---

### Task 1: Shared CSS + server.js static middleware

**Files:**
- Create: `vulnerable-app/public/demo.css`
- Modify: `vulnerable-app/server.js`
- Create: `vulnerable-app/tests/assets.test.js`

**Interfaces:**
- Produces: `GET /demo.css` → 200 `text/css`
- Produces: `GET /slides/a01.json` → 200 JSON with `explain.what`, `explain.example`, `explain.impact`

---

- [ ] **Step 1: Write the failing tests**

Create `vulnerable-app/tests/assets.test.js`:

```js
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd vulnerable-app && npx jest tests/assets.test.js --no-coverage 2>&1 | tail -10
```

Expected: 2 tests FAIL (404 — static middleware not yet added).

- [ ] **Step 3: Add static middleware to server.js**

Open `vulnerable-app/server.js`. After line 1 (`const express = require('express');`), add:

```js
const path = require('path');
```

Then insert these two lines **before** line 18 (`app.use('/a01', ...)`):

```js
app.use(express.static(path.join(__dirname, 'public')));
app.use('/slides', express.static(path.join(__dirname, '../presentation/public/slides')));
```

The top of the file now looks like:
```js
const express = require('express');
const path = require('path');
const { createDatabase } = require('./database');

const app = express();
const db = createDatabase();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/slides', express.static(path.join(__dirname, '../presentation/public/slides')));

app.use('/a01', require('./routes/a01-access-control')(db));
// ... rest unchanged
```

- [ ] **Step 4: Create `vulnerable-app/public/demo.css`**

Create the directory and file:

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0d1117;
  color: #e6edf3;
  min-height: 100vh;
}

.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 24px 48px;
}

/* ── Header ── */
.demo-header {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #161b22;
  border: 1px solid #30363d;
  border-left: 4px solid var(--color, #58a6ff);
  border-radius: 6px;
  padding: 16px 20px;
  margin-bottom: 24px;
}

.demo-badge {
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  border-radius: 4px;
  padding: 3px 8px;
  flex-shrink: 0;
  font-family: monospace;
  letter-spacing: 0.5px;
}

.demo-title {
  font-size: 18px;
  font-weight: 600;
  color: #f0f6fc;
}

/* ── Explanation cards ── */
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 16px;
}

.card-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #8b949e;
  margin-bottom: 10px;
}

.card p {
  font-size: 13px;
  color: #e6edf3;
  line-height: 1.7;
}

.card code {
  background: #21262d;
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 12px;
  color: #79c0ff;
  font-family: 'SFMono-Regular', Consolas, monospace;
}

/* ── Demo section ── */
.demo-section {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 20px;
}

.demo-section-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #8b949e;
  margin-bottom: 14px;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
}

.input {
  background: #21262d;
  color: #e6edf3;
  border: 1px solid #30363d;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 13px;
  font-family: inherit;
}

.btn {
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  color: #fff;
  font-weight: 500;
  font-family: inherit;
}

.btn:hover { opacity: 0.85; }

.btn-vuln  { background: #da3633; }
.btn-fixed { background: #1f6feb; }
.btn-reset { background: #6e40c9; }

/* ── Output panel ── */
.output { display: none; }

.output-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: 600;
}

.status-badge.ok  { background: #1b2f1f; color: #7ee787; }
.status-badge.err { background: #3d1f1f; color: #ffa198; }

.output pre {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  overflow-x: auto;
  color: #e6edf3;
  font-family: 'SFMono-Regular', Consolas, monospace;
  white-space: pre;
  max-height: 400px;
  overflow-y: auto;
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .cards { grid-template-columns: 1fr; }
  .controls { flex-direction: column; align-items: flex-start; }
}
```

- [ ] **Step 5: Run asset tests — verify they pass**

```bash
cd vulnerable-app && npx jest tests/assets.test.js --no-coverage 2>&1 | tail -10
```

Expected: 2 tests PASS.

- [ ] **Step 6: Run full suite — verify nothing broke**

```bash
cd vulnerable-app && npx jest --no-coverage 2>&1 | tail -10
```

Expected: 46 tests PASS (44 existing + 2 new).

- [ ] **Step 7: Commit**

```bash
git add vulnerable-app/public/demo.css vulnerable-app/server.js vulnerable-app/tests/assets.test.js
git commit -m "feat: add shared demo.css and serve /slides + /public from vulnerable-app"
```

---

### Task 2: Redesign demo pages a01–a05

**Files:**
- Modify: `vulnerable-app/routes/a01-access-control.js`
- Modify: `vulnerable-app/routes/a02-misconfiguration.js`
- Modify: `vulnerable-app/routes/a03-supply-chain.js`
- Modify: `vulnerable-app/routes/a04-crypto.js`
- Modify: `vulnerable-app/routes/a05-injection.js`

**Interfaces:**
- Consumes: `GET /demo.css` and `GET /slides/aXX.json` from Task 1
- Consumes: `showOutput(status, data)` — defined inline in each page's `<script>`
- Consumes: `resetDemo()` — defined inline in each page's `<script>`

In each file, replace **only** the `router.get('/', ...)` handler. The vulnerable/fixed route handlers below it are untouched.

---

- [ ] **Step 1: Replace the GET / handler in a01-access-control.js**

Replace the entire `router.get('/', (req, res) => { res.send(`...`); });` block with:

```js
router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A01 — Broken Access Control</title>
  <link rel="stylesheet" href="/demo.css">
</head>
<body>
<div class="page">
  <div class="demo-header" style="--color:#f85149">
    <span class="demo-badge" style="background:#f85149">A01</span>
    <span class="demo-title">Broken Access Control</span>
  </div>
  <div class="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>
  <div class="demo-section">
    <div class="demo-section-label">Live Demo — you are Alice (user 1), your invoice is #1</div>
    <div class="controls">
      <label style="color:#8b949e;font-size:13px">Invoice ID:</label>
      <input class="input" id="iid" value="1" style="width:60px">
      <button class="btn btn-vuln" onclick="fetchInvoice('vulnerable')">Vulnerable</button>
      <button class="btn btn-fixed" onclick="fetchInvoice('fixed')">Fixed</button>
      <button class="btn btn-reset" onclick="resetDemo()">🔄 Reset Demo</button>
    </div>
    <div class="output" id="out">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
fetch('/slides/a01.json').then(r=>r.json()).then(s=>{
  document.getElementById('card-what').innerHTML=s.explain.what;
  document.getElementById('card-example').innerHTML=s.explain.example;
  document.getElementById('card-impact').innerHTML=s.explain.impact;
});
function showOutput(status,data){
  const out=document.getElementById('out');
  const badge=document.getElementById('status-badge');
  const body=document.getElementById('output-body');
  const ok=status>=200&&status<300;
  badge.textContent=status+' '+(ok?'✓':'✗');
  badge.className='status-badge '+(ok?'ok':'err');
  body.textContent=JSON.stringify(data,null,2);
  out.style.display='block';
}
async function resetDemo(){
  await fetch('/reset',{method:'POST'});
  document.getElementById('out').style.display='none';
}
async function fetchInvoice(endpoint){
  const id=document.getElementById('iid').value;
  const r=await fetch('/a01/'+endpoint+'/invoice/'+id,{headers:{'x-user-id':'1'}});
  const j=await r.json();
  showOutput(r.status,j);
}
</script>
</body>
</html>`);
});
```

- [ ] **Step 2: Replace the GET / handler in a02-misconfiguration.js**

```js
router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A02 — Security Misconfiguration</title>
  <link rel="stylesheet" href="/demo.css">
</head>
<body>
<div class="page">
  <div class="demo-header" style="--color:#d29922">
    <span class="demo-badge" style="background:#d29922">A02</span>
    <span class="demo-title">Security Misconfiguration</span>
  </div>
  <div class="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>
  <div class="demo-section">
    <div class="demo-section-label">Live Demo — trigger an error and see what leaks</div>
    <div class="controls">
      <button class="btn btn-vuln" onclick="hit('vulnerable')">Vulnerable</button>
      <button class="btn btn-fixed" onclick="hit('fixed')">Fixed</button>
      <button class="btn btn-reset" onclick="resetDemo()">🔄 Reset Demo</button>
    </div>
    <div class="output" id="out">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
fetch('/slides/a02.json').then(r=>r.json()).then(s=>{
  document.getElementById('card-what').innerHTML=s.explain.what;
  document.getElementById('card-example').innerHTML=s.explain.example;
  document.getElementById('card-impact').innerHTML=s.explain.impact;
});
function showOutput(status,data){
  const out=document.getElementById('out');
  const badge=document.getElementById('status-badge');
  const body=document.getElementById('output-body');
  const ok=status>=200&&status<300;
  badge.textContent=status+' '+(ok?'✓':'✗');
  badge.className='status-badge '+(ok?'ok':'err');
  body.textContent=JSON.stringify(data,null,2);
  out.style.display='block';
}
async function resetDemo(){
  await fetch('/reset',{method:'POST'});
  document.getElementById('out').style.display='none';
}
async function hit(endpoint){
  const r=await fetch('/a02/'+endpoint+'/data');
  const j=await r.json();
  showOutput(r.status,j);
}
</script>
</body>
</html>`);
});
```

- [ ] **Step 3: Replace the GET / handler in a03-supply-chain.js**

```js
router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A03 — Supply Chain Failures</title>
  <link rel="stylesheet" href="/demo.css">
</head>
<body>
<div class="page">
  <div class="demo-header" style="--color:#8957e5">
    <span class="demo-badge" style="background:#8957e5">A03</span>
    <span class="demo-title">Supply Chain Failures</span>
  </div>
  <div class="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>
  <div class="demo-section">
    <div class="demo-section-label">Live Demo — the app uses evil-analytics, a package that phones home</div>
    <div class="controls">
      <button class="btn btn-vuln" onclick="purchase('vulnerable')">Track Purchase (Vulnerable)</button>
      <button class="btn btn-fixed" onclick="purchase('fixed')">Track Purchase (Fixed)</button>
      <button class="btn" style="background:#388bfd" onclick="showLog()">Show Exfil Log</button>
      <button class="btn btn-reset" onclick="resetDemo()">🔄 Reset Demo</button>
    </div>
    <div class="output" id="out">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
fetch('/slides/a03.json').then(r=>r.json()).then(s=>{
  document.getElementById('card-what').innerHTML=s.explain.what;
  document.getElementById('card-example').innerHTML=s.explain.example;
  document.getElementById('card-impact').innerHTML=s.explain.impact;
});
function showOutput(status,data){
  const out=document.getElementById('out');
  const badge=document.getElementById('status-badge');
  const body=document.getElementById('output-body');
  const ok=status>=200&&status<300;
  badge.textContent=status+' '+(ok?'✓':'✗');
  badge.className='status-badge '+(ok?'ok':'err');
  body.textContent=JSON.stringify(data,null,2);
  out.style.display='block';
}
async function resetDemo(){
  await fetch('/reset',{method:'POST'});
  document.getElementById('out').style.display='none';
}
async function purchase(endpoint){
  const r=await fetch('/a03/'+endpoint+'/purchase',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({userId:1,amount:99.99})
  });
  const j=await r.json();
  showOutput(r.status,j);
}
async function showLog(){
  const r=await fetch('/a03/exfil-log');
  const j=await r.json();
  showOutput(r.status,j);
}
</script>
</body>
</html>`);
});
```

- [ ] **Step 4: Replace the GET / handler in a04-crypto.js**

```js
router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A04 — Cryptographic Failures</title>
  <link rel="stylesheet" href="/demo.css">
</head>
<body>
<div class="page">
  <div class="demo-header" style="--color:#1f6feb">
    <span class="demo-badge" style="background:#1f6feb">A04</span>
    <span class="demo-title">Cryptographic Failures</span>
  </div>
  <div class="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>
  <div class="demo-section">
    <div class="demo-section-label">Live Demo — register and compare what the server stores</div>
    <div class="controls">
      <input class="input" id="u" value="testuser" placeholder="Username" style="width:120px">
      <input class="input" id="p" value="password123" type="password" placeholder="Password" style="width:120px">
      <button class="btn btn-vuln" onclick="register('vulnerable')">Register (Vulnerable MD5)</button>
      <button class="btn btn-fixed" onclick="register('fixed')">Register (Fixed bcrypt)</button>
      <button class="btn btn-reset" onclick="resetDemo()">🔄 Reset Demo</button>
    </div>
    <div class="output" id="out">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
fetch('/slides/a04.json').then(r=>r.json()).then(s=>{
  document.getElementById('card-what').innerHTML=s.explain.what;
  document.getElementById('card-example').innerHTML=s.explain.example;
  document.getElementById('card-impact').innerHTML=s.explain.impact;
});
function showOutput(status,data){
  const out=document.getElementById('out');
  const badge=document.getElementById('status-badge');
  const body=document.getElementById('output-body');
  const ok=status>=200&&status<300;
  badge.textContent=status+' '+(ok?'✓':'✗');
  badge.className='status-badge '+(ok?'ok':'err');
  body.textContent=JSON.stringify(data,null,2);
  out.style.display='block';
}
async function resetDemo(){
  await fetch('/reset',{method:'POST'});
  document.getElementById('out').style.display='none';
}
async function register(endpoint){
  const r=await fetch('/a04/'+endpoint+'/register',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username:document.getElementById('u').value+'_'+Date.now(),password:document.getElementById('p').value})
  });
  const j=await r.json();
  showOutput(r.status,j);
}
</script>
</body>
</html>`);
});
```

- [ ] **Step 5: Replace the GET / handler in a05-injection.js**

```js
router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A05 — Injection</title>
  <link rel="stylesheet" href="/demo.css">
</head>
<body>
<div class="page">
  <div class="demo-header" style="--color:#f85149">
    <span class="demo-badge" style="background:#f85149">A05</span>
    <span class="demo-title">Injection</span>
  </div>
  <div class="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>
  <div class="demo-section">
    <div class="demo-section-label">Live Demo — search the product catalogue</div>
    <div class="controls">
      <input class="input" id="q" value="' OR '1'='1" placeholder="Search" style="width:220px">
      <button class="btn btn-vuln" onclick="search('vulnerable')">Search (Vulnerable)</button>
      <button class="btn btn-fixed" onclick="search('fixed')">Search (Fixed)</button>
      <button class="btn btn-reset" onclick="resetDemo()">🔄 Reset Demo</button>
    </div>
    <div class="output" id="out">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
fetch('/slides/a05.json').then(r=>r.json()).then(s=>{
  document.getElementById('card-what').innerHTML=s.explain.what;
  document.getElementById('card-example').innerHTML=s.explain.example;
  document.getElementById('card-impact').innerHTML=s.explain.impact;
});
function showOutput(status,data){
  const out=document.getElementById('out');
  const badge=document.getElementById('status-badge');
  const body=document.getElementById('output-body');
  const ok=status>=200&&status<300;
  badge.textContent=status+' '+(ok?'✓':'✗');
  badge.className='status-badge '+(ok?'ok':'err');
  body.textContent=JSON.stringify(data,null,2);
  out.style.display='block';
}
async function resetDemo(){
  await fetch('/reset',{method:'POST'});
  document.getElementById('out').style.display='none';
}
async function search(endpoint){
  const q=encodeURIComponent(document.getElementById('q').value);
  const r=await fetch('/a05/'+endpoint+'/search?q='+q);
  const j=await r.json();
  showOutput(r.status,j);
}
</script>
</body>
</html>`);
});
```

- [ ] **Step 6: Run full test suite**

```bash
cd vulnerable-app && npx jest --no-coverage 2>&1 | tail -10
```

Expected: 46 tests PASS (endpoint logic untouched, HTML not tested by suite).

- [ ] **Step 7: Commit**

```bash
git add vulnerable-app/routes/a01-access-control.js \
        vulnerable-app/routes/a02-misconfiguration.js \
        vulnerable-app/routes/a03-supply-chain.js \
        vulnerable-app/routes/a04-crypto.js \
        vulnerable-app/routes/a05-injection.js
git commit -m "feat: redesign demo pages a01-a05 with explanation cards and production UI"
```

---

### Task 3: Redesign demo pages a06–a10

**Files:**
- Modify: `vulnerable-app/routes/a06-insecure-design.js`
- Modify: `vulnerable-app/routes/a07-auth-failures.js`
- Modify: `vulnerable-app/routes/a08-integrity.js`
- Modify: `vulnerable-app/routes/a09-logging.js`
- Modify: `vulnerable-app/routes/a10-error-handling.js`

**Interfaces:**
- Consumes: `GET /demo.css` and `GET /slides/aXX.json` from Task 1
- `showOutput(status, data)` and `resetDemo()` — same pattern as Task 2, defined inline in each page

In each file, replace **only** the `router.get('/', ...)` handler.

---

- [ ] **Step 1: Replace the GET / handler in a06-insecure-design.js**

```js
router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A06 — Insecure Design</title>
  <link rel="stylesheet" href="/demo.css">
</head>
<body>
<div class="page">
  <div class="demo-header" style="--color:#da3633">
    <span class="demo-badge" style="background:#da3633">A06</span>
    <span class="demo-title">Insecure Design</span>
  </div>
  <div class="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>
  <div class="demo-section">
    <div class="demo-section-label">Live Demo — Order #1 | Coupon: SAVE10 (10% off, max 1 use)</div>
    <div class="controls">
      <button class="btn btn-vuln" onclick="applyCoupon('vulnerable')">Apply SAVE10 (Vulnerable)</button>
      <button class="btn btn-fixed" onclick="applyCoupon('fixed')">Apply SAVE10 (Fixed)</button>
      <button class="btn" style="background:#388bfd" onclick="checkOrder()">Check Order Total</button>
      <button class="btn btn-reset" onclick="resetDemo()">🔄 Reset Demo</button>
    </div>
    <div class="output" id="out">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
fetch('/slides/a06.json').then(r=>r.json()).then(s=>{
  document.getElementById('card-what').innerHTML=s.explain.what;
  document.getElementById('card-example').innerHTML=s.explain.example;
  document.getElementById('card-impact').innerHTML=s.explain.impact;
});
function showOutput(status,data){
  const out=document.getElementById('out');
  const badge=document.getElementById('status-badge');
  const body=document.getElementById('output-body');
  const ok=status>=200&&status<300;
  badge.textContent=status+' '+(ok?'✓':'✗');
  badge.className='status-badge '+(ok?'ok':'err');
  body.textContent=JSON.stringify(data,null,2);
  out.style.display='block';
}
async function resetDemo(){
  await fetch('/reset',{method:'POST'});
  document.getElementById('out').style.display='none';
}
async function applyCoupon(endpoint){
  const r=await fetch('/a06/'+endpoint+'/apply-coupon',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({orderId:1,code:'SAVE10'})
  });
  const j=await r.json();
  showOutput(r.status,j);
}
async function checkOrder(){
  const r=await fetch('/a06/order/1');
  const j=await r.json();
  showOutput(r.status,j);
}
</script>
</body>
</html>`);
});
```

- [ ] **Step 2: Replace the GET / handler in a07-auth-failures.js**

Note: this file also contains `rateLimitStore`, `loginLimiter`, and `module.exports.resetLimiter` — do NOT touch those. Replace only the `router.get('/', ...)` block.

```js
router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A07 — Authentication Failures</title>
  <link rel="stylesheet" href="/demo.css">
</head>
<body>
<div class="page">
  <div class="demo-header" style="--color:#e36209">
    <span class="demo-badge" style="background:#e36209">A07</span>
    <span class="demo-title">Authentication Failures</span>
  </div>
  <div class="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>
  <div class="demo-section">
    <div class="demo-section-label">Live Demo — brute-force alice with 10 rapid attempts</div>
    <div class="controls">
      <button class="btn btn-vuln" onclick="bruteForce('vulnerable')">Brute Force (Vulnerable)</button>
      <button class="btn btn-fixed" onclick="bruteForce('fixed')">Brute Force (Fixed)</button>
      <button class="btn btn-reset" onclick="resetDemo()">🔄 Reset Demo</button>
    </div>
    <div class="output" id="out">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
fetch('/slides/a07.json').then(r=>r.json()).then(s=>{
  document.getElementById('card-what').innerHTML=s.explain.what;
  document.getElementById('card-example').innerHTML=s.explain.example;
  document.getElementById('card-impact').innerHTML=s.explain.impact;
});
function showOutput(status,data){
  const out=document.getElementById('out');
  const badge=document.getElementById('status-badge');
  const body=document.getElementById('output-body');
  const ok=status>=200&&status<300;
  badge.textContent=status+' '+(ok?'✓':'✗');
  badge.className='status-badge '+(ok?'ok':'err');
  body.textContent=JSON.stringify(data,null,2);
  out.style.display='block';
}
async function resetDemo(){
  await fetch('/reset',{method:'POST'});
  document.getElementById('out').style.display='none';
}
async function bruteForce(endpoint){
  const passwords=['wrong1','wrong2','wrong3','wrong4','wrong5','wrong6','wrong7','wrong8','wrong9','password123'];
  const results=[];
  for(const p of passwords){
    const r=await fetch('/a07/'+endpoint+'/login',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username:'alice',password:p})
    });
    results.push({password:p,status:r.status,body:await r.json()});
  }
  showOutput(results[results.length-1].status,results);
}
</script>
</body>
</html>`);
});
```

- [ ] **Step 3: Replace the GET / handler in a08-integrity.js**

```js
router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A08 — Integrity Failures</title>
  <link rel="stylesheet" href="/demo.css">
</head>
<body>
<div class="page">
  <div class="demo-header" style="--color:#8957e5">
    <span class="demo-badge" style="background:#8957e5">A08</span>
    <span class="demo-title">Integrity Failures</span>
  </div>
  <div class="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>
  <div class="demo-section">
    <div class="demo-section-label">Live Demo — send a formula and see if it gets eval()'d</div>
    <div class="controls">
      <input class="input" id="f" value="require('fs').readdirSync('.').join(', ')" style="width:300px" placeholder="Formula">
      <button class="btn btn-vuln" onclick="calculate('vulnerable')">Calculate (Vulnerable)</button>
      <button class="btn btn-fixed" onclick="calculate('fixed')">Calculate (Fixed)</button>
      <button class="btn btn-reset" onclick="resetDemo()">🔄 Reset Demo</button>
    </div>
    <p style="color:#8b949e;font-size:12px;margin-top:8px">Try also: <code style="background:#21262d;padding:1px 5px;border-radius:3px;color:#79c0ff">2+2</code> · <code style="background:#21262d;padding:1px 5px;border-radius:3px;color:#79c0ff">process.env.NODE_ENV</code> · <code style="background:#21262d;padding:1px 5px;border-radius:3px;color:#79c0ff">Date.now()</code></p>
    <div class="output" id="out" style="margin-top:12px">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
fetch('/slides/a08.json').then(r=>r.json()).then(s=>{
  document.getElementById('card-what').innerHTML=s.explain.what;
  document.getElementById('card-example').innerHTML=s.explain.example;
  document.getElementById('card-impact').innerHTML=s.explain.impact;
});
function showOutput(status,data){
  const out=document.getElementById('out');
  const badge=document.getElementById('status-badge');
  const body=document.getElementById('output-body');
  const ok=status>=200&&status<300;
  badge.textContent=status+' '+(ok?'✓':'✗');
  badge.className='status-badge '+(ok?'ok':'err');
  body.textContent=JSON.stringify(data,null,2);
  out.style.display='block';
}
async function resetDemo(){
  await fetch('/reset',{method:'POST'});
  document.getElementById('out').style.display='none';
}
async function calculate(endpoint){
  const r=await fetch('/a08/'+endpoint+'/calculate',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({formula:document.getElementById('f').value})
  });
  const j=await r.json();
  showOutput(r.status,j);
}
</script>
</body>
</html>`);
});
```

- [ ] **Step 4: Replace the GET / handler in a09-logging.js**

```js
router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A09 — Security Logging Failures</title>
  <link rel="stylesheet" href="/demo.css">
</head>
<body>
<div class="page">
  <div class="demo-header" style="--color:#388bfd">
    <span class="demo-badge" style="background:#388bfd">A09</span>
    <span class="demo-title">Security Logging Failures</span>
  </div>
  <div class="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>
  <div class="demo-section">
    <div class="demo-section-label">Live Demo — transfer $100 from account 1 to account 2</div>
    <div class="controls">
      <button class="btn btn-vuln" onclick="transfer('vulnerable')">Transfer (Vulnerable)</button>
      <button class="btn btn-fixed" onclick="transfer('fixed')">Transfer (Fixed)</button>
      <button class="btn" style="background:#388bfd" onclick="showLog()">Show Audit Log</button>
      <button class="btn btn-reset" onclick="resetDemo()">🔄 Reset Demo</button>
    </div>
    <div class="output" id="out">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
fetch('/slides/a09.json').then(r=>r.json()).then(s=>{
  document.getElementById('card-what').innerHTML=s.explain.what;
  document.getElementById('card-example').innerHTML=s.explain.example;
  document.getElementById('card-impact').innerHTML=s.explain.impact;
});
function showOutput(status,data){
  const out=document.getElementById('out');
  const badge=document.getElementById('status-badge');
  const body=document.getElementById('output-body');
  const ok=status>=200&&status<300;
  badge.textContent=status+' '+(ok?'✓':'✗');
  badge.className='status-badge '+(ok?'ok':'err');
  body.textContent=JSON.stringify(data,null,2);
  out.style.display='block';
}
async function resetDemo(){
  await fetch('/reset',{method:'POST'});
  document.getElementById('out').style.display='none';
}
async function transfer(endpoint){
  const r=await fetch('/a09/'+endpoint+'/transfer',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({fromId:1,toId:2,amount:100})
  });
  const j=await r.json();
  showOutput(r.status,j);
}
async function showLog(){
  const r=await fetch('/a09/audit-log');
  const j=await r.json();
  showOutput(r.status,j);
}
</script>
</body>
</html>`);
});
```

- [ ] **Step 5: Replace the GET / handler in a10-error-handling.js**

```js
router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A10 — Mishandling of Exceptional Conditions</title>
  <link rel="stylesheet" href="/demo.css">
</head>
<body>
<div class="page">
  <div class="demo-header" style="--color:#3fb950">
    <span class="demo-badge" style="background:#3fb950">A10</span>
    <span class="demo-title">Mishandling of Exceptional Conditions</span>
  </div>
  <div class="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>
  <div class="demo-section">
    <div class="demo-section-label">Live Demo — submit a short token and see if you get in</div>
    <div class="controls">
      <input class="input" id="t" value="bad" placeholder="Token" style="width:160px">
      <button class="btn btn-vuln" onclick="access('vulnerable')">Access (Vulnerable)</button>
      <button class="btn btn-fixed" onclick="access('fixed')">Access (Fixed)</button>
      <button class="btn btn-reset" onclick="resetDemo()">🔄 Reset Demo</button>
    </div>
    <p style="color:#8b949e;font-size:12px;margin-top:8px">Short token (e.g. "bad") triggers the error path. Long token (20+ chars) is valid.</p>
    <div class="output" id="out" style="margin-top:12px">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
fetch('/slides/a10.json').then(r=>r.json()).then(s=>{
  document.getElementById('card-what').innerHTML=s.explain.what;
  document.getElementById('card-example').innerHTML=s.explain.example;
  document.getElementById('card-impact').innerHTML=s.explain.impact;
});
function showOutput(status,data){
  const out=document.getElementById('out');
  const badge=document.getElementById('status-badge');
  const body=document.getElementById('output-body');
  const ok=status>=200&&status<300;
  badge.textContent=status+' '+(ok?'✓':'✗');
  badge.className='status-badge '+(ok?'ok':'err');
  body.textContent=JSON.stringify(data,null,2);
  out.style.display='block';
}
async function resetDemo(){
  await fetch('/reset',{method:'POST'});
  document.getElementById('out').style.display='none';
}
async function access(endpoint){
  const r=await fetch('/a10/'+endpoint+'/access',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({token:document.getElementById('t').value})
  });
  const j=await r.json();
  showOutput(r.status,j);
}
</script>
</body>
</html>`);
});
```

- [ ] **Step 6: Run full test suite**

```bash
cd vulnerable-app && npx jest --no-coverage 2>&1 | tail -10
```

Expected: 46 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add vulnerable-app/routes/a06-insecure-design.js \
        vulnerable-app/routes/a07-auth-failures.js \
        vulnerable-app/routes/a08-integrity.js \
        vulnerable-app/routes/a09-logging.js \
        vulnerable-app/routes/a10-error-handling.js
git commit -m "feat: redesign demo pages a06-a10 with explanation cards and production UI"
```
