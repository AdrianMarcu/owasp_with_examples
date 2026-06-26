const express = require('express');

module.exports = function () {
  const router = express.Router();

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
    <a class="demo-nav-pill active" style="background:#8957e5" href="/a08">A08</a>
    <a class="demo-nav-pill" style="background:#388bfd" href="/a09">A09</a>
    <a class="demo-nav-pill" style="background:#3fb950" href="/a10">A10</a>
  </div>
</nav>
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
