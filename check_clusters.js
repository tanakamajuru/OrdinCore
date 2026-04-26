const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'caresignal',
  user: 'postgres',
  password: 'postgres',
});

async function run() {
  const res = await pool.query('SELECT * FROM signal_clusters');
  console.log(res.rows);
  process.exit(0);
}

run();
