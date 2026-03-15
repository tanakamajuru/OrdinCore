// reset_all_passwords.js — Reset passwords for ALL Tanaka Care users and verify
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

const USERS = [
  { email: 'superadmin@caresignal.com',    password: 'admin123',  },
  { email: 'admin@tanakacare.co.uk',        password: 'Admin123!', },
  { email: 'ri@tanakacare.co.uk',           password: 'Pass123!',  },
  { email: 'rm@tanakacare.co.uk',           password: 'Pass123!',  },
  { email: 'director@tanakacare.co.uk',     password: 'Pass123!',  },
];

async function reset() {
  for (const u of USERS) {
    const hash = bcrypt.hashSync(u.password, 12);
    const res = await pool.query(
      "UPDATE users SET password_hash = $1, status = 'active' WHERE email = $2 RETURNING email, role, status",
      [hash, u.email]
    );
    if (res.rows.length > 0) {
      const verify = bcrypt.compareSync(u.password, hash);
      console.log(`${verify ? '✅' : '❌'} ${res.rows[0].email} [${res.rows[0].role}] — password="${u.password}" hash valid=${verify}`);
    } else {
      console.log(`⚠️  Not found: ${u.email}`);
    }
  }
  pool.end();
}

reset().catch(e => { console.error(e.message); pool.end(); });
