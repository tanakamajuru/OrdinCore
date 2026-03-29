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
  const tableName = 'governance_pulse_answers';
  console.log(`🔍 Checking schema of TABLE: ${tableName}`);
  try {
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);
    console.log(`📋 Columns for ${tableName}:`);
    res.rows.forEach(row => console.log(` - ${row.column_name} (${row.data_type}, ${row.is_nullable})`));
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
