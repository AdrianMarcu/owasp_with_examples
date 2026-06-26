const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const md5 = s => crypto.createHash('md5').update(s).digest('hex');

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A04 — Cryptographic Failures</title>
  <link rel="stylesheet" href="/demo.css">
</head>
<body>
<div class="page">
  <div class="demo-header" style="--color:#1f6feb">
    <span class="demo-badge" style="background:#1f6feb">A04</span>
    <span class="demo-title">Cryptographic Failures</span>
  </div>
  <div class="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>
  <div class="demo-section">
    <div class="demo-section-label">Live Demo — register and compare what the server stores</div>
    <div class="controls">
      <input class="input" id="u" value="testuser" placeholder="Username" style="width:120px">
      <input class="input" id="p" value="password123" type="password" placeholder="Password" style="width:120px">
      <button class="btn btn-vuln" onclick="register('vulnerable')">Register (Vulnerable MD5)</button>
      <button class="btn btn-fixed" onclick="register('fixed')">Register (Fixed bcrypt)</button>
      <button class="btn btn-reset" onclick="resetDemo()">🔄 Reset Demo</button>
    </div>
    <div class="output" id="out">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
fetch('/slides/a04.json').then(r=>r.json()).then(s=>{
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
async function register(endpoint){
  const r=await fetch('/a04/'+endpoint+'/register',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username:document.getElementById('u').value+'_'+Date.now(),password:document.getElementById('p').value})
  });
  const j=await r.json();
  showOutput(r.status,j);
}
</script>
</body>
</html>`);
  });

  router.post('/vulnerable/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    const hash = md5(password);
    try {
      db.prepare('INSERT INTO users (username, password_md5) VALUES (?, ?)').run(username, hash);
      res.status(201).json({ stored_hash: hash, algorithm: 'MD5' });
    } catch {
      res.status(409).json({ error: 'Username taken' });
    }
  });

  router.post('/vulnerable/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare(
      'SELECT * FROM users WHERE username=? AND password_md5=?'
    ).get(username, md5(password));
    if (user) res.json({ success: true, userId: user.id });
    else res.status(401).json({ error: 'Invalid credentials' });
  });

  router.post('/fixed/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    const hash = await bcrypt.hash(password, 12);
    try {
      db.prepare('INSERT INTO users (username, password_bcrypt) VALUES (?, ?)').run(username, hash);
      res.status(201).json({ algorithm: 'bcrypt (cost 12)', note: 'Hash not exposed to client' });
    } catch {
      res.status(409).json({ error: 'Username taken' });
    }
  });

  router.post('/fixed/login', async (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
    if (!user || !user.password_bcrypt) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password_bcrypt);
    if (match) res.json({ success: true });
    else res.status(401).json({ error: 'Invalid credentials' });
  });

  return router;
};
