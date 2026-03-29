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
  const tableNames = ['incidents', 'risks'];
  for (const tableName of tableNames) {
    console.log(`🔍 Checking FKs for TABLE: ${tableName}`);
    try {
      const res = await pool.query(`
        SELECT
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1;
      `, [tableName]);
      res.rows.forEach(row => {
        console.log(` - ${row.column_name} -> ${row.foreign_table_name}(${row.foreign_column_name})`);
      });
    } catch (err) {
      console.error('❌ Error:', err.message);
    }
  }
  await pool.end();
}

run();
