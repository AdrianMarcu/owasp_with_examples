const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A06 — Insecure Design</title>
  <link rel="stylesheet" href="/demo.css">
</head>
<body>
<div class="page">
  <div class="demo-header" style="--color:#da3633">
    <span class="demo-badge" style="background:#da3633">A06</span>
    <span class="demo-title">Insecure Design</span>
  </div>
  <div class="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>
  <div class="demo-section">
    <div class="demo-section-label">Live Demo — Order #1 | Coupon: SAVE10 (10% off, max 1 use)</div>
    <div class="controls">
      <button class="btn btn-vuln" onclick="applyCoupon('vulnerable')">Apply SAVE10 (Vulnerable)</button>
      <button class="btn btn-fixed" onclick="applyCoupon('fixed')">Apply SAVE10 (Fixed)</button>
      <button class="btn" style="background:#388bfd" onclick="checkOrder()">Check Order Total</button>
      <button class="btn btn-reset" onclick="resetDemo()">🔄 Reset Demo</button>
    </div>
    <div class="output" id="out">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
fetch('/slides/a06.json').then(r=>r.json()).then(s=>{
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
async function applyCoupon(endpoint){
  const r=await fetch('/a06/'+endpoint+'/apply-coupon',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({orderId:1,code:'SAVE10'})
  });
  const j=await r.json();
  showOutput(r.status,j);
}
async function checkOrder(){
  const r=await fetch('/a06/order/1');
  const j=await r.json();
  showOutput(r.status,j);
}
</script>
</body>
</html>`);
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
