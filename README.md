# OWASP Top 10 (2026) Teaching Tool

An interactive classroom tool for teaching web security vulnerabilities. For each of the 10 OWASP 2026 vulnerabilities, students can read an explanation, view the broken code, see the fix, and trigger a live exploit against a real (intentionally vulnerable) server.

## Quick Start

```bash
npm install
npm start
```

- Presentation dashboard → http://localhost:3000
- Vulnerable app → http://localhost:4000

## Architecture

| Package | Port | Purpose |
|---|---|---|
| `presentation/` | 3000 | Dashboard UI — sidebar + 4-tab content panel |
| `vulnerable-app/` | 4000 | 10 exploitable route groups + fixed counterparts |

Both servers start together with `npm start` (via `concurrently`).

## Vulnerabilities Covered

| Code | Name | Demo |
|---|---|---|
| A01 | Broken Access Control | IDOR — read another user's invoice by changing the ID |
| A02 | Security Misconfiguration | Trigger an error to leak stack trace + env vars |
| A03 | Supply Chain Failures | Local `evil-analytics` package that exfiltrates data |
| A04 | Cryptographic Failures | MD5 password hashing — see the hash, crack it instantly |
| A05 | Injection | SQL injection with `' OR '1'='1` to dump all records |
| A06 | Insecure Design | Apply a discount coupon unlimited times |
| A07 | Auth Failures | Brute-force login with no rate limiting |
| A08 | Integrity Failures | Send a formula that gets `eval()`'d server-side |
| A09 | Logging Failures | Perform a bank transfer with no audit trail |
| A10 | Error Handling | Trigger a fail-open that grants access on error |

## Running Tests

```bash
npm test
```

Runs the vulnerable-app test suite (29 tests, all routes covered).

## Tech Stack

- Node.js + Express (two separate servers)
- SQLite via `better-sqlite3`
- Vanilla JS frontend with Prism.js syntax highlighting
- Jest + Supertest for tests

## Teaching Notes

Each vulnerability has two endpoints: `/aXX/vulnerable/...` (broken) and `/aXX/fixed/...` (patched). The presentation dashboard at localhost:3000 explains each one with annotated code before students try the live demo.

The vulnerable app is intentionally insecure. **Do not expose it to a public network.**
