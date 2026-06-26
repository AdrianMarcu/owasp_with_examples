const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A11 — Mass Assignment</title>
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
    <a class="demo-nav-pill" style="background:#388bfd" href="/a09">A09</a>
    <a class="demo-nav-pill" style="background:#3fb950" href="/a10">A10</a>
    <a class="demo-nav-pill active" style="background:#bc8cff" href="/a11">A11</a>
  </div>
</nav>
<div class="page">
  <div class="demo-header" style="--color:#bc8cff">
    <span class="demo-badge" style="background:#bc8cff">A11</span>
    <span class="demo-title">Mass Assignment</span>
  </div>

  <div class="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>

  <div class="demo-section">
    <div class="demo-section-label">Live Demo — You are Alice (user 1). Can you find all 3 issues?</div>
    <div class="controls">
      <button class="btn btn-fixed" onclick="getProfile(1)">Get My Profile</button>
      <button class="btn btn-vuln" onclick="attack(1)">Attack 1 — IDOR</button>
      <button class="btn btn-vuln" onclick="attack(2)">Attack 2 — Escalate</button>
      <button class="btn btn-vuln" onclick="attack(3)">Attack 3 — Combined</button>
      <button class="btn btn-fixed" onclick="tryFixed()">Try Fixed</button>
      <button class="btn btn-reset" onclick="resetDemo()">↺ Reset Demo</button>
    </div>
    <div class="output" id="out">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
    <div class="hint" style="margin-top:12px">
      <strong>Hint:</strong> Look at: who controls the update target? Which fields does the endpoint accept? Is there an ownership check?
    </div>
  </div>
</div>
<script>
fetch('/slides/a11.json').then(r=>r.json()).then(s=>{
  document.getElementById('card-what').innerHTML=s.explain.what;
  document.getElementById('card-example').innerHTML=s.explain.example;
  document.getElementById('card-impact').innerHTML=s.explain.impact;
}).catch(()=>{});

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

async function getProfile(userId){
  const r=await fetch('/a11/vulnerable/profile/'+userId,{headers:{'x-user-id':'1'}});
  showOutput(r.status,await r.json());
}

async function attack(n){
  let body;
  if(n===1) body={user_id:2,name:'Pwned by Alice'};
  if(n===2) body={is_admin:true,bio:'I am now admin'};
  if(n===3) body={user_id:3,is_admin:false,name:'Demoted Admin'};
  const r=await fetch('/a11/vulnerable/profile',{
    method:'PUT',headers:{'Content-Type':'application/json','x-user-id':'1'},
    body:JSON.stringify(body)
  });
  const j=await r.json();
  // Follow up: show the affected profile to prove the change
  const targetId=n===1?2:n===3?3:1;
  const r2=await fetch('/a11/vulnerable/profile/'+targetId,{headers:{'x-user-id':'1'}});
  showOutput(r2.status,{attack_payload:body,result:j,affected_profile:await r2.json()});
}

async function tryFixed(){
  // Send the same Attack 3 payload — fixed endpoint should ignore user_id and is_admin
  const body={user_id:3,is_admin:true,name:'Hack Attempt'};
  const r=await fetch('/a11/fixed/profile',{
    method:'PUT',headers:{'Content-Type':'application/json','x-user-id':'1'},
    body:JSON.stringify(body)
  });
  showOutput(r.status,await r.json());
}
</script>
</body>
</html>`);
  });

  // ── Vulnerable endpoints ─────────────────────────────────────
  router.get('/vulnerable/profile/:id', (req, res) => {
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Not found' });
    res.json(profile); // Intentional: returns is_admin — info disclosure
  });

  router.put('/vulnerable/profile', (req, res) => {
    const authUser = parseInt(req.headers['x-user-id']);
    if (!authUser) return res.status(401).json({ error: 'Not logged in' });

    // ⚠ Issue 1: body controls update target — not the auth session
    const targetId = req.body.user_id || authUser;

    // ⚠ Issue 2: is_admin arrives from the client alongside normal fields
    const { name, email, bio, is_admin } = req.body;

    const updates = {};
    if (name     !== undefined) updates.name     = name;
    if (email    !== undefined) updates.email    = email;
    if (bio      !== undefined) updates.bio      = bio;
    // ⚠ Issue 3: server-controlled flag written from client input
    if (is_admin !== undefined) updates.is_admin = is_admin ? 1 : 0;

    if (!Object.keys(updates).length)
      return res.status(400).json({ error: 'Nothing to update' });

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE profiles SET ${setClauses} WHERE user_id = ?`)
      .run(...Object.values(updates), targetId);

    res.json({ updated: true, target_user_id: targetId });
  });

  // ── Fixed endpoints ──────────────────────────────────────────
  router.get('/fixed/profile/:id', (req, res) => {
    // ✅ Strip is_admin and email — those are server-controlled fields
    const profile = db.prepare(
      'SELECT user_id, name, bio FROM profiles WHERE user_id = ?'
    ).get(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Not found' });
    res.json(profile);
  });

  router.put('/fixed/profile', (req, res) => {
    const authUser = parseInt(req.headers['x-user-id']);
    if (!authUser) return res.status(401).json({ error: 'Not logged in' });

    // ✅ Allowlist: only name and bio are user-updatable
    const { name, bio } = req.body;
    if (!name && !bio)
      return res.status(400).json({ error: 'Provide name or bio to update' });

    // ✅ Always target the authenticated user's own profile
    db.prepare(`
      UPDATE profiles
      SET name = COALESCE(?, name), bio = COALESCE(?, bio)
      WHERE user_id = ?
    `).run(name ?? null, bio ?? null, authUser);

    const profile = db.prepare(
      'SELECT user_id, name, bio FROM profiles WHERE user_id = ?'
    ).get(authUser);
    res.json({ updated: true, profile });
  });

  return router;
};
