// reset_admin.js - Reset admin@tanakacare.co.uk password to Admin123!
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

async function reset() {
  const newHash = bcrypt.hashSync('Admin123!', 10);
  const res = await pool.query(
    "UPDATE users SET password_hash = $1, status = 'active' WHERE email = 'admin@tanakacare.co.uk' RETURNING email, role, status",
    [newHash]
  );
  if (res.rows.length > 0) {
    console.log('✅ Password reset for:', res.rows[0]);
  } else {
    console.log('❌ User admin@tanakacare.co.uk not found');
  }
  pool.end();
}

reset().catch(e => { console.error(e.message); pool.end(); });
