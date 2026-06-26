const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A12</title>
  <link rel="stylesheet" href="/demo.css">
</head>
<body>
<nav class="demo-nav">
  <a class="demo-nav-home" href="http://localhost:3000">← Dashboard</a>
  <div class="demo-nav-pills">
    <a class="demo-nav-pill" style="background:#f85149" href="/a01">A01</a>
    <a class="demo-nav-pill" style="background:#d29922" href="/a02">A02</a>
    <a class="demo-nav-pill" style="background:#8957e5" href="/a03">A03</a>
    <a class="demo-nav-pill" style="background:#1f6feb" href="/a04">A04</a>
    <a class="demo-nav-pill" style="background:#f85149" href="/a05">A05</a>
    <a class="demo-nav-pill" style="background:#da3633" href="/a06">A06</a>
    <a class="demo-nav-pill" style="background:#e36209" href="/a07">A07</a>
    <a class="demo-nav-pill" style="background:#8957e5" href="/a08">A08</a>
    <a class="demo-nav-pill" style="background:#388bfd" href="/a09">A09</a>
    <a class="demo-nav-pill" style="background:#3fb950" href="/a10">A10</a>
    <a class="demo-nav-pill" style="background:#bc8cff" href="/a11">A11</a>
    <a class="demo-nav-pill active" style="background:#f0883e" href="/a12">A12</a>
  </div>
</nav>
<div class="page">
  <div class="demo-header" style="--color:#f0883e">
    <span class="demo-badge" style="background:#f0883e">A12</span>
    <span class="demo-title">Product Search</span>
  </div>

  <div class="demo-section">
    <div class="demo-section-label">Live Demo</div>
    <div class="controls">
      <input class="input" id="q" placeholder="Filter" style="width:220px">
      <button class="btn btn-vuln" onclick="save()">Save</button>
      <button class="btn btn-vuln" onclick="run('vulnerable')">Run</button>
      <button class="btn btn-fixed" onclick="run('fixed')">Run (Fixed)</button>
      <button class="btn btn-reset" onclick="resetDemo()">↺ Reset Demo</button>
    </div>
    <div class="output" id="out">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
function showOutput(status, data) {
  const out = document.getElementById('out');
  const badge = document.getElementById('status-badge');
  const body = document.getElementById('output-body');
  const ok = status >= 200 && status < 300;
  badge.textContent = status + ' ' + (ok ? '✓' : '✗');
  badge.className = 'status-badge ' + (ok ? 'ok' : 'err');
  body.textContent = JSON.stringify(data, null, 2);
  out.style.display = 'block';
}

async function save() {
  const q = document.getElementById('q').value;
  const r = await fetch('/a12/vulnerable/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': '1' },
    body: JSON.stringify({ q })
  });
  showOutput(r.status, await r.json());
}

async function run(mode) {
  const r = await fetch('/a12/' + mode + '/run', {
    headers: { 'x-user-id': '1' }
  });
  showOutput(r.status, await r.json());
}

async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').style.display = 'none';
  document.getElementById('q').value = '';
}
</script>
</body>
</html>`);
  });

  // ── Vulnerable ─────────────────────────────────────────────────────────────
  router.post('/vulnerable/save', (req, res) => {
    const userId = parseInt(req.headers['x-user-id']) || 1;
    const { q } = req.body;
    if (!q) return res.status(400).json({ error: 'Missing q' });
    db.prepare('INSERT OR REPLACE INTO saved_searches (user_id, query) VALUES (?, ?)')
      .run(userId, q);
    res.json({ saved: true });
  });

  router.get('/vulnerable/run', (req, res) => {
    const userId = parseInt(req.headers['x-user-id']) || 1;
    const saved = db.prepare('SELECT query FROM saved_searches WHERE user_id = ?').get(userId);
    if (!saved) return res.status(404).json({ error: 'No saved filter' });

    try {
      const results = db.prepare(
        `SELECT id, name, price FROM products WHERE name LIKE '%${saved.query}%'`
      ).all();
      res.json({ results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Fixed ───────────────────────────────────────────────────────────────────
  router.post('/fixed/save', (req, res) => {
    const userId = parseInt(req.headers['x-user-id']) || 1;
    const { q } = req.body;
    if (!q) return res.status(400).json({ error: 'Missing q' });
    db.prepare('INSERT OR REPLACE INTO saved_searches (user_id, query) VALUES (?, ?)')
      .run(userId, q);
    res.json({ saved: true });
  });

  router.get('/fixed/run', (req, res) => {
    const userId = parseInt(req.headers['x-user-id']) || 1;
    const saved = db.prepare('SELECT query FROM saved_searches WHERE user_id = ?').get(userId);
    if (!saved) return res.status(404).json({ error: 'No saved filter' });

    const results = db.prepare(
      'SELECT id, name, price FROM products WHERE name LIKE ?'
    ).all(`%${saved.query}%`);
    res.json({ results });
  });

  return router;
};
