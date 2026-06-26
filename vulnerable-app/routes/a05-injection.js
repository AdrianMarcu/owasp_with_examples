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
<button onclick="search('fixed')" style="background:#1f6feb">Search (Fixed)</button>
<button onclick="resetDemo()" style="background:#6e40c9">🔄 Reset Demo</button></p>
<div id="out"></div>
<script>
async function search(mode) {
  const q = document.getElementById('q').value;
  const r = await fetch('/a05/'+mode+'/search?q='+encodeURIComponent(q));
  const j = await r.json();
  document.getElementById('out').innerHTML =
    '<p>Mode: <strong>'+mode+'</strong> — '+(j.results ? j.results.length : 0)+' result(s)</p>' +
    (j.query ? '<p>SQL: <code>'+j.query+'</code></p>' : '') +
    '<pre>'+JSON.stringify(j,null,2)+'</pre>';
}
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
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
