const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:Chemz%4025@localhost:5432/caresignal_db'
});

async function check() {
  try {
    const res = await pool.query("SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public'");
    console.log('Existing types:', res.rows.map(r => r.typname).join(', '));
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await pool.end();
  }
}

check();
