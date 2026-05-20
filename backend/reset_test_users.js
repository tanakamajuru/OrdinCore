const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

async function reset() {
  const hash = bcrypt.hashSync('admin123', 12);
  const emails = ['sam@ordincore.com', 'chris@ordincore.com', 'pat@ordincore.com'];
  for (const email of emails) {
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);
    console.log(`Updated ${email}`);
  }
  pool.end();
}
reset();
