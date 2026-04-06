const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'caresignal_db',
  user: 'postgres',
  password: 'Chemz@25',
});

async function findUsers() {
  try {
    await client.connect();
    // Get columns first
    const colsRes = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    const cols = colsRes.rows.map(r => r.column_name);
    console.log('Columns:', cols.join(', '));

    // Get a few users
    const res = await client.query("SELECT email, role FROM users LIMIT 10");
    console.log('Users:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await client.end();
  }
}

findUsers();
