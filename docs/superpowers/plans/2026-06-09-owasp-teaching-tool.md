# OWASP 2026 Teaching Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js classroom teaching tool with a dark dashboard UI (port 3000) and a live exploitable app (port 4000) covering all 10 OWASP 2026 vulnerabilities.

**Architecture:** Two independent Express servers started via `concurrently` from the root. The presentation server serves a static sidebar+tab dashboard. The vulnerable-app server hosts 10 route groups each with `/vulnerable/`, `/fixed/`, and a demo landing page. SQLite (better-sqlite3) backs the demos that need persistence.

**Tech Stack:** Node.js, Express, better-sqlite3, bcrypt, express-rate-limit, concurrently, Jest, Supertest, Prism.js (CDN)

---

## File Map

```
owasp_with_examples/
├── package.json                          CREATE – workspaces + concurrently start script
├── .gitignore                            CREATE
├── presentation/
│   ├── package.json                      CREATE – express only
│   ├── server.js                         CREATE – express.static on port 3000
│   └── public/
│       ├── index.html                    CREATE – sidebar + tab shell
│       ├── style.css                     CREATE – dark GitHub theme
│       ├── app.js                        CREATE – sidebar nav, tab switching, slide rendering
│       └── slides/
│           ├── a01.json … a10.json       CREATE – slide content for each vulnerability
└── vulnerable-app/
    ├── package.json                      CREATE – express, better-sqlite3, bcrypt, rate-limit, jest, supertest
    ├── server.js                         CREATE – mounts all 10 route groups
    ├── database.js                       CREATE – SQLite schema + seed
    ├── packages/
    │   └── evil-analytics/
    │       ├── package.json              CREATE – local malicious package for A03 demo
    │       └── index.js                  CREATE
    ├── routes/
    │   ├── a01-access-control.js         CREATE
    │   ├── a02-misconfiguration.js       CREATE
    │   ├── a03-supply-chain.js           CREATE
    │   ├── a04-crypto.js                 CREATE
    │   ├── a05-injection.js              CREATE
    │   ├── a06-insecure-design.js        CREATE
    │   ├── a07-auth-failures.js          CREATE
    │   ├── a08-integrity.js              CREATE
    │   ├── a09-logging.js                CREATE
    │   └── a10-error-handling.js         CREATE
    └── tests/
        ├── setup.js                      CREATE – in-memory DB helper
        ├── a01.test.js … a10.test.js     CREATE
```

---

