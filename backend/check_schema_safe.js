const { Client } = require('pg');
require('dotenv').config();

async function checkSchema() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'caresignal_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Chemz@25',
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'risks'
    `);
    console.log('Columns in "risks":');
    console.log(res.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error('Error checking schema:', err);
  } finally {
    await client.end();
  }
}

checkSchema();
