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
  const tableNames = ['houses', 'service_units', 'incidents', 'risks', 'user_houses', 'user_service_units'];
  for (const tableName of tableNames) {
    try {
      const res = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
      console.log(`Table: ${tableName.padEnd(20)} | Count: ${res.rows[0].count}`);
    } catch (err) {
      console.log(`Table: ${tableName.padEnd(20)} | Error: ${err.message}`);
    }
  }
  await pool.end();
}

run();
