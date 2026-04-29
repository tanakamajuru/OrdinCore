const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'caresignal_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Chemz@25',
});

async function run() {
  const migrationPath = path.join(__dirname, 'migrations', '034_add_incident_links.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('🚀 Applying migration 034...');
  try {
    await pool.query(sql);
    console.log('✅ Migration 034 applied successfully!');
  } catch (err) {
    console.error('❌ Failed to apply migration 034:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