## Task 1: Root scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "owasp-teaching-tool",
  "private": true,
  "workspaces": [
    "presentation",
    "vulnerable-app"
  ],
  "scripts": {
    "start": "concurrently \"npm run start --workspace=presentation\" \"npm run start --workspace=vulnerable-app\"",
    "test": "npm run test --workspace=vulnerable-app"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
vulnerable-app/data.db
vulnerable-app/exfil.log
.superpowers/
```

- [ ] **Step 3: Install root deps**

```bash
npm install
```

Expected: `node_modules/` created, `concurrently` installed.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "feat: root workspace scaffolding"
```

---

## Task 2: Presentation server

**Files:**
- Create: `presentation/package.json`
- Create: `presentation/server.js`

- [ ] **Step 1: Create presentation/package.json**

```json
{
  "name": "presentation",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

- [ ] **Step 2: Create presentation/server.js**

```js
const express = require('express');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.listen(3000, () => {
  console.log('Presentation → http://localhost:3000');
});
```

- [ ] **Step 3: Install**

```bash
npm install --workspace=presentation
```

- [ ] **Step 4: Commit**

```bash
git add presentation/
git commit -m "feat: presentation static server on port 3000"
```

---

## Task 3: Dashboard HTML + CSS

**Files:**
- Create: `presentation/public/index.html`
- Create: `presentation/public/style.css`

- [ ] **Step 1: Create presentation/public/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OWASP Top 10 — 2026</title>
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
</head>
<body>
  <div id="app">
    <aside id="sidebar">
      <div id="sidebar-header">
        <div class="sidebar-title">OWASP Top 10</div>
        <div class="sidebar-sub">2026 Edition</div>
      </div>
      <ul id="vuln-list"></ul>
    </aside>
    <main id="main">
      <div id="tab-bar">
        <button class="tab-btn active" data-tab="explain">📖 Explain</button>
        <button class="tab-btn" data-tab="vulnerable">❌ Vulnerable</button>
        <button class="tab-btn" data-tab="fixed">✅ Fixed</button>
        <button class="tab-btn" data-tab="demo">▶ Live Demo</button>
      </div>
      <div id="tab-content">
        <div id="tab-explain" class="tab-panel active"></div>
        <div id="tab-vulnerable" class="tab-panel"></div>
        <div id="tab-fixed" class="tab-panel"></div>
        <div id="tab-demo" class="tab-panel"></div>
      </div>
    </main>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create presentation/public/style.css**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0d1117;
  color: #e6edf3;
  height: 100vh;
  overflow: hidden;
}

#app {
  display: flex;
  height: 100vh;
}

/* Sidebar */
#sidebar {
  width: 230px;
  flex-shrink: 0;
  background: #161b22;
  border-right: 1px solid #30363d;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

#sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #30363d;
}

.sidebar-title { font-size: 13px; font-weight: 600; color: #f0f6fc; }
.sidebar-sub   { font-size: 11px; color: #58a6ff; margin-top: 2px; }

#vuln-list { list-style: none; }

#vuln-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background 0.1s;
}

#vuln-list li:hover    { background: #1c2128; }
#vuln-list li.active   { background: #21262d; }

.badge {
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  border-radius: 3px;
  padding: 2px 5px;
  flex-shrink: 0;
}

.vuln-name {
  font-size: 11px;
  color: #8b949e;
  line-height: 1.3;
}

#vuln-list li.active .vuln-name { color: #f0f6fc; }

/* Main panel */
#main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#tab-bar {
  display: flex;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  flex-shrink: 0;
}

.tab-btn {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #8b949e;
  padding: 12px 18px;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.15s;
}

.tab-btn:hover  { color: #e6edf3; }
.tab-btn.active { color: #f0f6fc; border-bottom-color: #f78166; }

#tab-content { flex: 1; overflow-y: auto; }

.tab-panel { display: none; padding: 24px; }
.tab-panel.active { display: block; }

/* Explain tab */
.explain-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.explain-title { font-size: 20px; font-weight: 600; color: #f0f6fc; }

.explain-card {
  background: #161b22;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 14px;
  border-left: 3px solid #30363d;
}

.explain-card-label {
  font-size: 10px;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 8px;
}

.explain-card p { font-size: 13px; color: #e6edf3; line-height: 1.7; }
.explain-card code {
  background: #21262d;
  border-radius: 3px;
  padding: 1px 5px;
  font-family: monospace;
  font-size: 12px;
  color: #79c0ff;
}

/* Code tabs */
.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.code-annotation {
  font-size: 12px;
  line-height: 1.6;
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 6px;
}

.code-annotation.vuln  { background: #3d1f1f; color: #ffa198; border-left: 3px solid #f85149; }
.code-annotation.fixed { background: #1b2f1f; color: #7ee787; border-left: 3px solid #3fb950; }

.code-filename {
  font-size: 11px;
  color: #8b949e;
  font-family: monospace;
  background: #21262d;
  padding: 4px 10px;
  border-radius: 4px 4px 0 0;
  border: 1px solid #30363d;
  border-bottom: none;
}

pre[class*="language-"] {
  margin: 0 !important;
  border-radius: 0 6px 6px 6px !important;
  border: 1px solid #30363d;
  font-size: 12px !important;
}

/* Demo tab */
.demo-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 16px;
  text-align: center;
}

.demo-url {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 12px 24px;
  font-family: monospace;
  font-size: 14px;
  color: #58a6ff;
}

.demo-hint { font-size: 12px; color: #8b949e; max-width: 400px; line-height: 1.6; }

.demo-open-btn {
  background: #238636;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 10px 22px;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.demo-open-btn:hover { background: #2ea043; }

/* Placeholder */
#placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #8b949e;
  gap: 8px;
}

#placeholder .big { font-size: 40px; }
#placeholder p    { font-size: 13px; }
```

- [ ] **Step 3: Commit**

```bash
git add presentation/public/index.html presentation/public/style.css
git commit -m "feat: dashboard HTML shell and dark CSS theme"
```

---

## Task 4: Dashboard app.js

**Files:**
- Create: `presentation/public/app.js`

- [ ] **Step 1: Create presentation/public/app.js**

```js
const VULNS = [
  { code: 'A01', color: '#f85149', name: 'Broken Access Control' },
  { code: 'A02', color: '#d29922', name: 'Security Misconfiguration' },
  { code: 'A03', color: '#8957e5', name: 'Supply Chain Failures' },
  { code: 'A04', color: '#1f6feb', name: 'Cryptographic Failures' },
  { code: 'A05', color: '#f85149', name: 'Injection' },
  { code: 'A06', color: '#da3633', name: 'Insecure Design' },
  { code: 'A07', color: '#e36209', name: 'Auth Failures' },
  { code: 'A08', color: '#8957e5', name: 'Integrity Failures' },
  { code: 'A09', color: '#388bfd', name: 'Logging Failures' },
  { code: 'A10', color: '#3fb950', name: 'Error Handling' },
];

let currentSlide = null;
let currentTab = 'explain';

function buildSidebar() {
  const ul = document.getElementById('vuln-list');
  VULNS.forEach(v => {
    const li = document.createElement('li');
    li.dataset.code = v.code.toLowerCase();
    li.style.borderLeftColor = 'transparent';
    li.innerHTML = `
      <span class="badge" style="background:${v.color}">${v.code}</span>
      <span class="vuln-name">${v.name}</span>
    `;
    li.addEventListener('click', () => loadSlide(v.code.toLowerCase(), v.color, li));
    ul.appendChild(li);
  });
}

async function loadSlide(id, color, liEl) {
  document.querySelectorAll('#vuln-list li').forEach(el => {
    el.classList.remove('active');
    el.style.borderLeftColor = 'transparent';
  });
  liEl.classList.add('active');
  liEl.style.borderLeftColor = color;

  const res = await fetch(`/slides/${id}.json`);
  const slide = await res.json();
  currentSlide = slide;
  renderTab(currentTab);
}

function renderTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));

  if (!currentSlide) return;
  const s = currentSlide;

  if (tab === 'explain') {
    document.getElementById('tab-explain').innerHTML = `
      <div class="explain-header">
        <span class="badge" style="background:${s.badgeColor};font-size:12px;padding:4px 9px">${s.code}</span>
        <span class="explain-title">${s.title}</span>
      </div>
      <div class="explain-card" style="border-left-color:${s.badgeColor}">
        <div class="explain-card-label">What is it?</div>
        <p>${s.explain.what}</p>
      </div>
      <div class="explain-card">
        <div class="explain-card-label">Real-world example</div>
        <p>${s.explain.example}</p>
      </div>
      <div class="explain-card">
        <div class="explain-card-label">Impact</div>
        <p>${s.explain.impact}</p>
      </div>
    `;
  }

  if (tab === 'vulnerable') {
    document.getElementById('tab-vulnerable').innerHTML = `
      <div class="code-annotation vuln">${s.vulnerable.annotation}</div>
      <div class="code-filename">${s.vulnerable.filename}</div>
      <pre><code class="language-javascript">${escHtml(s.vulnerable.code)}</code></pre>
    `;
    Prism.highlightAll();
  }

  if (tab === 'fixed') {
    document.getElementById('tab-fixed').innerHTML = `
      <div class="code-annotation fixed">${s.fixed.annotation}</div>
      <div class="code-filename">${s.fixed.filename}</div>
      <pre><code class="language-javascript">${escHtml(s.fixed.code)}</code></pre>
    `;
    Prism.highlightAll();
  }

  if (tab === 'demo') {
    document.getElementById('tab-demo').innerHTML = `
      <div class="demo-panel">
        <div class="demo-url">${s.demoUrl}</div>
        <p class="demo-hint">${s.demoHint}</p>
        <a class="demo-open-btn" href="${s.demoUrl}" target="_blank">Open Live Demo ↗</a>
      </div>
    `;
  }
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => renderTab(btn.dataset.tab));
});

buildSidebar();
```

- [ ] **Step 2: Commit**

```bash
git add presentation/public/app.js
git commit -m "feat: dashboard sidebar nav and tab rendering"
```

---

## Task 5: All 10 slide JSON files

**Files:** Create `presentation/public/slides/a01.json` through `a10.json`

- [ ] **Step 1: Create a01.json**

```json
{
  "code": "A01",
  "title": "Broken Access Control",
  "badgeColor": "#f85149",
  "explain": {
    "what": "A user can access data or actions that belong to another user or require higher privileges. The server checks <code>who</code> is logged in, but not <code>what</code> they are allowed to touch.",
    "example": "You log in as Alice. Your invoice is at <code>/invoice/1</code>. You change it to <code>/invoice/2</code> and read Bob's private $2,500 invoice.",
    "impact": "Data theft · privilege escalation · account takeover · #1 most common vulnerability in OWASP 2026"
  },
  "vulnerable": {
    "filename": "routes/a01-access-control.js",
    "annotation": "⚠ The server confirms you are logged in (x-user-id header) but never checks whether the invoice belongs to you.",
    "code": "router.get('/vulnerable/invoice/:id', (req, res) => {\n  const userId = parseInt(req.headers['x-user-id']);\n  if (!userId) return res.status(401).json({ error: 'Not logged in' });\n\n  const invoice = db.prepare(\n    'SELECT * FROM invoices WHERE id = ?'\n  ).get(req.params.id);\n\n  if (!invoice) return res.status(404).json({ error: 'Not found' });\n\n  // ⚠ No ownership check — any user can read any invoice\n  res.json(invoice);\n});"
  },
  "fixed": {
    "filename": "routes/a01-access-control.js",
    "annotation": "✅ After fetching the invoice, we verify the owner matches the logged-in user. Mismatches return 403 Forbidden.",
    "code": "router.get('/fixed/invoice/:id', (req, res) => {\n  const userId = parseInt(req.headers['x-user-id']);\n  if (!userId) return res.status(401).json({ error: 'Not logged in' });\n\n  const invoice = db.prepare(\n    'SELECT * FROM invoices WHERE id = ?'\n  ).get(req.params.id);\n\n  if (!invoice) return res.status(404).json({ error: 'Not found' });\n\n  // ✅ Ownership check\n  if (invoice.user_id !== userId)\n    return res.status(403).json({ error: 'Forbidden' });\n\n  res.json(invoice);\n});"
  },
  "demoUrl": "http://localhost:4000/a01",
  "demoHint": "Log in as Alice (user 1), then change the invoice ID in the URL to 2 or 3 to read Bob's and Admin's private invoices."
}
```

- [ ] **Step 2: Create a02.json**

```json
{
  "code": "A02",
  "title": "Security Misconfiguration",
  "badgeColor": "#d29922",
  "explain": {
    "what": "The server is set up in a way that leaks internal information or allows unauthorized access. Common causes: default credentials left unchanged, verbose error pages, unnecessary admin endpoints exposed.",
    "example": "Triggering any error causes the server to return the full stack trace, the server's file paths, and all environment variables — including database passwords and API keys.",
    "impact": "Information disclosure · unauthorized admin access · credential theft from leaked env vars"
  },
  "vulnerable": {
    "filename": "routes/a02-misconfiguration.js",
    "annotation": "⚠ The catch block returns the full error stack and process.env to the client.",
    "code": "router.get('/vulnerable/data', (req, res) => {\n  try {\n    // Simulate a misconfigured JSON parse\n    JSON.parse(undefined);\n  } catch (err) {\n    // ⚠ Leaks stack trace + all environment variables\n    res.status(500).json({\n      error: err.message,\n      stack: err.stack,\n      env: process.env\n    });\n  }\n});"
  },
  "fixed": {
    "filename": "routes/a02-misconfiguration.js",
    "annotation": "✅ Log the error server-side only. Return a generic message to the client.",
    "code": "router.get('/fixed/data', (req, res) => {\n  try {\n    JSON.parse(undefined);\n  } catch (err) {\n    // ✅ Log internally, never send details to client\n    console.error('Internal error:', err);\n    res.status(500).json({ error: 'Something went wrong. Please try again.' });\n  }\n});"
  },
  "demoUrl": "http://localhost:4000/a02",
  "demoHint": "Click 'Trigger Error' to see what the vulnerable server leaks. Then compare with the fixed version."
}
```

- [ ] **Step 3: Create a03.json**

```json
{
  "code": "A03",
  "title": "Software Supply Chain Failures",
  "badgeColor": "#8957e5",
  "explain": {
    "what": "A third-party package you installed from npm runs malicious code inside your server. Your own code is clean — but a dependency is not. You trusted the supply chain without verifying it.",
    "example": "You install an 'analytics' package. It looks harmless in the README. But inside it silently reads your environment variables and writes them to a log file — simulating data exfiltration to an attacker's server.",
    "impact": "Secret / credential theft · backdoors · full server compromise · SolarWinds and XZ Utils are real-world examples"
  },
  "vulnerable": {
    "filename": "routes/a03-supply-chain.js",
    "annotation": "⚠ The app requires 'evil-analytics'. Calling track() also exfiltrates env vars to exfil.log.",
    "code": "const analytics = require('../packages/evil-analytics');\n\nrouter.post('/vulnerable/purchase', (req, res) => {\n  const { userId, amount } = req.body;\n\n  // Looks like normal tracking...\n  // But evil-analytics also writes env vars to exfil.log\n  analytics.track('purchase', { userId, amount });\n\n  res.json({ success: true, message: 'Purchase recorded' });\n});"
  },
  "fixed": {
    "filename": "routes/a03-supply-chain.js",
    "annotation": "✅ Remove the unverified dependency. Log internally with a trusted, minimal implementation.",
    "code": "// ✅ No third-party analytics package\nrouter.post('/fixed/purchase', (req, res) => {\n  const { userId, amount } = req.body;\n\n  // Minimal trusted logging — no external dependency\n  console.log(`[purchase] userId=${userId} amount=${amount}`);\n\n  res.json({ success: true, message: 'Purchase recorded' });\n});"
  },
  "demoUrl": "http://localhost:4000/a03",
  "demoHint": "Click 'Track Purchase' then check the Exfiltration Log to see what the evil-analytics package secretly captured."
}
```

- [ ] **Step 4: Create a04.json**

```json
{
  "code": "A04",
  "title": "Cryptographic Failures",
  "badgeColor": "#1f6feb",
  "explain": {
    "what": "Sensitive data — especially passwords — is protected with a weak or broken algorithm. MD5 and SHA-1 are not password hashing algorithms. They are fast by design, which makes them easy to brute-force.",
    "example": "Register with password 'password123'. The server stores its MD5 hash. An attacker who dumps your database can crack every hash in seconds using rainbow tables or GPU brute force.",
    "impact": "Mass credential breach · account takeover across every service where users reuse passwords"
  },
  "vulnerable": {
    "filename": "routes/a04-crypto.js",
    "annotation": "⚠ Passwords are hashed with MD5 — a fast hash designed for checksums, not passwords. Crackable in milliseconds.",
    "code": "const crypto = require('crypto');\nconst md5 = s => crypto.createHash('md5').update(s).digest('hex');\n\nrouter.post('/vulnerable/register', (req, res) => {\n  const { username, password } = req.body;\n  const hash = md5(password); // ⚠ MD5 is not a password hash\n  db.prepare(\n    'INSERT INTO users (username, password_md5) VALUES (?, ?)'\n  ).run(username, hash);\n  res.json({ stored_hash: hash, algorithm: 'MD5' });\n});"
  },
  "fixed": {
    "filename": "routes/a04-crypto.js",
    "annotation": "✅ bcrypt with cost factor 12 is designed for passwords — deliberately slow, salted, and resistant to GPU attacks.",
    "code": "const bcrypt = require('bcrypt');\n\nrouter.post('/fixed/register', async (req, res) => {\n  const { username, password } = req.body;\n  // ✅ cost=12 means ~250ms per hash — slow enough to deter brute force\n  const hash = await bcrypt.hash(password, 12);\n  db.prepare(\n    'INSERT INTO users (username, password_bcrypt) VALUES (?, ?)'\n  ).run(username, hash);\n  res.json({ algorithm: 'bcrypt (cost 12)', note: 'Hash not returned to client' });\n});"
  },
  "demoUrl": "http://localhost:4000/a04",
  "demoHint": "Register with any password. See the MD5 hash stored in the database, then paste it into crackstation.net to crack it instantly."
}
```

- [ ] **Step 5: Create a05.json**

```json
{
  "code": "A05",
  "title": "Injection",
  "badgeColor": "#f85149",
  "explain": {
    "what": "User input is pasted directly into a SQL query. The database cannot tell the difference between data and commands, so the attacker's input becomes part of the query logic.",
    "example": "Search for <code>' OR '1'='1</code> — the query becomes <code>WHERE name LIKE '%' OR '1'='1'%'</code> which is always true, returning every row in the table including secret data.",
    "impact": "Full database dump · authentication bypass · data deletion (<code>'; DROP TABLE users;--</code>)"
  },
  "vulnerable": {
    "filename": "routes/a05-injection.js",
    "annotation": "⚠ The search term is concatenated directly into the SQL string. The attacker controls the query.",
    "code": "router.get('/vulnerable/search', (req, res) => {\n  const q = req.query.q || '';\n  // ⚠ String concatenation — attacker controls SQL\n  const sql = `SELECT * FROM products WHERE name LIKE '%${q}%'`;\n  try {\n    const results = db.prepare(sql).all();\n    res.json({ query: sql, results });\n  } catch (err) {\n    res.status(500).json({ error: err.message, query: sql });\n  }\n});"
  },
  "fixed": {
    "filename": "routes/a05-injection.js",
    "annotation": "✅ Parameterized query: the ? placeholder is handled by the database driver, which treats user input as data — never as SQL.",
    "code": "router.get('/fixed/search', (req, res) => {\n  const q = req.query.q || '';\n  // ✅ Parameterized — user input is data, not SQL\n  const results = db.prepare(\n    'SELECT id, name, price FROM products WHERE name LIKE ?'\n  ).all(`%${q}%`);\n  res.json({ results });\n});"
  },
  "demoUrl": "http://localhost:4000/a05",
  "demoHint": "Search for a product name normally first. Then try: ' OR '1'='1 — and watch all rows including secret data appear."
}
```

- [ ] **Step 6: Create a06.json**

```json
{
  "code": "A06",
  "title": "Insecure Design",
  "badgeColor": "#da3633",
  "explain": {
    "what": "The business logic has a flaw built into the design — not just a coding mistake. No amount of patching the implementation will fix it without redesigning the feature.",
    "example": "The coupon system allows any coupon to be applied as many times as you want to the same order. Click 'Apply SAVE10' 100 times and get 1000% off.",
    "impact": "Financial fraud · inventory abuse · SLA gaming — anything where business rules are not enforced server-side"
  },
  "vulnerable": {
    "filename": "routes/a06-insecure-design.js",
    "annotation": "⚠ The coupon is applied without checking how many times it has been used or whether it was already applied to this order.",
    "code": "router.post('/vulnerable/apply-coupon', (req, res) => {\n  const { orderId, code } = req.body;\n  const coupon = db.prepare(\n    'SELECT * FROM coupons WHERE code = ?'\n  ).get(code);\n  if (!coupon) return res.status(404).json({ error: 'Invalid coupon' });\n\n  // ⚠ No check on max_uses or duplicate application\n  db.prepare(\n    'UPDATE orders SET discount = discount + ? WHERE id = ?'\n  ).run(coupon.discount_percent, orderId);\n\n  res.json({ applied: coupon.discount_percent });\n});"
  },
  "fixed": {
    "filename": "routes/a06-insecure-design.js",
    "annotation": "✅ Enforce max_uses and prevent duplicate application in the same transaction.",
    "code": "router.post('/fixed/apply-coupon', (req, res) => {\n  const { orderId, code } = req.body;\n  const coupon = db.prepare(\n    'SELECT * FROM coupons WHERE code = ?'\n  ).get(code);\n  if (!coupon) return res.status(404).json({ error: 'Invalid coupon' });\n\n  // ✅ Check usage limit\n  if (coupon.times_used >= coupon.max_uses)\n    return res.status(400).json({ error: 'Coupon has expired' });\n\n  // ✅ Check already used on this order\n  const used = db.prepare(\n    'SELECT 1 FROM coupon_usages WHERE order_id=? AND coupon_id=?'\n  ).get(orderId, coupon.id);\n  if (used) return res.status(400).json({ error: 'Already applied' });\n\n  db.prepare('UPDATE coupons SET times_used=times_used+1 WHERE id=?').run(coupon.id);\n  db.prepare('INSERT INTO coupon_usages VALUES (?,?)').run(orderId, coupon.id);\n  db.prepare('UPDATE orders SET discount=discount+? WHERE id=?').run(coupon.discount_percent, orderId);\n\n  res.json({ applied: coupon.discount_percent });\n});"
  },
  "demoUrl": "http://localhost:4000/a06",
  "demoHint": "Apply coupon SAVE10 on order 1 — then apply it again, and again. Watch the discount grow without limit."
}
```

- [ ] **Step 7: Create a07.json**

```json
{
  "code": "A07",
  "title": "Identification & Authentication Failures",
  "badgeColor": "#e36209",
  "explain": {
    "what": "The login endpoint has no protection against automated attacks. An attacker can try thousands of username/password combinations per second until one works.",
    "example": "With no rate limiting, a script can attempt 1,000 logins per second. A 6-character lowercase password has 300 million combinations — crackable in under 5 minutes.",
    "impact": "Account takeover · credential stuffing across multiple services · complete breach of user data"
  },
  "vulnerable": {
    "filename": "routes/a07-auth-failures.js",
    "annotation": "⚠ No rate limiting, no lockout, no delay. An attacker can hammer this endpoint as fast as their network allows.",
    "code": "router.post('/vulnerable/login', (req, res) => {\n  const { username, password } = req.body;\n  const md5 = s => require('crypto').createHash('md5').update(s).digest('hex');\n\n  // ⚠ No rate limit, no lockout, no CAPTCHA\n  const user = db.prepare(\n    'SELECT * FROM users WHERE username=? AND password_md5=?'\n  ).get(username, md5(password));\n\n  if (user) res.json({ success: true, userId: user.id });\n  else res.status(401).json({ error: 'Invalid credentials' });\n});"
  },
  "fixed": {
    "filename": "routes/a07-auth-failures.js",
    "annotation": "✅ express-rate-limit blocks the IP after 5 failed attempts in 15 minutes.",
    "code": "const rateLimit = require('express-rate-limit');\n\nconst loginLimiter = rateLimit({\n  windowMs: 15 * 60 * 1000, // 15 minutes\n  max: 5,\n  message: { error: 'Too many attempts. Try again in 15 minutes.' }\n});\n\nrouter.post('/fixed/login', loginLimiter, (req, res) => {\n  const { username, password } = req.body;\n  const md5 = s => require('crypto').createHash('md5').update(s).digest('hex');\n  const user = db.prepare(\n    'SELECT * FROM users WHERE username=? AND password_md5=?'\n  ).get(username, md5(password));\n\n  if (user) res.json({ success: true, userId: user.id });\n  else res.status(401).json({ error: 'Invalid credentials' });\n});"
  },
  "demoUrl": "http://localhost:4000/a07",
  "demoHint": "Use the brute-force simulator to send 20 rapid login attempts. Against vulnerable: all go through. Against fixed: blocked after 5."
}
```

- [ ] **Step 8: Create a08.json**

```json
{
  "code": "A08",
  "title": "Software & Data Integrity Failures",
  "badgeColor": "#8957e5",
  "explain": {
    "what": "The server executes untrusted user input as code. eval() evaluates any JavaScript string — including system commands, file reads, or infinite loops.",
    "example": "A calculator endpoint uses eval() on the formula you type. Instead of '2+2', send <code>require('fs').readdirSync('/')</code> to list the server's root directory.",
    "impact": "Remote code execution · full server compromise · data exfiltration · denial of service"
  },
  "vulnerable": {
    "filename": "routes/a08-integrity.js",
    "annotation": "⚠ eval() executes any JavaScript the user sends — not just math expressions.",
    "code": "router.post('/vulnerable/calculate', (req, res) => {\n  const { formula } = req.body;\n  try {\n    // ⚠ eval() runs ANY JavaScript, not just math\n    const result = eval(formula);\n    res.json({ result: String(result) });\n  } catch (err) {\n    res.status(400).json({ error: err.message });\n  }\n});"
  },
  "fixed": {
    "filename": "routes/a08-integrity.js",
    "annotation": "✅ Whitelist validation rejects anything that is not a basic arithmetic expression before it reaches eval().",
    "code": "router.post('/fixed/calculate', (req, res) => {\n  const { formula } = req.body;\n  // ✅ Whitelist: only digits, spaces, and arithmetic operators\n  if (!/^[\\d\\s+\\-*/().]+$/.test(formula)) {\n    return res.status(400).json({\n      error: 'Invalid formula. Only numbers and + - * / ( ) allowed.'\n    });\n  }\n  try {\n    const result = eval(formula);\n    res.json({ result });\n  } catch (err) {\n    res.status(400).json({ error: 'Invalid expression' });\n  }\n});"
  },
  "demoUrl": "http://localhost:4000/a08",
  "demoHint": "Try a normal formula like 2+2. Then try: require('fs').readdirSync('.').join(', ') — and see the server's directory listing."
}
```

- [ ] **Step 9: Create a09.json**

```json
{
  "code": "A09",
  "title": "Security Logging & Monitoring Failures",
  "badgeColor": "#388bfd",
  "explain": {
    "what": "Sensitive actions happen with no audit trail. If an attacker transfers money, deletes records, or escalates privileges, there is no log to detect it, investigate it, or prove it happened.",
    "example": "Transfer $500 from account 1 to account 2 using the vulnerable endpoint. Then check the audit log — it is empty. The fixed endpoint writes every transfer to the log.",
    "impact": "Attacks go undetected for months · no forensics after a breach · regulatory non-compliance"
  },
  "vulnerable": {
    "filename": "routes/a09-logging.js",
    "annotation": "⚠ The transfer succeeds but nothing is written to the audit log.",
    "code": "router.post('/vulnerable/transfer', (req, res) => {\n  const { fromId, toId, amount } = req.body;\n  const from = db.prepare('SELECT * FROM accounts WHERE id=?').get(fromId);\n  if (!from || from.balance < amount)\n    return res.status(400).json({ error: 'Insufficient funds' });\n\n  db.prepare('UPDATE accounts SET balance=balance-? WHERE id=?').run(amount, fromId);\n  db.prepare('UPDATE accounts SET balance=balance+? WHERE id=?').run(amount, toId);\n\n  // ⚠ No audit log entry written\n  res.json({ success: true });\n});"
  },
  "fixed": {
    "filename": "routes/a09-logging.js",
    "annotation": "✅ Every transfer — successful or failed — writes a timestamped entry to the audit_log table.",
    "code": "router.post('/fixed/transfer', (req, res) => {\n  const { fromId, toId, amount } = req.body;\n  const from = db.prepare('SELECT * FROM accounts WHERE id=?').get(fromId);\n\n  if (!from || from.balance < amount) {\n    db.prepare(\n      'INSERT INTO audit_log (timestamp,action,user_id,details) VALUES (?,?,?,?)'\n    ).run(new Date().toISOString(), 'TRANSFER_FAILED', fromId,\n      `Insufficient funds: tried $${amount}`);\n    return res.status(400).json({ error: 'Insufficient funds' });\n  }\n\n  db.prepare('UPDATE accounts SET balance=balance-? WHERE id=?').run(amount, fromId);\n  db.prepare('UPDATE accounts SET balance=balance+? WHERE id=?').run(amount, toId);\n  db.prepare(\n    'INSERT INTO audit_log (timestamp,action,user_id,details) VALUES (?,?,?,?)'\n  ).run(new Date().toISOString(), 'TRANSFER_OK', fromId,\n    `Transferred $${amount} → account ${toId}`);\n\n  res.json({ success: true });\n});"
  },
  "demoUrl": "http://localhost:4000/a09",
  "demoHint": "Transfer money using vulnerable (no log), then transfer using fixed (logged). Compare the audit log before and after."
}
```

- [ ] **Step 10: Create a10.json**

```json
{
  "code": "A10",
  "title": "Mishandling of Exceptional Conditions",
  "badgeColor": "#3fb950",
  "explain": {
    "what": "When an error occurs during authentication or authorization, the code catches it and silently continues — granting access instead of denying it. This is called 'fail-open'.",
    "example": "The token validation service throws an error for a malformed token. The catch block logs the error but never returns a denial response — so the server replies with 'Access granted' anyway.",
    "impact": "Authentication bypass · unauthorized access · attackers deliberately trigger errors to gain entry"
  },
  "vulnerable": {
    "filename": "routes/a10-error-handling.js",
    "annotation": "⚠ The catch block handles the auth error but then falls through to the success response.",
    "code": "router.post('/vulnerable/access', (req, res) => {\n  const { token } = req.body;\n  let authorized = false;\n\n  try {\n    if (!token || token.length < 20)\n      throw new Error('Auth service unavailable');\n    authorized = true; // only set if token is valid\n  } catch (err) {\n    // ⚠ Error is caught and swallowed\n    // authorized is still false — but the response below\n    // always sends success regardless!\n    console.error('Auth error:', err.message);\n  }\n\n  // ⚠ Bug: responds success even when authorized=false\n  res.json({ access: 'granted', note: 'Auth error was swallowed!' });\n});"
  },
  "fixed": {
    "filename": "routes/a10-error-handling.js",
    "annotation": "✅ Any auth exception triggers an explicit denial. Fail closed — when in doubt, deny.",
    "code": "router.post('/fixed/access', (req, res) => {\n  const { token } = req.body;\n\n  try {\n    if (!token || token.length < 20)\n      throw new Error('Auth service unavailable');\n    // Token is valid\n    res.json({ access: 'granted' });\n  } catch (err) {\n    // ✅ Fail closed — auth error means deny, always\n    console.error('Auth error:', err.message);\n    res.status(503).json({\n      error: 'Authentication service unavailable. Access denied.'\n    });\n  }\n});"
  },
  "demoUrl": "http://localhost:4000/a10",
  "demoHint": "Submit a short (invalid) token. Vulnerable grants access anyway. Fixed returns 503 and denies."
}
```

- [ ] **Step 11: Commit all slides**

```bash
git add presentation/public/slides/
git commit -m "feat: all 10 OWASP 2026 slide JSON files"
```

---

## Task 6: Vulnerable app scaffolding

**Files:**
- Create: `vulnerable-app/package.json`
- Create: `vulnerable-app/server.js`
- Create: `vulnerable-app/database.js`
- Create: `vulnerable-app/packages/evil-analytics/package.json`
- Create: `vulnerable-app/packages/evil-analytics/index.js`

- [ ] **Step 1: Create vulnerable-app/package.json**

```json
{
  "name": "vulnerable-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "better-sqlite3": "^9.4.3",
    "evil-analytics": "file:./packages/evil-analytics",
    "express": "^4.18.2",
    "express-rate-limit": "^7.2.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.4"
  },
  "jest": {
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 2: Create vulnerable-app/packages/evil-analytics/package.json**

```json
{
  "name": "evil-analytics",
  "version": "1.0.0",
  "main": "index.js"
}
```

- [ ] **Step 3: Create vulnerable-app/packages/evil-analytics/index.js**

```js
const fs = require('fs');
const path = require('path');

const LOG = path.join(__dirname, '../../exfil.log');

module.exports = {
  track(event, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      data,
      exfiltrated: {
        NODE_ENV: process.env.NODE_ENV,
        DB_PASSWORD: process.env.DB_PASSWORD || '(not set)',
        SECRET_KEY: process.env.SECRET_KEY || '(not set)',
        hostname: require('os').hostname(),
        cwd: process.cwd(),
      },
    };
    // Silently write to exfil log
    fs.appendFileSync(LOG, JSON.stringify(entry) + '\n');
    // In a real attack this would also HTTP POST to attacker's server
  },
};
```

- [ ] **Step 4: Create vulnerable-app/database.js**

```js
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const md5 = s => crypto.createHash('md5').update(s).digest('hex');

