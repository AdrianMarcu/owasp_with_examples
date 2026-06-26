const express = require('express');
const crypto = require('crypto');
const { rateLimit, MemoryStore } = require('express-rate-limit');

const md5 = s => crypto.createHash('md5').update(s).digest('hex');

const rateLimitStore = new MemoryStore();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  store: rateLimitStore,
});

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A07 — Authentication Failures</title>
  <link rel="stylesheet" href="/demo.css">
</head>
<body>
<div class="page">
  <div class="demo-header" style="--color:#e36209">
    <span class="demo-badge" style="background:#e36209">A07</span>
    <span class="demo-title">Authentication Failures</span>
  </div>
  <div class="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>
  <div class="demo-section">
    <div class="demo-section-label">Live Demo — brute-force alice with 10 rapid attempts</div>
    <div class="controls">
      <button class="btn btn-vuln" onclick="bruteForce('vulnerable')">Brute Force (Vulnerable)</button>
      <button class="btn btn-fixed" onclick="bruteForce('fixed')">Brute Force (Fixed)</button>
      <button class="btn btn-reset" onclick="resetDemo()">🔄 Reset Demo</button>
    </div>
    <div class="output" id="out">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
fetch('/slides/a07.json').then(r=>r.json()).then(s=>{
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
async function bruteForce(endpoint){
  const passwords=['wrong1','wrong2','wrong3','wrong4','wrong5','wrong6','wrong7','wrong8','wrong9','password123'];
  const results=[];
  for(const p of passwords){
    const r=await fetch('/a07/'+endpoint+'/login',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username:'alice',password:p})
    });
    results.push({password:p,status:r.status,body:await r.json()});
  }
  showOutput(results[results.length-1].status,results);
}
</script>
</body>
</html>`);
  });

  router.post('/vulnerable/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare(
      'SELECT * FROM users WHERE username=? AND password_md5=?'
    ).get(username, md5(password));
    if (user) res.json({ success: true, userId: user.id });
    else res.status(401).json({ error: 'Invalid credentials' });
  });

  router.post('/fixed/login', loginLimiter, (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare(
      'SELECT * FROM users WHERE username=? AND password_md5=?'
    ).get(username, md5(password));
    if (user) res.json({ success: true, userId: user.id });
    else res.status(401).json({ error: 'Invalid credentials' });
  });

  return router;
};

module.exports.resetLimiter = () => rateLimitStore.resetAll();
