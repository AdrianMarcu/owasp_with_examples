const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const md5 = s => crypto.createHash('md5').update(s).digest('hex');

function createDatabase(dbPath = path.join(__dirname, 'data.db')) {
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_md5 TEXT,
      password_bcrypt TEXT,
      failed_attempts INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      description TEXT
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      internal_code TEXT
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      total REAL NOT NULL,
      discount REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      discount_percent REAL NOT NULL,
      max_uses INTEGER NOT NULL,
      times_used INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS coupon_usages (
      order_id INTEGER NOT NULL,
      coupon_id INTEGER NOT NULL,
      PRIMARY KEY (order_id, coupon_id)
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      balance REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      user_id INTEGER,
      details TEXT
    );
    CREATE TABLE IF NOT EXISTS profiles (
      id       INTEGER PRIMARY KEY,
      user_id  INTEGER UNIQUE NOT NULL,
      name     TEXT NOT NULL,
      email    TEXT,
      bio      TEXT,
      is_admin INTEGER DEFAULT 0
    );
  `);

  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count === 0) {
    db.prepare('INSERT INTO users (id,username,password_md5) VALUES (1,?,?)').run('alice', md5('password123'));
    db.prepare('INSERT INTO users (id,username,password_md5) VALUES (2,?,?)').run('bob', md5('secret456'));
    db.prepare('INSERT INTO users (id,username,password_md5) VALUES (3,?,?)').run('admin', md5('admin123'));

    db.prepare('INSERT INTO invoices VALUES (1,1,150.00,?)').run('Web hosting - Alice');
    db.prepare('INSERT INTO invoices VALUES (2,2,2500.00,?)').run('Consulting fees - Bob');
    db.prepare('INSERT INTO invoices VALUES (3,3,99999.00,?)').run('Executive bonus - Admin');

    db.prepare('INSERT INTO products VALUES (1,?,999.99,?)').run('Laptop', 'INTERNAL-LAP-001');
    db.prepare('INSERT INTO products VALUES (2,?,29.99,?)').run('Mouse', 'INTERNAL-MOU-002');
    db.prepare('INSERT INTO products VALUES (3,?,0.01,?)').run('Secret Prototype', 'TOP-SECRET-XR7');

    db.prepare('INSERT INTO orders VALUES (1,1,999.99,0)').run();
    db.prepare('INSERT INTO orders VALUES (2,2,1500.00,0)').run();

    db.prepare('INSERT INTO coupons VALUES (1,?,10.0,1,0)').run('SAVE10');
    db.prepare('INSERT INTO coupons VALUES (2,?,20.0,3,0)').run('WELCOME20');

    db.prepare('INSERT INTO accounts VALUES (1,1,1000.00)').run();
    db.prepare('INSERT INTO accounts VALUES (2,2,500.00)').run();
  }

  const profileCount = db.prepare('SELECT COUNT(*) as c FROM profiles').get().c;
  if (profileCount === 0) {
    db.prepare('INSERT INTO profiles (user_id,name,email,bio,is_admin) VALUES (?,?,?,?,?)')
      .run(1, 'Alice Smith', 'alice@example.com', 'Just a regular user', 0);
    db.prepare('INSERT INTO profiles (user_id,name,email,bio,is_admin) VALUES (?,?,?,?,?)')
      .run(2, 'Bob Jones', 'bob@example.com', 'Consultant', 0);
    db.prepare('INSERT INTO profiles (user_id,name,email,bio,is_admin) VALUES (?,?,?,?,?)')
      .run(3, 'Admin', 'admin@example.com', 'Site administrator', 1);
  }

  return db;
}

module.exports = { createDatabase };
