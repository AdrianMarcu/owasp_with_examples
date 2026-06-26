# Demo Page Redesign — Design Spec

**Date:** 2026-06-26
**Scope:** Redesign all 10 `/aXX` demo pages at port 4000 — add structured explanation cards and a production-ready dark UI.

---

## Problem

The 10 demo pages at `localhost:4000/aXX` are bare-bones: a heading, 2–3 unstyled buttons, and a raw JSON `<pre>` block. Each page duplicates its own inline `<style>` block. Students arrive at these pages from the presentation dashboard with no context for what they are about to do.

---

## Goals

1. Add three explanation cards per page — **What is it? / The Attack / Impact** — drawn from the existing slide JSON.
2. Make the pages visually production-ready using the same dark GitHub-style theme as the presentation dashboard.
3. Eliminate duplicated inline CSS across all 10 route files.

---

## Architecture

### New: `vulnerable-app/public/demo.css`

Shared stylesheet for all 10 demo pages. Contains the full layout and component styles. Pages link to it via `<link rel="stylesheet" href="/demo.css">`.

### Modified: `vulnerable-app/server.js`

Two additions:

```js
// Serve shared assets (demo.css)
app.use(express.static(path.join(__dirname, 'public')));

// Expose presentation slide content to demo pages (same-origin)
app.use('/slides', express.static(path.join(__dirname, '../presentation/public/slides')));
```

Mounted before the route handlers. No new npm dependencies.

### Modified: all 10 route files (`a01` through `a10`)

Each `GET /` handler is restructured. The HTML:

1. Links to `/demo.css` instead of having an inline `<style>` block.
2. Fetches `/slides/aXX.json` on load and renders the three explanation cards.
3. Has the structured two-section layout (explanation + demo).

---

## Page Layout

```
┌──────────────────────────────────────────────────────────┐
│  [AXX badge]  Vulnerability Title          (header bar)  │
├──────────┬─────────────────┬───────────────────────────  │
│ What is  │  The Attack     │  Impact                     │
│ it?      │                 │                             │
│          │  (explain.      │  (explain.impact)           │
│ (explain │  example)       │                             │
│ .what)   │                 │                             │
├──────────┴─────────────────┴──────────────────────────── │
│  DEMO                                                    │
│  [ inputs if applicable ]                                │
│  [Vulnerable]  [Fixed]  [🔄 Reset Demo]                  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  ● 200 OK   (status badge — green/red)            │  │
│  │  { formatted JSON }                                │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Content

The three cards map directly to the existing slide JSON fields (already authored):

| Card | Slide field | Example content |
|------|-------------|-----------------|
| What is it? | `explain.what` | "A user can access data…" |
| The Attack | `explain.example` | "You log in as Alice. Your invoice is at `/invoice/1`…" |
| Impact | `explain.impact` | "Data theft · privilege escalation…" |

The slide content contains HTML (`<code>` tags) and must be rendered with `innerHTML`, not `textContent`. The slide files are our own static content, so this is safe.

---

## `demo.css` — Component Inventory

**Page shell**
- `body`: `#0d1117` background, `-apple-system` font stack, `min-height: 100vh`
- `.page`: `max-width: 960px`, centered, `padding: 0 24px 48px`

**Header**
- `.demo-header`: flex row, colored left border (`border-left: 4px solid var(--color)`), `#161b22` background, `padding: 16px 20px`, `border-radius: 6px`, `margin-bottom: 24px`
- `.demo-badge`: same badge style as dashboard (colored bg, white text, monospace, small caps)
- `.demo-title`: `font-size: 18px`, `font-weight: 600`, `color: #f0f6fc`

**Explanation cards**
- `.cards`: CSS grid, `grid-template-columns: repeat(3, 1fr)`, `gap: 12px`, `margin-bottom: 28px`
- `.card`: `background: #161b22`, `border: 1px solid #30363d`, `border-radius: 6px`, `padding: 16px`
- `.card-label`: `font-size: 10px`, `text-transform: uppercase`, `letter-spacing: 0.8px`, `color: #8b949e`, `margin-bottom: 8px`
- `.card p`: `font-size: 13px`, `color: #e6edf3`, `line-height: 1.7`
- `.card code`: `background: #21262d`, `border-radius: 3px`, `padding: 1px 5px`, `font-size: 12px`, `color: #79c0ff`

