const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'escalations'").then(r => {
  console.log('Columns in escalations:', r.rows);
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