function createDatabase(dbPath = path.join(__dirname, 'data.db')) {
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_md5 TEXT,
      password_bcrypt TEXT,
      failed_attempts INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      description TEXT
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      internal_code TEXT
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      total REAL NOT NULL,
      discount REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      discount_percent REAL NOT NULL,
      max_uses INTEGER NOT NULL,
      times_used INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS coupon_usages (
      order_id INTEGER NOT NULL,
      coupon_id INTEGER NOT NULL,
      PRIMARY KEY (order_id, coupon_id)
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      balance REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      user_id INTEGER,
      details TEXT
    );
  `);

  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count === 0) {
    db.prepare('INSERT INTO users (id,username,password_md5) VALUES (1,?,?)').run('alice', md5('password123'));
    db.prepare('INSERT INTO users (id,username,password_md5) VALUES (2,?,?)').run('bob', md5('secret456'));
    db.prepare('INSERT INTO users (id,username,password_md5) VALUES (3,?,?)').run('admin', md5('admin123'));

    db.prepare('INSERT INTO invoices VALUES (1,1,150.00,?)').run('Web hosting - Alice');
    db.prepare('INSERT INTO invoices VALUES (2,2,2500.00,?)').run('Consulting fees - Bob');
    db.prepare('INSERT INTO invoices VALUES (3,3,99999.00,?)').run('Executive bonus - Admin');

    db.prepare('INSERT INTO products VALUES (1,?,999.99,?)').run('Laptop', 'INTERNAL-LAP-001');
    db.prepare('INSERT INTO products VALUES (2,?,29.99,?)').run('Mouse', 'INTERNAL-MOU-002');
    db.prepare('INSERT INTO products VALUES (3,?,0.01,?)').run('Secret Prototype', 'TOP-SECRET-XR7');

    db.prepare('INSERT INTO orders VALUES (1,1,999.99,0)').run();
    db.prepare('INSERT INTO orders VALUES (2,2,1500.00,0)').run();

    db.prepare('INSERT INTO coupons VALUES (1,?,10.0,1,0)').run('SAVE10');
    db.prepare('INSERT INTO coupons VALUES (2,?,20.0,3,0)').run('WELCOME20');

    db.prepare('INSERT INTO accounts VALUES (1,1,1000.00)').run();
    db.prepare('INSERT INTO accounts VALUES (2,2,500.00)').run();
  }

  return db;
}

module.exports = { createDatabase };
```

- [ ] **Step 5: Create vulnerable-app/server.js**

```js
const express = require('express');
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

app.use('/a01', require('./routes/a01-access-control')(db));
app.use('/a02', require('./routes/a02-misconfiguration')(db));
app.use('/a03', require('./routes/a03-supply-chain')(db));
app.use('/a04', require('./routes/a04-crypto')(db));
app.use('/a05', require('./routes/a05-injection')(db));
app.use('/a06', require('./routes/a06-insecure-design')(db));
app.use('/a07', require('./routes/a07-auth-failures')(db));
app.use('/a08', require('./routes/a08-integrity')(db));
app.use('/a09', require('./routes/a09-logging')(db));
app.use('/a10', require('./routes/a10-error-handling')(db));

if (require.main === module) {
  app.listen(4000, () => console.log('Vulnerable app → http://localhost:4000'));
}

module.exports = app;
```

- [ ] **Step 6: Create vulnerable-app/tests/setup.js**

```js
const { createDatabase } = require('../database');

function makeTestDb() {
  return createDatabase(':memory:');
}

module.exports = { makeTestDb };
```

- [ ] **Step 7: Install vulnerable-app deps**

```bash
npm install --workspace=vulnerable-app
```

- [ ] **Step 8: Commit**

```bash
git add vulnerable-app/
git commit -m "feat: vulnerable app server, database, and evil-analytics package"
```

---

## Task 7: A01 — Broken Access Control

**Files:**
- Create: `vulnerable-app/routes/a01-access-control.js`
- Create: `vulnerable-app/tests/a01.test.js`

- [ ] **Step 1: Write failing test**

```js
// vulnerable-app/tests/a01.test.js
const request = require('supertest');
const express = require('express');
const { makeTestDb } = require('./setup');
const makeRouter = require('../routes/a01-access-control');

function makeApp(db) {
  const app = express();
  app.use(express.json());
  app.use('/a01', makeRouter(db));
  return app;
}

let app, db;
beforeEach(() => { db = makeTestDb(); app = makeApp(db); });

test('vulnerable: user 1 can read invoice belonging to user 2', async () => {
  const res = await request(app)
    .get('/a01/vulnerable/invoice/2')
    .set('x-user-id', '1');
  expect(res.status).toBe(200);
  expect(res.body.user_id).toBe(2);
});

test('fixed: user 1 cannot read invoice belonging to user 2', async () => {
  const res = await request(app)
    .get('/a01/fixed/invoice/2')
    .set('x-user-id', '1');
  expect(res.status).toBe(403);
});

test('fixed: user 1 can read their own invoice', async () => {
  const res = await request(app)
    .get('/a01/fixed/invoice/1')
    .set('x-user-id', '1');
  expect(res.status).toBe(200);
  expect(res.body.user_id).toBe(1);
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a01
```

Expected: `Cannot find module '../routes/a01-access-control'`

- [ ] **Step 3: Create vulnerable-app/routes/a01-access-control.js**

```js
const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>A01 Demo</title>
<style>body{font-family:monospace;background:#0d1117;color:#e6edf3;padding:24px}
h1{color:#f85149}button{background:#238636;color:#fff;border:none;padding:8px 16px;
cursor:pointer;border-radius:4px;margin:4px}pre{background:#161b22;padding:12px;
border-radius:4px;margin-top:12px}input{background:#21262d;color:#e6edf3;
border:1px solid #30363d;padding:6px;border-radius:4px;width:60px}</style></head>
<body>
<h1>A01 — Broken Access Control (IDOR)</h1>
<p>You are logged in as <strong>Alice (user 1)</strong>. Your invoice ID is 1.</p>
<p>Invoice ID to fetch: <input id="iid" value="1"> 
  <button onclick="fetch_('/a01/vulnerable/invoice/'+document.getElementById('iid').value,'vulnerable')">Vulnerable</button>
  <button onclick="fetch_('/a01/fixed/invoice/'+document.getElementById('iid').value,'fixed')" style="background:#1f6feb">Fixed</button>
</p>
<div id="out"></div>
<script>
async function fetch_(url, mode) {
  const r = await fetch(url, { headers: { 'x-user-id': '1' } });
  const j = await r.json();
  document.getElementById('out').innerHTML =
    '<p>Mode: <strong>'+mode+'</strong> | Status: '+r.status+'</p><pre>'+JSON.stringify(j,null,2)+'</pre>';
}
</script></body></html>`);
  });

  router.get('/vulnerable/invoice/:id', (req, res) => {
    const userId = parseInt(req.headers['x-user-id']);
    if (!userId) return res.status(401).json({ error: 'Not logged in' });
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Not found' });
    res.json(invoice);
  });

  router.get('/fixed/invoice/:id', (req, res) => {
    const userId = parseInt(req.headers['x-user-id']);
    if (!userId) return res.status(401).json({ error: 'Not logged in' });
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Not found' });
    if (invoice.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });
    res.json(invoice);
  });

  return router;
};
```

- [ ] **Step 4: Run — verify PASS**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a01
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add vulnerable-app/routes/a01-access-control.js vulnerable-app/tests/a01.test.js
git commit -m "feat: A01 broken access control route and tests"
```

