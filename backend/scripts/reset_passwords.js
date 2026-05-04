const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config();

async function resetPasswords() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Chemz@25@localhost:5432/caresignal_db'
  });

  try {
    await client.connect();
    const hash = await bcrypt.hash('admin123', 10);
    
    const emails = [
      'taylor@ordincore.com',
      'sam@ordincore.com',
      'chris@ordincore.com',
      'casey@ordincore.com',
      'alex@ordincore.com',
      'jordan@ordincore.com',
      'pat@ordincore.com',
      'admin@ordincore.com'
    ];

    for (const email of emails) {
      await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);
      console.log(`Reset password for ${email}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

resetPasswords();
