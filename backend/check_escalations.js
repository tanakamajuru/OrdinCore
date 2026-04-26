const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

pool.query("SELECT * FROM escalations").then(r => {
  console.log('Escalations:', r.rows);
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
