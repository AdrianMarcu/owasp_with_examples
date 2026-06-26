const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A01 — Broken Access Control</title>
  <link rel="stylesheet" href="/demo.css">
</head>
<body>
<div class="page">
  <div class="demo-header" style="--color:#f85149">
    <span class="demo-badge" style="background:#f85149">A01</span>
    <span class="demo-title">Broken Access Control</span>
  </div>
  <div class="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>
  <div class="demo-section">
    <div class="demo-section-label">Live Demo — you are Alice (user 1), your invoice is #1</div>
    <div class="controls">
      <label style="color:#8b949e;font-size:13px">Invoice ID:</label>
      <input class="input" id="iid" value="1" style="width:60px">
      <button class="btn btn-vuln" onclick="fetchInvoice('vulnerable')">Vulnerable</button>
      <button class="btn btn-fixed" onclick="fetchInvoice('fixed')">Fixed</button>
      <button class="btn btn-reset" onclick="resetDemo()">🔄 Reset Demo</button>
    </div>
    <div class="output" id="out">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
fetch('/slides/a01.json').then(r=>r.json()).then(s=>{
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
async function fetchInvoice(endpoint){
  const id=document.getElementById('iid').value;
  const r=await fetch('/a01/'+endpoint+'/invoice/'+id,{headers:{'x-user-id':'1'}});
  const j=await r.json();
  showOutput(r.status,j);
}
</script>
</body>
</html>`);
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