---

## Task 8: A02 — Security Misconfiguration

**Files:**
- Create: `vulnerable-app/routes/a02-misconfiguration.js`
- Create: `vulnerable-app/tests/a02.test.js`

- [ ] **Step 1: Write failing test**

```js
// vulnerable-app/tests/a02.test.js
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
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a02
```

- [ ] **Step 3: Create vulnerable-app/routes/a02-misconfiguration.js**

```js
const express = require('express');

module.exports = function () {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>A02 Demo</title>
<style>body{font-family:monospace;background:#0d1117;color:#e6edf3;padding:24px}
h1{color:#d29922}button{background:#238636;color:#fff;border:none;padding:8px 16px;
cursor:pointer;border-radius:4px;margin:4px}pre{background:#161b22;padding:12px;
border-radius:4px;margin-top:12px;overflow:auto;max-height:400px}</style></head>
<body>
<h1>A02 — Security Misconfiguration</h1>
<p>Trigger an internal server error and see what leaks.</p>
<button onclick="hit('/a02/vulnerable/data','vulnerable')">Vulnerable</button>
<button onclick="hit('/a02/fixed/data','fixed')" style="background:#1f6feb">Fixed</button>
<div id="out"></div>
<script>
async function hit(url, mode) {
  const r = await fetch(url);
  const j = await r.json();
  document.getElementById('out').innerHTML =
    '<p>Mode: <strong>'+mode+'</strong> | Status: '+r.status+'</p><pre>'+JSON.stringify(j,null,2)+'</pre>';
}
</script></body></html>`);
  });

  router.get('/vulnerable/data', (req, res) => {
    try {
      JSON.parse(undefined);
    } catch (err) {
      return res.status(500).json({
        error: err.message,
        stack: err.stack,
        env: process.env,
      });
    }
  });

  router.get('/fixed/data', (req, res) => {
    try {
      JSON.parse(undefined);
    } catch (err) {
      console.error('Internal error:', err);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  });

  return router;
};
```

- [ ] **Step 4: Run — verify PASS**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a02
```

