// check_login.js — verify DB users and test bcrypt comparison
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

const TEST_USERS = [
  { email: 'superadmin@caresignal.com',   password: 'admin123' },
  { email: 'admin@tanakacare.co.uk',       password: 'Admin123!' },
  { email: 'ri@tanakacare.co.uk',          password: 'Pass123!' },
  { email: 'rm@tanakacare.co.uk',          password: 'Pass123!' },
  { email: 'director@tanakacare.co.uk',    password: 'Pass123!' },
];

async function check() {
  for (const u of TEST_USERS) {
    const res = await pool.query('SELECT email, role, status, password_hash FROM users WHERE email = $1', [u.email]);
    if (res.rows.length === 0) {
      console.log(`❌ NOT FOUND: ${u.email}`);
      continue;
    }
    const row = res.rows[0];
    const match = bcrypt.compareSync(u.password, row.password_hash);
    console.log(`${match ? '✅' : '❌'} ${row.email} [${row.role}][${row.status}] passwd="${u.password}" → ${match ? 'OK' : 'MISMATCH'}`);
  }
  pool.end();
}

check().catch(e => { console.error(e.message); pool.end(); });
