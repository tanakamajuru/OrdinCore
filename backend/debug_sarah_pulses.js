const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'caresignal_db',
  user: 'postgres',
  password: 'Chemz@25',
});

async function check() {
  try {
    await client.connect();
    
    // Check Sarah's info
    const sarahRes = await client.query("SELECT id, company_id, role FROM users WHERE email = 'sarah.t@sunrise.care'");
    const sarah = sarahRes.rows[0];
    console.log('Sarah:', sarah);

    // Check her house mapping
    const houseRes = await client.query("SELECT house_id, role_in_house FROM user_houses WHERE user_id = $1", [sarah.id]);
    console.log('Sarah Houses:', houseRes.rows);

    // Check pulses in the system
    const pulseCount = await client.query("SELECT COUNT(*) FROM governance_pulses");
    console.log('Total Pulses:', pulseCount.rows[0].count);

    // Check pulses specifically for her house
    if (houseRes.rows.length > 0) {
        const houseId = houseRes.rows[0].house_id;
        const housePulses = await client.query("SELECT id, created_by, signal_type, severity, review_status FROM governance_pulses WHERE house_id = $1", [houseId]);
        console.log('Pulses for Sarah\'s House:', housePulses.rows);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

check();