- [ ] **Step 5: Commit**

```bash
git add vulnerable-app/routes/a02-misconfiguration.js vulnerable-app/tests/a02.test.js
git commit -m "feat: A02 security misconfiguration route and tests"
```

---

## Task 9: A03 — Supply Chain Failures

**Files:**
- Create: `vulnerable-app/routes/a03-supply-chain.js`
- Create: `vulnerable-app/tests/a03.test.js`

- [ ] **Step 1: Write failing test**

```js
// vulnerable-app/tests/a03.test.js
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
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a03
```

- [ ] **Step 3: Create vulnerable-app/routes/a03-supply-chain.js**

```js
const express = require('express');
const fs = require('fs');
const path = require('path');
const analytics = require('../packages/evil-analytics');

const EXFIL = path.join(__dirname, '../exfil.log');

module.exports = function () {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>A03 Demo</title>
<style>body{font-family:monospace;background:#0d1117;color:#e6edf3;padding:24px}
h1{color:#8957e5}button{background:#238636;color:#fff;border:none;padding:8px 16px;
cursor:pointer;border-radius:4px;margin:4px}pre{background:#161b22;padding:12px;
border-radius:4px;margin-top:12px;overflow:auto;max-height:400px}</style></head>
<body>
<h1>A03 — Supply Chain Failures</h1>
<p>The app uses <code>evil-analytics</code> — an npm package that looks harmless.</p>
<button onclick="purchase('vulnerable')">Track Purchase (Vulnerable)</button>
<button onclick="purchase('fixed')" style="background:#1f6feb">Track Purchase (Fixed)</button>
<button onclick="showLog()" style="background:#6e40c9">Show Exfiltration Log</button>
<div id="out"></div>
<script>
async function purchase(mode) {
  const r = await fetch('/a03/'+mode+'/purchase', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({userId:1, amount:99.99})
  });
  const j = await r.json();
  document.getElementById('out').innerHTML = '<p>Mode: <strong>'+mode+'</strong></p><pre>'+JSON.stringify(j,null,2)+'</pre>';
}
async function showLog() {
  const r = await fetch('/a03/exfil-log');
  const j = await r.json();
  document.getElementById('out').innerHTML = '<p><strong>Exfiltration Log:</strong></p><pre>'+JSON.stringify(j,null,2)+'</pre>';
}
</script></body></html>`);
  });

  router.post('/vulnerable/purchase', (req, res) => {
    const { userId, amount } = req.body;
    analytics.track('purchase', { userId, amount });
    res.json({ success: true, message: 'Purchase recorded' });
  });

  router.post('/fixed/purchase', (req, res) => {
    const { userId, amount } = req.body;
    console.log(`[purchase] userId=${userId} amount=${amount}`);
    res.json({ success: true, message: 'Purchase recorded' });
  });

  router.get('/exfil-log', (req, res) => {
    try {
      const raw = fs.readFileSync(EXFIL, 'utf8');
      const entries = raw.split('\n').filter(Boolean).map(l => JSON.parse(l));
      res.json({ entries });
    } catch {
      res.json({ entries: [] });
    }
  });

  return router;
};
```

- [ ] **Step 4: Run — verify PASS**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a03
```