**Demo section**
- `.demo-section`: `background: #161b22`, `border: 1px solid #30363d`, `border-radius: 6px`, `padding: 20px`
- `.demo-section-label`: same style as `.card-label`
- `.controls`: flex row, `gap: 8px`, `flex-wrap: wrap`, `align-items: center`, `margin-bottom: 16px`
- `.input`: `background: #21262d`, `color: #e6edf3`, `border: 1px solid #30363d`, `border-radius: 4px`, `padding: 6px 10px`, `font-size: 13px`
- `.btn`: `border: none`, `border-radius: 4px`, `padding: 8px 16px`, `font-size: 13px`, `cursor: pointer`, `color: #fff`, `font-weight: 500`
- `.btn-vuln`: `background: #da3633` (red — signals danger)
- `.btn-fixed`: `background: #1f6feb` (blue)
- `.btn-reset`: `background: #6e40c9` (purple)

**Output panel**
- `.output`: hidden by default (`display: none`); shown once a response arrives
- `.output-status`: flex row, `gap: 8px`, `margin-bottom: 8px`, `font-size: 12px`, `font-family: monospace`
- `.status-badge`: `padding: 2px 8px`, `border-radius: 3px`; `.status-badge.ok`: `background: #1b2f1f`, `color: #7ee787`; `.status-badge.err`: `background: #3d1f1f`, `color: #ffa198`
- `.output pre`: `background: #0d1117`, `border: 1px solid #30363d`, `border-radius: 4px`, `padding: 12px`, `font-size: 12px`, `overflow-x: auto`, `color: #e6edf3`

**Responsive**
- `@media (max-width: 640px)`: `.cards` collapses to `grid-template-columns: 1fr`

---

## Changes Per Route File

Each of the 10 route files (`a01` through `a10`) gets the same structural change to the `GET /` handler:

**Before:** Self-contained HTML with inline `<style>`, raw buttons, `#out` div.

**After:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AXX — [Name]</title>
  <link rel="stylesheet" href="/demo.css">
</head>
<body>
<div class="page">
  <div class="demo-header" style="--color: [badge-color]">
    <span class="demo-badge" style="background:[badge-color]">AXX</span>
    <span class="demo-title">[Vulnerability Name]</span>
  </div>

  <div class="cards" id="cards">
    <div class="card"><div class="card-label">What is it?</div><p id="card-what"></p></div>
    <div class="card"><div class="card-label">The Attack</div><p id="card-example"></p></div>
    <div class="card"><div class="card-label">Impact</div><p id="card-impact"></p></div>
  </div>

  <div class="demo-section">
    <div class="demo-section-label">Live Demo</div>
    <div class="controls">
      <!-- page-specific inputs and buttons -->
    </div>
    <div class="output" id="out">
      <div class="output-status"><span class="status-badge" id="status-badge"></span></div>
      <pre id="output-body"></pre>
    </div>
  </div>
</div>
<script>
// Load explanation cards
fetch('/slides/aXX.json').then(r => r.json()).then(s => {
  document.getElementById('card-what').innerHTML = s.explain.what;
  document.getElementById('card-example').innerHTML = s.explain.example;
  document.getElementById('card-impact').innerHTML = s.explain.impact;
});

// Shared output helper
function showOutput(status, data) {
  const out = document.getElementById('out');
  const badge = document.getElementById('status-badge');
  const body = document.getElementById('output-body');
  const ok = status >= 200 && status < 300;
  badge.textContent = status + ' ' + (ok ? '✓' : '✗');
  badge.className = 'status-badge ' + (ok ? 'ok' : 'err');
  body.textContent = JSON.stringify(data, null, 2);
  out.style.display = 'block';
}

// Reset Demo
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').style.display = 'none';
}

// Page-specific demo functions follow...
</script>
</body>
</html>
```

The `showOutput(status, data)` helper replaces the ad-hoc `innerHTML` assignments in each page's demo functions, giving consistent formatted output across all pages.

The `resetDemo()` function hides the output panel on reset instead of showing a text message (cleaner UX).

---

## Vulnerable button color change

The current green `#238636` for the "Vulnerable" button signals safety. Changing it to red `#da3633` better communicates danger to students — this is the broken endpoint.

---

## Out of Scope

- Changes to the presentation dashboard (port 3000)
- Changes to the vulnerable/fixed endpoint logic
- Changes to tests (the HTML is not tested; endpoint behavior tests are unchanged)
- Syntax highlighting on the output JSON (no new dependencies)
