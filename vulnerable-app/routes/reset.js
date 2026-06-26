const express = require('express');
const fs = require('fs');
const path = require('path');

const EXFIL = path.join(__dirname, '../exfil.log');

module.exports = function (db, resetLimiter) {
  const router = express.Router();

  router.post('/', (req, res) => {
    db.transaction(() => {
      db.prepare('UPDATE coupons SET times_used = 0').run();
      db.prepare('DELETE FROM coupon_usages').run();
      db.prepare('UPDATE orders SET discount = 0').run();
      db.prepare('UPDATE accounts SET balance = 1000.00 WHERE id = 1').run();
      db.prepare('UPDATE accounts SET balance = 500.00 WHERE id = 2').run();
      db.prepare('DELETE FROM audit_log').run();
      db.prepare('DELETE FROM users WHERE id > 3').run();
      db.prepare("UPDATE profiles SET name='Alice Smith',email='alice@example.com',bio='Just a regular user',is_admin=0 WHERE user_id=1").run();
      db.prepare("UPDATE profiles SET name='Bob Jones',email='bob@example.com',bio='Consultant',is_admin=0 WHERE user_id=2").run();
      db.prepare("UPDATE profiles SET name='Admin',email='admin@example.com',bio='Site administrator',is_admin=1 WHERE user_id=3").run();
      db.prepare('DELETE FROM saved_searches').run();
    })();

    try { fs.unlinkSync(EXFIL); } catch {}

    resetLimiter();

    res.json({ reset: true });
  });

  return router;
};