- [ ] **Step 5: Commit**

```bash
git add vulnerable-app/routes/a03-supply-chain.js vulnerable-app/tests/a03.test.js
git commit -m "feat: A03 supply chain route and tests"
```

---

## Task 10: A04 — Cryptographic Failures

**Files:**
- Create: `vulnerable-app/routes/a04-crypto.js`
- Create: `vulnerable-app/tests/a04.test.js`

- [ ] **Step 1: Write failing test**

```js
// vulnerable-app/tests/a04.test.js
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
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a04
```

- [ ] **Step 3: Create vulnerable-app/routes/a04-crypto.js**

```js
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const md5 = s => crypto.createHash('md5').update(s).digest('hex');

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>A04 Demo</title>
<style>body{font-family:monospace;background:#0d1117;color:#e6edf3;padding:24px}
h1{color:#1f6feb}button{background:#238636;color:#fff;border:none;padding:8px 16px;
cursor:pointer;border-radius:4px;margin:4px}input{background:#21262d;color:#e6edf3;
border:1px solid #30363d;padding:6px;border-radius:4px;width:140px}
pre{background:#161b22;padding:12px;border-radius:4px;margin-top:12px}</style></head>
<body>
<h1>A04 — Cryptographic Failures</h1>
<p>Username: <input id="u" value="testuser"> Password: <input id="p" value="password123" type="password"></p>
<button onclick="reg('vulnerable')">Register (Vulnerable MD5)</button>
<button onclick="reg('fixed')" style="background:#1f6feb">Register (Fixed bcrypt)</button>
<div id="out"></div>
<script>
async function reg(mode) {
  const r = await fetch('/a04/'+mode+'/register', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username:document.getElementById('u').value+'_'+Date.now(), password:document.getElementById('p').value})
  });
  const j = await r.json();
  document.getElementById('out').innerHTML = '<p>Mode: <strong>'+mode+'</strong></p><pre>'+JSON.stringify(j,null,2)+'</pre>';
}
</script></body></html>`);
  });

  router.post('/vulnerable/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    const hash = md5(password);
    try {
      db.prepare('INSERT INTO users (username, password_md5) VALUES (?, ?)').run(username, hash);
      res.status(201).json({ stored_hash: hash, algorithm: 'MD5' });
    } catch {
      res.status(409).json({ error: 'Username taken' });
    }
  });

  router.post('/vulnerable/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare(
      'SELECT * FROM users WHERE username=? AND password_md5=?'
    ).get(username, md5(password));
    if (user) res.json({ success: true, userId: user.id });
    else res.status(401).json({ error: 'Invalid credentials' });
  });

  router.post('/fixed/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    const hash = await bcrypt.hash(password, 12);
    try {
      db.prepare('INSERT INTO users (username, password_bcrypt) VALUES (?, ?)').run(username, hash);
      res.status(201).json({ algorithm: 'bcrypt (cost 12)', note: 'Hash not exposed to client' });
    } catch {
      res.status(409).json({ error: 'Username taken' });
    }
  });

  router.post('/fixed/login', async (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
    if (!user || !user.password_bcrypt) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password_bcrypt);
    if (match) res.json({ success: true });
    else res.status(401).json({ error: 'Invalid credentials' });
  });

  return router;
};
```

- [ ] **Step 4: Run — verify PASS**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a04
```

- [ ] **Step 5: Commit**

```bash
git add vulnerable-app/routes/a04-crypto.js vulnerable-app/tests/a04.test.js
git commit -m "feat: A04 cryptographic failures route and tests"
```

---

## Task 11: A05 — Injection

**Files:**
- Create: `vulnerable-app/routes/a05-injection.js`
- Create: `vulnerable-app/tests/a05.test.js`

- [ ] **Step 1: Write failing test**

```js
// vulnerable-app/tests/a05.test.js
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
  // Should expose internal_code
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
  // internal_code not exposed
  expect(res.body.results[0]).not.toHaveProperty('internal_code');
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a05
```

- [ ] **Step 3: Create vulnerable-app/routes/a05-injection.js**

```js
const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>A05 Demo</title>
<style>body{font-family:monospace;background:#0d1117;color:#e6edf3;padding:24px}
h1{color:#f85149}button{background:#238636;color:#fff;border:none;padding:8px 16px;
cursor:pointer;border-radius:4px;margin:4px}input{background:#21262d;color:#e6edf3;
border:1px solid #30363d;padding:6px;border-radius:4px;width:280px}
pre{background:#161b22;padding:12px;border-radius:4px;margin-top:12px;overflow:auto}</style></head>
<body>
<h1>A05 — SQL Injection</h1>
<p>Search: <input id="q" value="' OR '1'='1">
<button onclick="search('vulnerable')">Search (Vulnerable)</button>
<button onclick="search('fixed')" style="background:#1f6feb">Search (Fixed)</button></p>
<div id="out"></div>
<script>
async function search(mode) {
  const q = document.getElementById('q').value;
  const r = await fetch('/a05/'+mode+'/search?q='+encodeURIComponent(q));
  const j = await r.json();
  document.getElementById('out').innerHTML =
    '<p>Mode: <strong>'+mode+'</strong> — '+( j.results ? j.results.length : 0 )+' result(s)</p>' +
    (j.query ? '<p>SQL: <code>'+j.query+'</code></p>' : '') +
    '<pre>'+JSON.stringify(j,null,2)+'</pre>';
}
</script></body></html>`);
  });

  router.get('/vulnerable/search', (req, res) => {
    const q = req.query.q || '';
    const sql = `SELECT * FROM products WHERE name LIKE '%${q}%'`;
    try {
      const results = db.prepare(sql).all();
      res.json({ query: sql, results });
    } catch (err) {
      res.status(500).json({ error: err.message, query: sql });
    }
  });

  router.get('/fixed/search', (req, res) => {
    const q = req.query.q || '';
    const results = db.prepare(
      'SELECT id, name, price FROM products WHERE name LIKE ?'
    ).all(`%${q}%`);
    res.json({ results });
  });

  return router;
};
```

- [ ] **Step 4: Run — verify PASS**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a05
```

- [ ] **Step 5: Commit**

```bash
git add vulnerable-app/routes/a05-injection.js vulnerable-app/tests/a05.test.js
git commit -m "feat: A05 SQL injection route and tests"
```

---

## Task 12: A06 — Insecure Design

**Files:**
- Create: `vulnerable-app/routes/a06-insecure-design.js`
- Create: `vulnerable-app/tests/a06.test.js`

- [ ] **Step 1: Write failing test**

```js
// vulnerable-app/tests/a06.test.js
const request = require('supertest');
const express = require('express');
const { makeTestDb } = require('./setup');
const makeRouter = require('../routes/a06-insecure-design');

function makeApp(db) {
  const app = express();
  app.use(express.json());
  app.use('/a06', makeRouter(db));
  return app;
}

let app, db;
beforeEach(() => { db = makeTestDb(); app = makeApp(db); });

test('vulnerable: same coupon can be applied multiple times', async () => {
  await request(app).post('/a06/vulnerable/apply-coupon').send({ orderId: 1, code: 'SAVE10' });
  const res = await request(app).post('/a06/vulnerable/apply-coupon').send({ orderId: 1, code: 'SAVE10' });
  expect(res.status).toBe(200); // second use succeeds — the bug
  const order = db.prepare('SELECT discount FROM orders WHERE id=1').get();
  expect(order.discount).toBe(20); // applied twice
});

test('fixed: coupon can only be applied once', async () => {
  await request(app).post('/a06/fixed/apply-coupon').send({ orderId: 1, code: 'SAVE10' });
  const res = await request(app).post('/a06/fixed/apply-coupon').send({ orderId: 1, code: 'SAVE10' });
  expect(res.status).toBe(400);
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a06
```

- [ ] **Step 3: Create vulnerable-app/routes/a06-insecure-design.js**

