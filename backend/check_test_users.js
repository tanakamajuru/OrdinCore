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

  // Check test users
  const usersRes = await client.query(
    `SELECT email, role, status, first_name, last_name 
     FROM users 
     WHERE email IN ('taylor@ordincore.com','sam@ordincore.com','chris@ordincore.com','pat@ordincore.com','admin@ordincore.com','taylor.rose@ordincore.com','sam.rivers@ordincore.com')
     ORDER BY role`
  );
  console.log('=== TEST USERS ===');
  console.log(JSON.stringify(usersRes.rows, null, 2));

  // Check houses
  const housesRes = await client.query(
    `SELECT id, name, status FROM houses WHERE name IN ('Rose House', 'Oak Lodge') ORDER BY name`
  );
  console.log('\n=== HOUSES ===');
  console.log(JSON.stringify(housesRes.rows, null, 2));

  // Check service users (J Smith)
  const suRes = await client.query(
    `SELECT su.id, su.first_name, su.last_name, su.display_name, h.name as house_name, su.is_active
     FROM service_users su
     LEFT JOIN houses h ON h.id = su.house_id
     WHERE su.last_name ILIKE '%smith%' OR su.display_name ILIKE '%smith%'`
  );
  console.log('\n=== SERVICE USERS (Smith) ===');
  console.log(JSON.stringify(suRes.rows, null, 2));

  // Check user_houses assignments for Taylor
  const assignRes = await client.query(
    `SELECT u.email, h.name as house_name, uh.role_in_house
     FROM user_houses uh
     JOIN users u ON u.id = uh.user_id
     JOIN houses h ON h.id = uh.house_id
     WHERE u.email IN ('taylor@ordincore.com', 'taylor.rose@ordincore.com', 'sam@ordincore.com', 'sam.rivers@ordincore.com')`
  );
  console.log('\n=== USER-HOUSE ASSIGNMENTS ===');
  console.log(JSON.stringify(assignRes.rows, null, 2));

  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
