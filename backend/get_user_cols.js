const { Client } = require('pg');
const client = new Client({
  host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25',
});
async function run() {
  await client.connect();
  const res = await client.query("SELECT * FROM users LIMIT 1");
  console.log('User columns:', Object.keys(res.rows[0]));
  await client.end();
}
run();
