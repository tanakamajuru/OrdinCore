const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'caresignal_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Chemz@25',
});

async function run() {
  const tableNames = ['incidents', 'incident_categories', 'houses', 'service_units', 'risks', 'user_houses', 'user_service_units'];
  const schema = {};
  for (const tableName of tableNames) {
    try {
      const res = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);
      schema[tableName] = res.rows;
    } catch (err) {
      schema[tableName] = { error: err.message };
    }
  }
  fs.writeFileSync('schema_dump.json', JSON.stringify(schema, null, 2));
  await pool.end();
  console.log('✅ Schema dumped to schema_dump.json');
}

run();
