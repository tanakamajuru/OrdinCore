const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

pool.query("SELECT * FROM reports ORDER BY created_at DESC LIMIT 1").then(r => {
  console.log(r.rows);
  process.exit(0);
});
