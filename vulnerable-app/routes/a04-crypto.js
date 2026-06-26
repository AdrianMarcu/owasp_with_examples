const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const md5 = s => crypto.createHash('md5').update(s).digest('hex');

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>A04 Demo</title>
<style>body{font-family:monospace;background:#0d1117;color:#e6edf3;padding:24px}
h1{color:#1f6feb}button{background:#238636;color:#fff;border:none;padding:8px 16px;
cursor:pointer;border-radius:4px;margin:4px}input{background:#21262d;color:#e6edf3;
border:1px solid #30363d;padding:6px;border-radius:4px;width:140px}
pre{background:#161b22;padding:12px;border-radius:4px;margin-top:12px}</style></head>
<body>
<h1>A04 — Cryptographic Failures</h1>
<p>Username: <input id="u" value="testuser"> Password: <input id="p" value="password123" type="password"></p>
<button onclick="reg('vulnerable')">Register (Vulnerable MD5)</button>
<button onclick="reg('fixed')" style="background:#1f6feb">Register (Fixed bcrypt)</button>
<button onclick="resetDemo()" style="background:#6e40c9">🔄 Reset Demo</button>
<div id="out"></div>
<script>
async function reg(mode) {
  const r = await fetch('/a04/'+mode+'/register', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username:document.getElementById('u').value+'_'+Date.now(), password:document.getElementById('p').value})
  });
  const j = await r.json();
  document.getElementById('out').innerHTML = '<p>Mode: <strong>'+mode+'</strong></p><pre>'+JSON.stringify(j,null,2)+'</pre>';
}
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
}
</script></body></html>`);
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
