const express = require('express');
const fs = require('fs');
const path = require('path');
const analytics = require('../packages/evil-analytics');

const EXFIL = path.join(__dirname, '../exfil.log');

module.exports = function () {
  const router = express.Router();

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
