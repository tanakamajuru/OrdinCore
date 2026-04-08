require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  await client.connect();
  const hash = await bcrypt.hash('admin123', 12);
  const res = await client.query("UPDATE users SET password_hash = $1 WHERE email = $2", [hash, 'superadmin@caresignal.com']);
  console.log('Password updated for superadmin@caresignal.com');
  await client.end();
}

run().catch(console.error);
