const { createDatabase } = require('../database');

function makeTestDb() {
  return createDatabase(':memory:');
}

module.exports = { makeTestDb };
