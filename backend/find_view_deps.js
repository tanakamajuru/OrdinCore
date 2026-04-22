const { Client } = require('pg');
require('dotenv').config();

async function findDependencies() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Chemz@25',
    database: process.env.DB_NAME || 'caresignal_db',
  });

  try {
    await client.connect();
    
    // Find views using the risks table
    const viewsRes = await client.query(`
      SELECT DISTINCT viewname 
      FROM pg_views 
      WHERE schemaname = 'public' 
      AND definition ILIKE '%risks%';
    `);
    
    console.log('--- Dependent Views ---');
    console.log(JSON.stringify(viewsRes.rows, null, 2));

    for (const row of viewsRes.rows) {
        const def = await client.query(`SELECT pg_get_viewdef($1, true) as def`, [row.viewname]);
        console.log(`\n--- Definition of [${row.viewname}] ---`);
        console.log(def.rows[0].def);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

findDependencies();
