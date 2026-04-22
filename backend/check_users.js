const { Client } = require('pg');

async function checkUsers() {
  const client = new Client({
    connectionString: "postgresql://postgres:postgres@localhost:5432/caresignal_db"
  });
  try {
    await client.connect();
    const res = await client.query("SELECT id, email, first_name, last_name, role FROM users WHERE email IN ('sarah.t@sunrise.care', 'mark.d@sunrise.care')");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkUsers();
