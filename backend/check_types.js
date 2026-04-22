const { Client } = require('pg');
require('dotenv').config();

async function checkTypes() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Chemz@25',
    database: process.env.DB_NAME || 'caresignal_db',
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'risks' AND column_name IN ('trajectory', 'source_cluster_id');
    `);
    console.log('Column details:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkTypes();
