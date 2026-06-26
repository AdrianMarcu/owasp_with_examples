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
<button onclick="resetDemo()" style="background:#6e40c9">🔄 Reset Demo</button>
<div id="out"></div>
<script>
async function hit(url, mode) {
  const r = await fetch(url);
  const j = await r.json();
  document.getElementById('out').innerHTML =
    '<p>Mode: <strong>'+mode+'</strong> | Status: '+r.status+'</p><pre>'+JSON.stringify(j,null,2)+'</pre>';
}
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
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
