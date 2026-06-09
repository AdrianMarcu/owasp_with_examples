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
