const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'caresignal_db',
  user: 'postgres',
  password: 'Chemz@25',
});

async function run() {
  try {
    await client.connect();
    
    // Check columns
    const columnsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'service_users'
    `);
    console.log('Columns in service_users:');
    columnsRes.rows.forEach(col => console.log(` - ${col.column_name}: ${col.data_type}`));

    // Fetch records
    const usersRes = await client.query(`
      SELECT id, first_name, last_name, display_name, house_id, is_active 
      FROM service_users 
      LIMIT 10
    `);
    console.log('\nRecords in service_users:');
    usersRes.rows.forEach(user => console.log(JSON.stringify(user)));

  } catch (err) {
    console.error('Error querying service_users:', err);
  } finally {
    await client.end();
    process.exit(0);
  }
}

run();