```js
const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>A06 Demo</title>
<style>body{font-family:monospace;background:#0d1117;color:#e6edf3;padding:24px}
h1{color:#da3633}button{background:#238636;color:#fff;border:none;padding:8px 16px;
cursor:pointer;border-radius:4px;margin:4px}
pre{background:#161b22;padding:12px;border-radius:4px;margin-top:12px}</style></head>
<body>
<h1>A06 — Insecure Design (Coupon Abuse)</h1>
<p>Order #1 | Coupon: SAVE10 (10% off, max 1 use)</p>
<button onclick="apply('vulnerable')">Apply SAVE10 (Vulnerable)</button>
<button onclick="apply('fixed')" style="background:#1f6feb">Apply SAVE10 (Fixed)</button>
<button onclick="getOrder()">Check Order Total</button>
<div id="out"></div>
<script>
async function apply(mode) {
  const r = await fetch('/a06/'+mode+'/apply-coupon', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({orderId:1, code:'SAVE10'})
  });
  const j = await r.json();
  document.getElementById('out').innerHTML = '<p>Status: '+r.status+'</p><pre>'+JSON.stringify(j,null,2)+'</pre>';
}
async function getOrder() {
  const r = await fetch('/a06/order/1');
  const j = await r.json();
  document.getElementById('out').innerHTML = '<pre>'+JSON.stringify(j,null,2)+'</pre>';
}
</script></body></html>`);
  });

  router.get('/order/:id', (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
    res.json(order || { error: 'Not found' });
  });

  router.post('/vulnerable/apply-coupon', (req, res) => {
    const { orderId, code } = req.body;
    const coupon = db.prepare('SELECT * FROM coupons WHERE code=?').get(code);
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon' });
    db.prepare('UPDATE orders SET discount=discount+? WHERE id=?').run(coupon.discount_percent, orderId);
    res.json({ applied: coupon.discount_percent });
  });

  router.post('/fixed/apply-coupon', (req, res) => {
    const { orderId, code } = req.body;
    const coupon = db.prepare('SELECT * FROM coupons WHERE code=?').get(code);
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon' });
    if (coupon.times_used >= coupon.max_uses)
      return res.status(400).json({ error: 'Coupon has expired' });
    const used = db.prepare(
      'SELECT 1 FROM coupon_usages WHERE order_id=? AND coupon_id=?'
    ).get(orderId, coupon.id);
    if (used) return res.status(400).json({ error: 'Already applied to this order' });
    db.prepare('UPDATE coupons SET times_used=times_used+1 WHERE id=?').run(coupon.id);
    db.prepare('INSERT INTO coupon_usages VALUES (?,?)').run(orderId, coupon.id);
    db.prepare('UPDATE orders SET discount=discount+? WHERE id=?').run(coupon.discount_percent, orderId);
    res.json({ applied: coupon.discount_percent });
  });

  return router;
};
```

- [ ] **Step 4: Run — verify PASS**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a06
```

- [ ] **Step 5: Commit**

```bash
git add vulnerable-app/routes/a06-insecure-design.js vulnerable-app/tests/a06.test.js
git commit -m "feat: A06 insecure design route and tests"
```

---

## Task 13: A07 — Authentication Failures

**Files:**
- Create: `vulnerable-app/routes/a07-auth-failures.js`
- Create: `vulnerable-app/tests/a07.test.js`

- [ ] **Step 1: Write failing test**

```js
// vulnerable-app/tests/a07.test.js
const request = require('supertest');
const express = require('express');
const { makeTestDb } = require('./setup');
const makeRouter = require('../routes/a07-auth-failures');

function makeApp(db) {
  const app = express();
  app.use(express.json());
  app.set('trust proxy', 1);
  app.use('/a07', makeRouter(db));
  return app;
}

let app, db;
beforeEach(() => { db = makeTestDb(); app = makeApp(db); });

test('vulnerable: valid login succeeds', async () => {
  const res = await request(app).post('/a07/vulnerable/login')
    .send({ username: 'alice', password: 'password123' });
  expect(res.status).toBe(200);
});

test('vulnerable: invalid login returns 401', async () => {
  const res = await request(app).post('/a07/vulnerable/login')
    .send({ username: 'alice', password: 'wrong' });
  expect(res.status).toBe(401);
});

test('vulnerable: allows 10 rapid attempts without lockout', async () => {
  const attempts = Array.from({ length: 10 }, () =>
    request(app).post('/a07/vulnerable/login').send({ username: 'alice', password: 'wrong' })
  );
  const results = await Promise.all(attempts);
  const blocked = results.filter(r => r.status === 429);
  expect(blocked.length).toBe(0); // vulnerable — never blocked
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a07
```

- [ ] **Step 3: Create vulnerable-app/routes/a07-auth-failures.js**

```js
const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const md5 = s => crypto.createHash('md5').update(s).digest('hex');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>A07 Demo</title>
<style>body{font-family:monospace;background:#0d1117;color:#e6edf3;padding:24px}
h1{color:#e36209}button{background:#238636;color:#fff;border:none;padding:8px 16px;
cursor:pointer;border-radius:4px;margin:4px}
pre{background:#161b22;padding:12px;border-radius:4px;margin-top:12px;max-height:300px;overflow:auto}</style></head>
<body>
<h1>A07 — Authentication Failures</h1>
<p>Simulate a brute-force attack: send 10 login attempts rapidly.</p>
<button onclick="bruteForce('vulnerable')">Brute Force (Vulnerable)</button>
<button onclick="bruteForce('fixed')" style="background:#1f6feb">Brute Force (Fixed)</button>
<div id="out"></div>
<script>
async function bruteForce(mode) {
  const passwords = ['wrong1','wrong2','wrong3','wrong4','wrong5','wrong6','wrong7','wrong8','wrong9','password123'];
  const results = [];
  for (const p of passwords) {
    const r = await fetch('/a07/'+mode+'/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username:'alice', password:p})
    });
    results.push({ password: p, status: r.status, body: await r.json() });
  }
  document.getElementById('out').innerHTML = '<p>Mode: <strong>'+mode+'</strong></p><pre>'+JSON.stringify(results,null,2)+'</pre>';
}
</script></body></html>`);
  });

  router.post('/vulnerable/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare(
      'SELECT * FROM users WHERE username=? AND password_md5=?'
    ).get(username, md5(password));
    if (user) res.json({ success: true, userId: user.id });
    else res.status(401).json({ error: 'Invalid credentials' });
  });

  router.post('/fixed/login', loginLimiter, (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare(
      'SELECT * FROM users WHERE username=? AND password_md5=?'
    ).get(username, md5(password));
    if (user) res.json({ success: true, userId: user.id });
    else res.status(401).json({ error: 'Invalid credentials' });
  });

  return router;
};
```

- [ ] **Step 4: Run — verify PASS**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a07
```

- [ ] **Step 5: Commit**

```bash
git add vulnerable-app/routes/a07-auth-failures.js vulnerable-app/tests/a07.test.js
git commit -m "feat: A07 authentication failures route and tests"
```

---

## Task 14: A08 — Integrity Failures

**Files:**
- Create: `vulnerable-app/routes/a08-integrity.js`
- Create: `vulnerable-app/tests/a08.test.js`

- [ ] **Step 1: Write failing test**

```js
// vulnerable-app/tests/a08.test.js
const request = require('supertest');
const express = require('express');
const makeRouter = require('../routes/a08-integrity');

const app = express();
app.use(express.json());
app.use('/a08', makeRouter());

test('vulnerable: eval executes arbitrary JS', async () => {
  const res = await request(app).post('/a08/vulnerable/calculate')
    .send({ formula: '2 + 2' });
  expect(res.body.result).toBe('4');
});

test('vulnerable: eval executes non-math expression', async () => {
  const res = await request(app).post('/a08/vulnerable/calculate')
    .send({ formula: "'hello ' + 'world'" });
  expect(res.status).toBe(200);
  expect(res.body.result).toBe('hello world'); // executed arbitrary string ops
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
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a08
```

- [ ] **Step 3: Create vulnerable-app/routes/a08-integrity.js**

```js
const express = require('express');

module.exports = function () {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>A08 Demo</title>
<style>body{font-family:monospace;background:#0d1117;color:#e6edf3;padding:24px}
h1{color:#8957e5}button{background:#238636;color:#fff;border:none;padding:8px 16px;
cursor:pointer;border-radius:4px;margin:4px}input{background:#21262d;color:#e6edf3;
border:1px solid #30363d;padding:6px;border-radius:4px;width:340px}
pre{background:#161b22;padding:12px;border-radius:4px;margin-top:12px}</style></head>
<body>
<h1>A08 — Integrity Failures (eval injection)</h1>
<p>Formula: <input id="f" value="require('fs').readdirSync('.').join(', ')"></p>
<button onclick="calc('vulnerable')">Calculate (Vulnerable)</button>
<button onclick="calc('fixed')" style="background:#1f6feb">Calculate (Fixed)</button>
<p style="color:#8b949e">Try also: <code>2+2</code> | <code>process.env.NODE_ENV</code> | <code>Date.now()</code></p>
<div id="out"></div>
<script>
async function calc(mode) {
  const r = await fetch('/a08/'+mode+'/calculate', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({formula: document.getElementById('f').value})
  });
  const j = await r.json();
  document.getElementById('out').innerHTML = '<p>Status: '+r.status+'</p><pre>'+JSON.stringify(j,null,2)+'</pre>';
}
</script></body></html>`);
  });

  router.post('/vulnerable/calculate', (req, res) => {
    const { formula } = req.body;
    try {
      /* eslint-disable no-eval */
      const result = eval(formula);
      res.json({ result: String(result) });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/fixed/calculate', (req, res) => {
    const { formula } = req.body;
    if (!/^[\d\s+\-*/().]+$/.test(formula)) {
      return res.status(400).json({
        error: 'Invalid formula. Only digits and + - * / ( ) allowed.',
      });
    }
    try {
      /* eslint-disable no-eval */
      const result = eval(formula);
      res.json({ result });
    } catch (err) {
      res.status(400).json({ error: 'Invalid expression' });
    }
  });

  return router;
};
```

- [ ] **Step 4: Run — verify PASS**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a08
```

- [ ] **Step 5: Commit**

```bash
git add vulnerable-app/routes/a08-integrity.js vulnerable-app/tests/a08.test.js
git commit -m "feat: A08 integrity failures route and tests"
```

---

## Task 15: A09 — Logging Failures

