require('dotenv').config();
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
  const res = await client.query("SELECT email, role FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN')");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

run().catch(console.error);
