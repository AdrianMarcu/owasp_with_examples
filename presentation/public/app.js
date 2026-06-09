const VULNS = [
  { code: 'A01', color: '#f85149', name: 'Broken Access Control' },
  { code: 'A02', color: '#d29922', name: 'Security Misconfiguration' },
  { code: 'A03', color: '#8957e5', name: 'Supply Chain Failures' },
  { code: 'A04', color: '#1f6feb', name: 'Cryptographic Failures' },
  { code: 'A05', color: '#f85149', name: 'Injection' },
  { code: 'A06', color: '#da3633', name: 'Insecure Design' },
  { code: 'A07', color: '#e36209', name: 'Auth Failures' },
  { code: 'A08', color: '#8957e5', name: 'Integrity Failures' },
  { code: 'A09', color: '#388bfd', name: 'Logging Failures' },
  { code: 'A10', color: '#3fb950', name: 'Error Handling' },
];

let currentSlide = null;
let currentTab = 'explain';

function buildSidebar() {
  const ul = document.getElementById('vuln-list');
  VULNS.forEach(v => {
    const li = document.createElement('li');
    li.dataset.code = v.code.toLowerCase();
    li.style.borderLeftColor = 'transparent';
    li.innerHTML = `
      <span class="badge" style="background:${v.color}">${v.code}</span>
      <span class="vuln-name">${v.name}</span>
    `;
    li.addEventListener('click', () => loadSlide(v.code.toLowerCase(), v.color, li));
    ul.appendChild(li);
  });
}

async function loadSlide(id, color, liEl) {
  document.querySelectorAll('#vuln-list li').forEach(el => {
    el.classList.remove('active');
    el.style.borderLeftColor = 'transparent';
  });
  liEl.classList.add('active');
  liEl.style.borderLeftColor = color;

  try {
    const res = await fetch(`/slides/${id}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const slide = await res.json();
    currentSlide = slide;
    renderTab(currentTab);
  } catch (err) {
    document.getElementById('tab-explain').innerHTML =
      `<p style="color:#f85149;padding:24px">Failed to load slide: ${escHtml(err.message)}</p>`;
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-explain').classList.add('active');
  }
}

function renderTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));

  if (!currentSlide) return;
  const s = currentSlide;

  if (tab === 'explain') {
    document.getElementById('tab-explain').innerHTML = `
      <div class="explain-header">
        <span class="badge" style="background:${s.badgeColor};font-size:12px;padding:4px 9px">${s.code}</span>
        <span class="explain-title">${s.title}</span>
      </div>
      <div class="explain-card" style="border-left-color:${s.badgeColor}">
        <div class="explain-card-label">What is it?</div>
        <p>${s.explain.what}</p>
      </div>
      <div class="explain-card">
        <div class="explain-card-label">Real-world example</div>
        <p>${s.explain.example}</p>
      </div>
      <div class="explain-card">
        <div class="explain-card-label">Impact</div>
        <p>${s.explain.impact}</p>
      </div>
    `;
  }

  if (tab === 'vulnerable') {
    document.getElementById('tab-vulnerable').innerHTML = `
      <div class="code-annotation vuln">${s.vulnerable.annotation}</div>
      <div class="code-filename">${s.vulnerable.filename}</div>
      <pre><code class="language-javascript">${escHtml(s.vulnerable.code)}</code></pre>
    `;
    Prism.highlightAll();
  }

  if (tab === 'fixed') {
    document.getElementById('tab-fixed').innerHTML = `
      <div class="code-annotation fixed">${s.fixed.annotation}</div>
      <div class="code-filename">${s.fixed.filename}</div>
      <pre><code class="language-javascript">${escHtml(s.fixed.code)}</code></pre>
    `;
    Prism.highlightAll();
  }

  if (tab === 'demo') {
    document.getElementById('tab-demo').innerHTML = `
      <div class="demo-panel">
        <div class="demo-url">${s.demoUrl}</div>
        <p class="demo-hint">${s.demoHint}</p>
        <a class="demo-open-btn" href="${s.demoUrl}" target="_blank">Open Live Demo ↗</a>
      </div>
    `;
  }
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => renderTab(btn.dataset.tab));
});

buildSidebar();
