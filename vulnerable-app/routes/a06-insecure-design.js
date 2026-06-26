const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>A06 Demo</title>
<style>body{font-family:monospace;background:#0d1117;color:#e6edf3;padding:24px}
h1{color:#da3633}button{background:#238636;color:#fff;border:none;padding:8px 16px;
cursor:pointer;border-radius:4px;margin:4px}
pre{background:#161b22;padding:12px;border-radius:4px;margin-top:12px}</style></head>
<body>
<h1>A06 — Insecure Design (Coupon Abuse)</h1>
<p>Order #1 | Coupon: SAVE10 (10% off, max 1 use)</p>
<button onclick="apply('vulnerable')">Apply SAVE10 (Vulnerable)</button>
<button onclick="apply('fixed')" style="background:#1f6feb">Apply SAVE10 (Fixed)</button>
<button onclick="getOrder()">Check Order Total</button>
<button onclick="resetDemo()" style="background:#6e40c9">🔄 Reset Demo</button>
<div id="out"></div>
<script>
async function apply(mode) {
  const r = await fetch('/a06/'+mode+'/apply-coupon', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({orderId:1, code:'SAVE10'})
  });
  const j = await r.json();
  document.getElementById('out').innerHTML = '<p>Status: '+r.status+'</p><pre>'+JSON.stringify(j,null,2)+'</pre>';
}
async function getOrder() {
  const r = await fetch('/a06/order/1');
  const j = await r.json();
  document.getElementById('out').innerHTML = '<pre>'+JSON.stringify(j,null,2)+'</pre>';
}
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
}
</script></body></html>`);
  });

  router.get('/order/:id', (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
    res.json(order || { error: 'Not found' });
  });

  router.post('/vulnerable/apply-coupon', (req, res) => {
    const { orderId, code } = req.body;
    const coupon = db.prepare('SELECT * FROM coupons WHERE code=?').get(code);
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon' });
    db.prepare('UPDATE orders SET discount=discount+? WHERE id=?').run(coupon.discount_percent, orderId);
    res.json({ applied: coupon.discount_percent });
  });

  router.post('/fixed/apply-coupon', (req, res) => {
    const { orderId, code } = req.body;
    const coupon = db.prepare('SELECT * FROM coupons WHERE code=?').get(code);
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon' });
    if (coupon.times_used >= coupon.max_uses)
      return res.status(400).json({ error: 'Coupon has expired' });
    const used = db.prepare(
      'SELECT 1 FROM coupon_usages WHERE order_id=? AND coupon_id=?'
    ).get(orderId, coupon.id);
    if (used) return res.status(400).json({ error: 'Already applied to this order' });
    db.prepare('UPDATE coupons SET times_used=times_used+1 WHERE id=?').run(coupon.id);
    db.prepare('INSERT INTO coupon_usages VALUES (?,?)').run(orderId, coupon.id);
    db.prepare('UPDATE orders SET discount=discount+? WHERE id=?').run(coupon.discount_percent, orderId);
    res.json({ applied: coupon.discount_percent });
  });

  return router;
};
