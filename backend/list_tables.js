const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:Chemz%4025@localhost:5432/caresignal_db'
});

async function check() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('Existing tables:', res.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await pool.end();
  }
}

check();
