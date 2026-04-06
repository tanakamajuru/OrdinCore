const pg = require('pg');
const client = new pg.Client({
  host: 'localhost',
  port: 5432,
  database: 'caresignal_db',
  user: 'postgres',
  password: 'Chemz@25'
});

client.connect()
  .then(() => client.query(`
    SELECT column_name, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'incidents';
  `))
  .then(r => {
    console.log("COLUMN_DEFAULTS:");
    console.log(JSON.stringify(r.rows, null, 2));
    client.end();
  })
  .catch(e => {
    console.error('ERR:' + e.message);
    client.end();
  });
