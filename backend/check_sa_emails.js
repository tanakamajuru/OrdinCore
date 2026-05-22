const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'caresignal_db',
  user: 'postgres',
  password: 'Chemz@25',
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT email, role, status, password_hash FROM users WHERE role = 'SUPER_ADMIN'");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
