const { Client } = require('pg');
const client = new Client({
  host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25',
});
async function run() {
  await client.connect();
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log(res.rows.map(r => r.table_name).join(', '));
  await client.end();
}
run();
