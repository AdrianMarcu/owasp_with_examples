const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const md5 = s => crypto.createHash('md5').update(s).digest('hex');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>A07 Demo</title>
<style>body{font-family:monospace;background:#0d1117;color:#e6edf3;padding:24px}
h1{color:#e36209}button{background:#238636;color:#fff;border:none;padding:8px 16px;
cursor:pointer;border-radius:4px;margin:4px}
pre{background:#161b22;padding:12px;border-radius:4px;margin-top:12px;max-height:300px;overflow:auto}</style></head>
<body>
<h1>A07 — Authentication Failures</h1>
<p>Simulate a brute-force attack: send 10 login attempts rapidly.</p>
<button onclick="bruteForce('vulnerable')">Brute Force (Vulnerable)</button>
<button onclick="bruteForce('fixed')" style="background:#1f6feb">Brute Force (Fixed)</button>
<div id="out"></div>
<script>
async function bruteForce(mode) {
  const passwords = ['wrong1','wrong2','wrong3','wrong4','wrong5','wrong6','wrong7','wrong8','wrong9','password123'];
  const results = [];
  for (const p of passwords) {
    const r = await fetch('/a07/'+mode+'/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username:'alice', password:p})
    });
    results.push({ password: p, status: r.status, body: await r.json() });
  }
  document.getElementById('out').innerHTML = '<p>Mode: <strong>'+mode+'</strong></p><pre>'+JSON.stringify(results,null,2)+'</pre>';
}
</script></body></html>`);
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

module.exports.resetLimiter = () => loginLimiter.store.hits.clear();
