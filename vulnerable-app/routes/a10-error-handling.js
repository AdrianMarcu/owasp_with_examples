const express = require('express');

module.exports = function () {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>A10 Demo</title>
<style>body{font-family:monospace;background:#0d1117;color:#e6edf3;padding:24px}
h1{color:#3fb950}button{background:#238636;color:#fff;border:none;padding:8px 16px;
cursor:pointer;border-radius:4px;margin:4px}input{background:#21262d;color:#e6edf3;
border:1px solid #30363d;padding:6px;border-radius:4px;width:200px}
pre{background:#161b22;padding:12px;border-radius:4px;margin-top:12px}</style></head>
<body>
<h1>A10 — Mishandling of Exceptional Conditions</h1>
<p>Submit a short (invalid) token and see if you get in.</p>
<p>Token: <input id="t" value="bad">
<button onclick="access('vulnerable')">Access (Vulnerable)</button>
<button onclick="access('fixed')" style="background:#1f6feb">Access (Fixed)</button></p>
<p style="color:#8b949e">Try a short token like "bad" (triggers error) and a long one like "validtoken1234567890"</p>
<div id="out"></div>
<script>
async function access(mode) {
  const r = await fetch('/a10/'+mode+'/access', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({token: document.getElementById('t').value})
  });
  const j = await r.json();
  document.getElementById('out').innerHTML = '<p>Status: '+r.status+'</p><pre>'+JSON.stringify(j,null,2)+'</pre>';
}
</script></body></html>`);
  });

  router.post('/vulnerable/access', (req, res) => {
    const { token } = req.body;
    let authorized = false;

    try {
      if (!token || token.length < 20)
        throw new Error('Auth service unavailable');
      authorized = true;
    } catch (err) {
      console.error('Auth error:', err.message);
    }

    // BUG: responds with success regardless of authorized
    res.json({ access: 'granted', note: 'Auth error was swallowed — fail-open!' });
  });

  router.post('/fixed/access', (req, res) => {
    const { token } = req.body;
    try {
      if (!token || token.length < 20)
        throw new Error('Auth service unavailable');
      res.json({ access: 'granted' });
    } catch (err) {
      console.error('Auth error:', err.message);
      res.status(503).json({ error: 'Authentication service unavailable. Access denied.' });
    }
  });

  return router;
};
