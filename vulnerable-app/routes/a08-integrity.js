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
<button onclick="resetDemo()" style="background:#6e40c9">🔄 Reset Demo</button>
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
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
}
</script></body></html>`);
  });

  router.post('/vulnerable/calculate', (req, res) => {
    const { formula } = req.body;
    try {
      // eslint-disable-next-line no-eval
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
      // eslint-disable-next-line no-eval
      const result = eval(formula);
      res.json({ result });
    } catch (err) {
      res.status(400).json({ error: 'Invalid expression' });
    }
  });

  return router;
};
