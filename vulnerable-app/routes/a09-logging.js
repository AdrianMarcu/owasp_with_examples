const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  const log = (action, userId, details) =>
    db.prepare(
      'INSERT INTO audit_log (timestamp, action, user_id, details) VALUES (?,?,?,?)'
    ).run(new Date().toISOString(), action, userId, details);

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>A09 Demo</title>
<style>body{font-family:monospace;background:#0d1117;color:#e6edf3;padding:24px}
h1{color:#388bfd}button{background:#238636;color:#fff;border:none;padding:8px 16px;
cursor:pointer;border-radius:4px;margin:4px}
pre{background:#161b22;padding:12px;border-radius:4px;margin-top:12px;max-height:300px;overflow:auto}</style></head>
<body>
<h1>A09 — Security Logging Failures</h1>
<p>Transfer $100 from account 1 to account 2.</p>
<button onclick="transfer('vulnerable')">Transfer (Vulnerable)</button>
<button onclick="transfer('fixed')" style="background:#1f6feb">Transfer (Fixed)</button>
<button onclick="showLog()">Show Audit Log</button>
<div id="out"></div>
<script>
async function transfer(mode) {
  const r = await fetch('/a09/'+mode+'/transfer', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({fromId:1, toId:2, amount:100})
  });
  const j = await r.json();
  document.getElementById('out').innerHTML = '<p>Status: '+r.status+'</p><pre>'+JSON.stringify(j,null,2)+'</pre>';
}
async function showLog() {
  const r = await fetch('/a09/audit-log');
  const j = await r.json();
  document.getElementById('out').innerHTML = '<p><strong>Audit Log ('+j.logs.length+' entries)</strong></p><pre>'+JSON.stringify(j,null,2)+'</pre>';
}
</script></body></html>`);
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
