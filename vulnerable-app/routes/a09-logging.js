const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  const log = (action, userId, details) =>
    db.prepare(
      'INSERT INTO audit_log (timestamp, action, user_id, details) VALUES (?,?,?,?)'
    ).run(new Date().toISOString(), action, userId, details);

  router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A09 — Security Logging Failures</title>
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
    <a class="demo-nav-pill" style="background:#8957e5" href="/a08">A08</a>
    <a class="demo-nav-pill active" style="background:#388bfd" href="/a09">A09</a>
    <a class="demo-nav-pill" style="background:#3fb950" href="/a10">A10</a>
  </div>
</nav>
<div class="page">
  <div class="demo-header" style="--color:#388bfd">
    <span class="demo-badge" style="background:#388bfd">A09</span>
    <span class="demo-title">Security Logging Failures</span>
  </div>
  <div class="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>
  <div class="demo-section">
    <div class="demo-section-label">Live Demo — transfer $100 from account 1 to account 2</div>
    <div class="controls">
      <button class="btn btn-vuln" onclick="transfer('vulnerable')">Transfer (Vulnerable)</button>
      <button class="btn btn-fixed" onclick="transfer('fixed')">Transfer (Fixed)</button>
      <button class="btn" style="background:#388bfd" onclick="showLog()">Show Audit Log</button>
      <button class="btn btn-reset" onclick="resetDemo()">🔄 Reset Demo</button>
    </div>
    <div class="output" id="out">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
fetch('/slides/a09.json').then(r=>r.json()).then(s=>{
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
async function transfer(endpoint){
  const r=await fetch('/a09/'+endpoint+'/transfer',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({fromId:1,toId:2,amount:100})
  });
  const j=await r.json();
  showOutput(r.status,j);
}
async function showLog(){
  const r=await fetch('/a09/audit-log');
  const j=await r.json();
  showOutput(r.status,j);
}
</script>
</body>
</html>`);
  });

  router.post('/vulnerable/transfer', (req, res) => {
    const { fromId, toId, amount } = req.body;
    const from = db.prepare('SELECT * FROM accounts WHERE id=?').get(fromId);
    if (!from || from.balance < amount)
      return res.status(400).json({ error: 'Insufficient funds' });
    db.prepare('UPDATE accounts SET balance=balance-? WHERE id=?').run(amount, fromId);
    db.prepare('UPDATE accounts SET balance=balance+? WHERE id=?').run(amount, toId);
    res.json({ success: true });
  });

  router.post('/fixed/transfer', (req, res) => {
    const { fromId, toId, amount } = req.body;
    const from = db.prepare('SELECT * FROM accounts WHERE id=?').get(fromId);
    if (!from || from.balance < amount) {
      log('TRANSFER_FAILED', fromId, `Insufficient funds: tried $${amount}`);
      return res.status(400).json({ error: 'Insufficient funds' });
    }
    db.prepare('UPDATE accounts SET balance=balance-? WHERE id=?').run(amount, fromId);
    db.prepare('UPDATE accounts SET balance=balance+? WHERE id=?').run(amount, toId);
    log('TRANSFER_OK', fromId, `Transferred $${amount} to account ${toId}`);
    res.json({ success: true });
  });

  router.get('/audit-log', (req, res) => {
    const logs = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 50').all();
    res.json({ logs });
  });

  return router;
};
