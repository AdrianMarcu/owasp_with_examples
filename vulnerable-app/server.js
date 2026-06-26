const express = require('express');
const path = require('path');
const { createDatabase } = require('./database');

const app = express();
const db = createDatabase();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/slides', express.static(path.join(__dirname, '../presentation/public/slides')));

app.use('/a01', require('./routes/a01-access-control')(db));
app.use('/a02', require('./routes/a02-misconfiguration')(db));
app.use('/a03', require('./routes/a03-supply-chain')(db));
app.use('/a04', require('./routes/a04-crypto')(db));
app.use('/a05', require('./routes/a05-injection')(db));
app.use('/a06', require('./routes/a06-insecure-design')(db));
const makeA07 = require('./routes/a07-auth-failures');
app.use('/a07', makeA07(db));
app.use('/reset', require('./routes/reset')(db, makeA07.resetLimiter));
app.use('/a08', require('./routes/a08-integrity')(db));
app.use('/a09', require('./routes/a09-logging')(db));
app.use('/a10', require('./routes/a10-error-handling')(db));
app.use('/a11', require('./routes/a11-mass-assignment')(db));

if (require.main === module) {
  app.listen(4000, () => console.log('Vulnerable app → http://localhost:4000'));
}

module.exports = app;
