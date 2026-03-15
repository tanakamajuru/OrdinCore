// activate_users.js - Activate director and admin accounts
const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

pool.query(
  "UPDATE users SET status = 'active' WHERE email IN ('director@tanakacare.co.uk', 'admin@tanakacare.co.uk') RETURNING email, status, role"
).then(r => {
  console.log('Activated accounts:', r.rows);
  pool.end();
}).catch(e => {
  console.error('Error:', e.message);
  pool.end();
});
