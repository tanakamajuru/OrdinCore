const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

// We need an RM user to test. Let's find one.
pool.query("SELECT id, company_id, role, assigned_house_id FROM users WHERE role = 'REGISTERED_MANAGER' LIMIT 1").then(async r => {
  console.log('RM User:', r.rows[0]);
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
