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
    SELECT conname, pg_get_constraintdef(oid) as def 
    FROM pg_constraint 
    WHERE conrelid = 'incidents'::regclass
  `))
  .then(r => {
    console.log(JSON.stringify(r.rows, null, 2));
    client.end();
  })
  .catch(e => {
    console.error('ERR:' + e.message);
    client.end();
  });