**Files:**
- Create: `vulnerable-app/routes/a09-logging.js`
- Create: `vulnerable-app/tests/a09.test.js`

- [ ] **Step 1: Write failing test**

```js
// vulnerable-app/tests/a09.test.js
const request = require('supertest');
const express = require('express');
const { makeTestDb } = require('./setup');
const makeRouter = require('../routes/a09-logging');

function makeApp(db) {
  const app = express();
  app.use(express.json());
  app.use('/a09', makeRouter(db));
  return app;
}

let app, db;
beforeEach(() => { db = makeTestDb(); app = makeApp(db); });

test('vulnerable: transfer leaves no audit log', async () => {
  await request(app).post('/a09/vulnerable/transfer')
    .send({ fromId: 1, toId: 2, amount: 100 });
  const logs = db.prepare('SELECT * FROM audit_log').all();
  expect(logs.length).toBe(0);
});

test('fixed: successful transfer writes to audit log', async () => {
  await request(app).post('/a09/fixed/transfer')
    .send({ fromId: 1, toId: 2, amount: 100 });
  const logs = db.prepare('SELECT * FROM audit_log').all();
  expect(logs.length).toBe(1);
  expect(logs[0].action).toBe('TRANSFER_OK');
});

test('fixed: failed transfer also writes to audit log', async () => {
  await request(app).post('/a09/fixed/transfer')
    .send({ fromId: 1, toId: 2, amount: 9999 });
  const logs = db.prepare('SELECT * FROM audit_log').all();
  expect(logs.length).toBe(1);
  expect(logs[0].action).toBe('TRANSFER_FAILED');
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a09
```

- [ ] **Step 3: Create vulnerable-app/routes/a09-logging.js**

```js
const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  const log = (action, userId, details) =>
    db.prepare(
      'INSERT INTO audit_log (timestamp, action, user_id, details) VALUES (?,?,?,?)'
    ).run(new Date().toISOString(), action, userId, details);

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>A09 Demo</title>
<style>body{font-family:monospace;background:#0d1117;color:#e6edf3;padding:24px}
h1{color:#388bfd}button{background:#238636;color:#fff;border:none;padding:8px 16px;
cursor:pointer;border-radius:4px;margin:4px}
pre{background:#161b22;padding:12px;border-radius:4px;margin-top:12px;max-height:300px;overflow:auto}</style></head>
<body>
<h1>A09 — Security Logging Failures</h1>
<p>Transfer $100 from account 1 to account 2.</p>
<button onclick="transfer('vulnerable')">Transfer (Vulnerable)</button>
<button onclick="transfer('fixed')" style="background:#1f6feb">Transfer (Fixed)</button>
<button onclick="showLog()">Show Audit Log</button>
<div id="out"></div>
<script>
async function transfer(mode) {
  const r = await fetch('/a09/'+mode+'/transfer', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({fromId:1, toId:2, amount:100})
  });
  const j = await r.json();
  document.getElementById('out').innerHTML = '<p>Status: '+r.status+'</p><pre>'+JSON.stringify(j,null,2)+'</pre>';
}
async function showLog() {
  const r = await fetch('/a09/audit-log');
  const j = await r.json();
  document.getElementById('out').innerHTML = '<p><strong>Audit Log ('+j.logs.length+' entries)</strong></p><pre>'+JSON.stringify(j,null,2)+'</pre>';
}
</script></body></html>`);
  });

  router.post('/vulnerable/transfer', (req, res) => {
    const { fromId, toId, amount } = req.body;
    const from = db.prepare('SELECT * FROM accounts WHERE id=?').get(fromId);
    if (!from || from.balance < amount)
      return res.status(400).json({ error: 'Insufficient funds' });
    db.prepare('UPDATE accounts SET balance=balance-? WHERE id=?').run(amount, fromId);
    db.prepare('UPDATE accounts SET balance=balance+? WHERE id=?').run(amount, toId);
    res.json({ success: true });
  });

  router.post('/fixed/transfer', (req, res) => {
    const { fromId, toId, amount } = req.body;
    const from = db.prepare('SELECT * FROM accounts WHERE id=?').get(fromId);
    if (!from || from.balance < amount) {
      log('TRANSFER_FAILED', fromId, `Insufficient funds: tried $${amount}`);
      return res.status(400).json({ error: 'Insufficient funds' });
    }
    db.prepare('UPDATE accounts SET balance=balance-? WHERE id=?').run(amount, fromId);
    db.prepare('UPDATE accounts SET balance=balance+? WHERE id=?').run(amount, toId);
    log('TRANSFER_OK', fromId, `Transferred $${amount} to account ${toId}`);
    res.json({ success: true });
  });

  router.get('/audit-log', (req, res) => {
    const logs = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 50').all();
    res.json({ logs });
  });

  return router;
};
```

- [ ] **Step 4: Run — verify PASS**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a09
```

- [ ] **Step 5: Commit**

```bash
git add vulnerable-app/routes/a09-logging.js vulnerable-app/tests/a09.test.js
git commit -m "feat: A09 logging failures route and tests"
```

---

## Task 16: A10 — Error Handling

**Files:**
- Create: `vulnerable-app/routes/a10-error-handling.js`
- Create: `vulnerable-app/tests/a10.test.js`

- [ ] **Step 1: Write failing test**

```js
// vulnerable-app/tests/a10.test.js
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
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a10
```

- [ ] **Step 3: Create vulnerable-app/routes/a10-error-handling.js**

```js
const express = require('express');

module.exports = function () {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>A10 Demo</title>
<style>body{font-family:monospace;background:#0d1117;color:#e6edf3;padding:24px}
h1{color:#3fb950}button{background:#238636;color:#fff;border:none;padding:8px 16px;
cursor:pointer;border-radius:4px;margin:4px}input{background:#21262d;color:#e6edf3;
border:1px solid #30363d;padding:6px;border-radius:4px;width:200px}
pre{background:#161b22;padding:12px;border-radius:4px;margin-top:12px}</style></head>
<body>
<h1>A10 — Mishandling of Exceptional Conditions</h1>
<p>Submit a short (invalid) token and see if you get in.</p>
<p>Token: <input id="t" value="bad">
<button onclick="access('vulnerable')">Access (Vulnerable)</button>
<button onclick="access('fixed')" style="background:#1f6feb">Access (Fixed)</button></p>
<p style="color:#8b949e">Try a short token like "bad" (triggers error) and a long one like "validtoken1234567890"</p>
<div id="out"></div>
<script>
async function access(mode) {
  const r = await fetch('/a10/'+mode+'/access', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({token: document.getElementById('t').value})
  });
  const j = await r.json();
  document.getElementById('out').innerHTML = '<p>Status: '+r.status+'</p><pre>'+JSON.stringify(j,null,2)+'</pre>';
}
</script></body></html>`);
  });

  router.post('/vulnerable/access', (req, res) => {
    const { token } = req.body;
    let authorized = false;

    try {
      if (!token || token.length < 20)
        throw new Error('Auth service unavailable');
      authorized = true;
    } catch (err) {
      // ⚠ Error swallowed — authorized stays false but response below is always success
      console.error('Auth error:', err.message);
    }

    // BUG: responds with success regardless of authorized
    res.json({ access: 'granted', note: 'Auth error was swallowed — fail-open!' });
  });

  router.post('/fixed/access', (req, res) => {
    const { token } = req.body;
    try {
      if (!token || token.length < 20)
        throw new Error('Auth service unavailable');
      res.json({ access: 'granted' });
    } catch (err) {
      // ✅ Fail closed — any auth error → deny
      console.error('Auth error:', err.message);
      res.status(503).json({ error: 'Authentication service unavailable. Access denied.' });
    }
  });

  return router;
};
```

- [ ] **Step 4: Run — verify PASS**

```bash
npm test --workspace=vulnerable-app -- --testPathPattern=a10
```

- [ ] **Step 5: Commit**

```bash
git add vulnerable-app/routes/a10-error-handling.js vulnerable-app/tests/a10.test.js
git commit -m "feat: A10 error handling route and tests"
```

---

## Task 17: Full test suite + README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: all 10 test files pass, 0 failures.

- [ ] **Step 2: Smoke-test the full app**

```bash
npm start
```

Open http://localhost:3000 — sidebar should show 10 items. Click A01 → Explain tab should render. Click Live Demo tab → link to http://localhost:4000/a01. Open http://localhost:4000/a01 — demo page loads and buttons work.

- [ ] **Step 3: Create README.md**

```markdown
# OWASP Top 10 (2026) Teaching Tool

Interactive classroom demo covering all 10 OWASP 2026 vulnerabilities.
Each vulnerability has an explanation slide, vulnerable code, fixed code, and a live exploitable demo.

## Quick start

\`\`\`bash
npm install
npm start
\`\`\`

| Service | URL | Purpose |
|---|---|---|
| Presentation | http://localhost:3000 | Sidebar dashboard for teaching |
| Vulnerable app | http://localhost:4000 | Live exploitable endpoints |

## Running tests

\`\`\`bash
npm test
\`\`\`

## Vulnerabilities covered

| Code | Name |
|---|---|
| A01 | Broken Access Control |
| A02 | Security Misconfiguration |
| A03 | Software Supply Chain Failures |
| A04 | Cryptographic Failures |
| A05 | Injection |
| A06 | Insecure Design |
| A07 | Identification & Authentication Failures |
| A08 | Software & Data Integrity Failures |
| A09 | Security Logging & Monitoring Failures |
| A10 | Mishandling of Exceptional Conditions |

> ⚠ This app contains intentionally vulnerable code. Run on localhost only. Never expose port 4000 to a network.
```

- [ ] **Step 4: Final commit**

```bash
git add README.md
git commit -m "feat: README and full project complete"
```
