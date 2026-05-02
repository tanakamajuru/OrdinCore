const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/ordin_core' });
client.connect().then(async () => {
  const res = await client.query("SELECT id, company_id, name FROM houses WHERE id = '33333333-3333-3333-4444-555555555555'");
  console.log(res.rows);
  client.end();
});
