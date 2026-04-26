const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

pool.query("SELECT * FROM risk_signal_links WHERE cluster_id = 'a884ab3d-bced-4f05-ad7c-9d169a141b56'").then(r => {
  console.log(r.rows);
  process.exit(0);
});
