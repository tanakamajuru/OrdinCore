const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

pool.query("SELECT * FROM signal_clusters WHERE house_id = '38ba95e5-81a2-409b-992e-862b3f31e889'").then(r => {
  console.log('Clusters for Site 1:', r.rows);
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
