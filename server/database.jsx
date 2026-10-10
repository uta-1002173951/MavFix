const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'MavFix',
  password: 'MavFix1301!',
  port: 5432
});

module.exports = pool;
