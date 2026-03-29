const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'caresignal_db',
  user: 'postgres',
  password: 'Chemz@25',
});

async function checkUser() {
  try {
    const r = await pool.query("SELECT email, company_id FROM users WHERE email = 'superadmin@caresignal.com'");
    console.log(r.rows);
  } finally {
    await pool.end();
  }
}
checkUser();
