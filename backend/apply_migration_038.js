const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function run() {
  const migrationPath = path.join(__dirname, 'src', 'migrations', '038_action_completion_weekly_validation.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('🚀 Applying migration 038...');
  try {
    await pool.query(sql);
    console.log('✅ Migration 038 applied successfully!');
  } catch (err) {
    console.error('❌ Failed to apply migration 038:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
