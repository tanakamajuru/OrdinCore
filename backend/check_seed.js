const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'caresignal_db',
  user: 'postgres',
  password: 'Chemz@25',
});

async function check() {
  const comp = await pool.query(`SELECT count(*) FROM companies WHERE name='Sunrise Care Group Ltd'`);
  const users = await pool.query(`SELECT count(*) FROM users WHERE email LIKE '%@sunrise.care'`);
  console.log(`Companies: ${comp.rows[0].count}`);
  console.log(`Users: ${users.rows[0].count}`);
  process.exit(0);
}
check().catch(console.error);
