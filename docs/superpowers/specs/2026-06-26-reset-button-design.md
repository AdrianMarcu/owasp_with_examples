# Reset Button — Design Spec

**Date:** 2026-06-26
**Scope:** Add a global demo-state reset to the OWASP teaching tool so teachers can restore seed state mid-class without restarting the server or deleting `data.db`.

---

## Problem

Four demos accumulate non-reversible state in `data.db` and on disk:

| Demo | Issue |
|------|-------|
| A06 fixed | SAVE10 coupon (max_uses=1) permanently exhausted after one use |
| A09 both | Account balances drain; Alice hits $0 after ~10 transfers |
| A07 fixed | `express-rate-limit` MemoryStore blocks IP for 15 min after brute-force demo |
| A03 vulnerable | `exfil.log` grows (minor; but no in-app clear) |
| A04 vulnerable | Test users accumulate in `users` table (minor) |

---

## Solution

A `POST /reset` endpoint on the vulnerable app (port 4000) that restores all seed state in one shot. A "Reset Demo" button on every `/aXX` demo page calls it.

---

## Architecture

### Backend — `vulnerable-app/routes/reset.js` (new file)

Exports `function(db, resetLimiter) → Express Router`.

`POST /` handler performs these operations in order:

**Database resets:**
```
UPDATE coupons SET times_used = 0
DELETE FROM coupon_usages
UPDATE orders SET discount = 0
UPDATE accounts SET balance = 1000.00 WHERE id = 1
UPDATE accounts SET balance = 500.00 WHERE id = 2
DELETE FROM audit_log
DELETE FROM users WHERE id > 3
```

**File reset:**
- Delete `exfil.log` if it exists (silent if absent)

**Rate limiter reset:**
- Call `resetLimiter()` — clears the A07 MemoryStore's `hits` Map

**Response:** `{ reset: true }`

---

### Rate Limiter Export — `vulnerable-app/routes/a07-auth-failures.js`

The module-level `loginLimiter` is defined once (singleton). Export a `resetLimiter` function alongside the router factory:

```js
module.exports = function(db) { ... };
module.exports.resetLimiter = () => loginLimiter.store.hits.clear();
```

---

### Wiring — `vulnerable-app/server.js`

```js
const makeA07 = require('./routes/a07-auth-failures');
const { resetLimiter } = makeA07;

app.use('/a07', makeA07(db));
app.use('/reset', require('./routes/reset')(db, resetLimiter));
```

---

### Frontend — all 10 demo pages (`a01` through `a10`)

Each route file's inline HTML gets a "🔄 Reset Demo" button added to the existing button row. Style matches existing buttons (`background:#6e40c9` to visually distinguish it as a utility action, not a demo action).

Click handler (inline `<script>`):

```js
async function resetDemo() {
  await fetch('/reset', { method: 'POST' });
  document.getElementById('out').innerHTML =
    '<p style="color:#7ee787">Demo state reset.</p>';
}
```

No new files. No new UI patterns. Uses the same `#out` div already present on every page.

---

## What Reset Does and Does Not Touch

| Table / Resource | Reset action |
|-----------------|--------------|
| `coupons.times_used` | Set to 0 |
| `coupon_usages` | All rows deleted |
| `orders.discount` | Set to 0 |
| `accounts.balance` | Restored to seed values (1000, 500) |
| `audit_log` | All rows deleted |
| `users` (id > 3) | Deleted (removes A04 test users) |
| `exfil.log` | Deleted if present |
| A07 rate limiter | MemoryStore cleared |
| `invoices`, `products` | Not touched (read-only demos, no drift) |

---

## Out of Scope

- Authentication on the reset endpoint (localhost-only tool)
- Per-demo granular reset
- Confirmation dialog before reset
- Tests for the reset route
