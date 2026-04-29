const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:Chemz%4025@localhost:5432/caresignal_db'
});

async function runMigration() {
  try {
    const sql = fs.readFileSync('src/migrations/RM_governance_alignment_v2.sql', 'utf8');
    await pool.query(sql);
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
