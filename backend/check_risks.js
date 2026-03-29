const { Pool } = require('pg');

const pool = new Pool({ 
  host: 'localhost', 
  port: 5432, 
  database: 'caresignal_db', 
  user: 'postgres', 
  password: 'Chemz@25' 
});

async function check() {
  try {
    // Check column defaults
    const colRes = await pool.query(`
      SELECT column_name, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'risks' AND column_name IN ('severity', 'status')
    `);
    console.log('Column defaults:', colRes.rows);
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
