const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/caresignal_db' });
client.connect()
  .then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'governance_pulses'"))
  .then(res => {
    console.log('Columns in governance_pulses:', res.rows.map(r => r.column_name).join(', '));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
