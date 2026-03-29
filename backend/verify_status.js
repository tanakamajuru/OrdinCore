const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'caresignal_db',
  user: 'postgres',
  password: 'Chemz@25',
});

async function verify() {
  try {
    const result = await pool.query("SELECT email, status, (status = 'active') as is_active FROM users LIMIT 1");
    console.log(result.rows);
  } finally {
    await pool.end();
  }
}
verify();
