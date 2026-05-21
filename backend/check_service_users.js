const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:Chemz%4025@localhost:5432/caresignal_db'
});

async function check() {
  try {
    const res = await pool.query("SELECT id, first_name, last_name, display_name, house_id, is_active FROM service_users LIMIT 50");
    console.log('Service Users:', JSON.stringify(res.rows, null, 2));

    const housesRes = await pool.query("SELECT id, name FROM houses");
    console.log('Houses:', JSON.stringify(housesRes.rows, null, 2));

    const userHousesRes = await pool.query("SELECT user_id, house_id FROM user_houses");
    console.log('User Houses Assignments:', JSON.stringify(userHousesRes.rows, null, 2));
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await pool.end();
  }
}

check();
