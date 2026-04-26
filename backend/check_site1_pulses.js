const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

pool.query("SELECT id, completed_at, risk_domain, severity, pattern_concern FROM governance_pulses WHERE house_id = '38ba95e5-81a2-409b-992e-862b3f31e889'").then(r => {
  console.log('Pulses for Site 1:', r.rows);
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
