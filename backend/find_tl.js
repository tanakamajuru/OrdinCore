const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'caresignal_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Chemz@25',
});

async function run() {
  try {
    const res = await pool.query("SELECT email, role FROM users WHERE role IN ('TEAM_LEADER', 'team_leader')");
    console.log('📋 Team Leaders:');
    res.rows.forEach(row => console.log(` - ${row.email} [${row.role}]`));
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
