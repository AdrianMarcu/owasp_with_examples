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
<button onclick="resetDemo()" style="background:#6e40c9">🔄 Reset Demo</button>
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
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
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
