const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

pool.query("SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE c.conname = 'report_requests_report_type_check' OR c.conname = 'report_requests_type_check'").then(r => {
  console.log(r.rows);
  process.exit(0);
});
