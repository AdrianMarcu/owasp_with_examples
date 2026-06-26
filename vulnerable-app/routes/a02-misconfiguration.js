const express = require('express');

module.exports = function () {
  const router = express.Router();

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
