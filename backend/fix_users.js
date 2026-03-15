// fix_users.js - Fix role assignments for Tanaka Care users
const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

async function fix() {
  const fixes = [
    { email: 'director@tanakacare.co.uk',  role: 'DIRECTOR',                status: 'active' },
    { email: 'rm@tanakacare.co.uk',         role: 'REGISTERED_MANAGER',       status: 'active' },
    { email: 'ri@tanakacare.co.uk',         role: 'RESPONSIBLE_INDIVIDUAL',   status: 'active' },
    { email: 'admin@tanakacare.co.uk',      role: 'ADMIN',                    status: 'active' },
  ];

  for (const fix of fixes) {
    const res = await pool.query(
      "UPDATE users SET role = $1, status = $2 WHERE email = $3 RETURNING email, role, status",
      [fix.role, fix.status, fix.email]
    );
    if (res.rows.length > 0) {
      console.log(`✅ Fixed: ${res.rows[0].email} → role=${res.rows[0].role}, status=${res.rows[0].status}`);
    } else {
      console.log(`⚠️  Not found: ${fix.email}`);
    }
  }
  pool.end();
}

fix().catch(e => { console.error(e.message); pool.end(); });
