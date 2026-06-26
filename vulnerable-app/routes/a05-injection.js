const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A05 — Injection</title>
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
    <a class="demo-nav-pill active" style="background:#f85149" href="/a05">A05</a>
    <a class="demo-nav-pill" style="background:#da3633" href="/a06">A06</a>
    <a class="demo-nav-pill" style="background:#e36209" href="/a07">A07</a>
    <a class="demo-nav-pill" style="background:#8957e5" href="/a08">A08</a>
    <a class="demo-nav-pill" style="background:#388bfd" href="/a09">A09</a>
    <a class="demo-nav-pill" style="background:#3fb950" href="/a10">A10</a>
  </div>
</nav>
<div class="page">
  <div class="demo-header" style="--color:#f85149">
    <span class="demo-badge" style="background:#f85149">A05</span>
    <span class="demo-title">Injection</span>
  </div>
  <div class="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>
  <div class="demo-section">
    <div class="demo-section-label">Live Demo — search the product catalogue</div>
    <div class="controls">
      <input class="input" id="q" value="' OR '1'='1" placeholder="Search" style="width:220px">
      <button class="btn btn-vuln" onclick="search('vulnerable')">Search (Vulnerable)</button>
      <button class="btn btn-fixed" onclick="search('fixed')">Search (Fixed)</button>
      <button class="btn btn-reset" onclick="resetDemo()">🔄 Reset Demo</button>
    </div>
    <div class="output" id="out">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
fetch('/slides/a05.json').then(r=>r.json()).then(s=>{
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
async function search(endpoint){
  const q=encodeURIComponent(document.getElementById('q').value);
  const r=await fetch('/a05/'+endpoint+'/search?q='+q);
  const j=await r.json();
  showOutput(r.status,j);
}
</script>
</body>
</html>`);
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
