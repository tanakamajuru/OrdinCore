const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

pool.query("ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_type_check;").then(() => {
  console.log('Constraint dropped');
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
