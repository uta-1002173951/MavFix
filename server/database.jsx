const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const requiredEnvironmentVariables = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
const missingEnvironmentVariables = requiredEnvironmentVariables.filter((name) => !process.env[name]);

if (missingEnvironmentVariables.length > 0) {
  throw new Error(
    `Missing required database environment variables: ${missingEnvironmentVariables.join(', ')}`
  );
}

const port = Number(process.env.PGPORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PGPORT must be a valid port number.');
}

const ssl = { rejectUnauthorized: true };
if (process.env.PGSSLROOTCERT) {
  ssl.ca = fs.readFileSync(process.env.PGSSLROOTCERT, 'utf8');
}

const pool = new Pool({
  host: process.env.PGHOST,
  port,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl
});

module.exports = pool;
