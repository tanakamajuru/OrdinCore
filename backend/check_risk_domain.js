const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'governance_pulses' AND column_name = 'risk_domain'").then(r => {
  console.log(r.rows);
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
