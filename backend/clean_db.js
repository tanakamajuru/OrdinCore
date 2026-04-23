const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'caresignal_db',
  user: 'postgres',
  password: 'Chemz@25',
});

async function clean() {
  await pool.query(`TRUNCATE TABLE companies CASCADE`);
  // Super admin should be recreated or left? `TRUNCATE CASCADE` will wipe everything referencing companies and users.
  // Wait, TRUNCATE cascade on users will wipe out companies if they reference users.
  // Let's re-run the superadmin seed after TRUNCATE.
  await pool.query(`TRUNCATE TABLE users CASCADE`);
  console.log('Truncated all tables.');
  process.exit(0);
}
clean().catch(console.error);
