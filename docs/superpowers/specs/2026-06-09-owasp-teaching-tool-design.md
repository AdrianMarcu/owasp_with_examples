# OWASP 2026 Teaching Tool — Design Spec

**Date:** 2026-06-09  
**Audience:** Beginner / Intermediate students  
**Stack:** Node.js (Express), SQLite, Vanilla JS, dark GitHub-style UI

---

## Overview

An interactive classroom teaching tool that walks students through all 10 OWASP Top 10 (2026) vulnerabilities. For each vulnerability the teacher explains the concept, shows the broken code, then lets students trigger a live exploit against a real (intentionally vulnerable) server before showing the fix.

---

## Architecture

Two separate Express servers started together from the root with `npm start` (via `concurrently`):

| Server | Port | Purpose |
|---|---|---|
| `presentation/` | 3000 | Dashboard UI — sidebar + tabbed content panel |
| `vulnerable-app/` | 4000 | 10 exploitable route groups + their fixed counterparts |

The two servers are fully independent. The presentation only links to `localhost:4000` — it never shares code or process with the vulnerable app.

---

## Project Structure

```
owasp_with_examples/
├── package.json                        # "start": "concurrently ..."
├── .gitignore
├── presentation/
│   ├── server.js                       # Express static server, port 3000
│   └── public/
│       ├── index.html                  # Dashboard shell (sidebar + main panel)
│       ├── style.css                   # Dark GitHub-style theme
│       ├── app.js                      # Sidebar nav, tab switching, Prism.js highlighting
│       └── slides/
│           ├── a01.json
│           ├── a02.json
│           ├── a03.json
│           ├── a04.json
│           ├── a05.json
│           ├── a06.json
│           ├── a07.json
│           ├── a08.json
│           ├── a09.json
│           └── a10.json
└── vulnerable-app/
    ├── server.js                       # Express, port 4000
    ├── database.js                     # SQLite setup + seed data
    └── routes/
        ├── a01-access-control.js
        ├── a02-misconfiguration.js
        ├── a03-supply-chain.js
        ├── a04-crypto.js
        ├── a05-injection.js
        ├── a06-insecure-design.js
        ├── a07-auth-failures.js
        ├── a08-integrity.js
        ├── a09-logging.js
        └── a10-error-handling.js
```

---

## Presentation Dashboard

### Layout
- **Sidebar (left, 220px):** Lists all 10 vulnerabilities with coloured A01–A10 badges. Clicking a row loads that vulnerability into the main panel.
- **Main panel (right):** Four tabs per vulnerability:
  - `📖 Explain` — beginner-friendly concept explanation, real-world example, impact summary
  - `❌ Vulnerable` — annotated code snippet showing the broken implementation (Prism.js syntax highlighting)
  - `✅ Fixed` — annotated code snippet showing the patched version
  - `▶ Live Demo` — link to `localhost:4000/aXX` that opens in a new tab

### Slide JSON schema (`slides/aXX.json`)
```json
{
  "code": "A01",
  "title": "Broken Access Control",
  "badgeColor": "#f85149",
  "explain": {
    "what": "...",
    "example": "...",
    "impact": "..."
  },
  "vulnerable": {
    "filename": "routes/invoices.js",
    "code": "...",
    "annotation": "..."
  },
  "fixed": {
    "filename": "routes/invoices.js",
    "code": "...",
    "annotation": "..."
  },
  "demoUrl": "http://localhost:4000/a01"
}
```

### Theme
Dark GitHub-style: `#0d1117` background, `#161b22` panels, `#30363d` borders, Prism.js for code, red/green status indicators.

---

## Vulnerable App

### Route convention
Each vulnerability exposes three routes:

| Route | Description |
|---|---|
| `GET /aXX` | Demo landing page — HTML form for students to try the attack |
| `GET /aXX/vulnerable/...` | The broken endpoint (what the form submits to) |
| `GET /aXX/fixed/...` | The patched endpoint (for side-by-side comparison) |

### Vulnerability demos

| Code | Name | What students try | Persistence |
|---|---|---|---|
| A01 | Broken Access Control | Change invoice ID in URL, read another user's data (IDOR) | SQLite |
| A02 | Security Misconfiguration | Trigger an error, see full stack trace + env vars leaked | None |
| A03 | Supply Chain Failures | Install a local "malicious" package that phones home (safe simulation) | None |
| A04 | Cryptographic Failures | Register, see MD5 hash stored in DB, crack it instantly online | SQLite |
| A05 | Injection | Type `' OR '1'='1` into search, dump all records | SQLite |
| A06 | Insecure Design | Apply a discount coupon unlimited times on an order | SQLite |
| A07 | Auth Failures | Brute-force login with no rate limiting or account lockout | SQLite |
| A08 | Integrity Failures | Send crafted JSON payload that gets `eval()`'d server-side | None |
| A09 | Logging Failures | Perform sensitive actions, confirm audit log stays empty | SQLite |
| A10 | Error Handling | Send unexpected input, trigger a fail-open that grants access | None |

### Database
SQLite via `better-sqlite3`. `database.js` creates tables and seeds sample data (users, invoices, orders, coupons, audit_log) on startup. The DB file is ephemeral (`vulnerable-app/data.db`, gitignored) — restarting the server resets it.

---

## Dependencies

### Root
- `concurrently` — run both servers with one command
- npm workspaces configured so `npm install` at the root installs deps for all packages

### presentation/
- `express` — static file server

### vulnerable-app/
- `express` — HTTP server
- `better-sqlite3` — SQLite
- `bcrypt` — used only in the *fixed* versions of auth routes
- `express-rate-limit` — used only in the *fixed* versions of auth routes

### Frontend (CDN, no build step)
- `Prism.js` — syntax highlighting
- No framework — vanilla JS only

---

## Getting Started (final README shape)

```bash
npm install
npm start
# presentation → http://localhost:3000
# vulnerable app → http://localhost:4000
```

---

## Out of Scope

- Authentication on the presentation server itself
- Docker / containerisation
- Any build pipeline (Webpack, Vite, etc.)
- Automated tests
- Deployment beyond localhost
