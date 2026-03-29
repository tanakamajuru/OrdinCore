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
  console.log('🔍 Checking tables in database:', process.env.DB_NAME || 'caresignal_db');
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('📋 Tables found:');
    res.rows.forEach(row => console.log(' -', row.table_name));
  } catch (err) {
    console.error('❌ Error checking tables:', err.message);
  } finally {
    await pool.end();
  }
}

run();
