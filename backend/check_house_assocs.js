const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

pool.query("SELECT column_name, table_name FROM information_schema.columns WHERE column_name LIKE '%house%' OR table_name = 'user_houses'").then(r => {
  console.log('Results:', r.rows);
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
