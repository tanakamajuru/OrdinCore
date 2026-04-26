const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

pool.query("SELECT company_id FROM houses WHERE id = '38ba95e5-81a2-409b-992e-862b3f31e889'").then(r => {
  console.log(r.rows);
  process.exit(0);
});
