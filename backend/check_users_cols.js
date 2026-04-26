const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'").then(r => {
  console.log('Columns:', r.rows.map(r => r.column_name));
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
