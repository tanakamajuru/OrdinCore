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
    AND conname LIKE '%status%'
  `))
  .then(r => {
    r.rows.forEach(row => {
      const def = row.def;
      const matches = def.match(/'([^']+)'/g);
      console.log("STATUS_VALUES:" + (matches ? matches.join(',') : 'none'));
    });
    client.end();
  })
  .catch(e => {
    console.error('ERR:' + e.message);
    client.end();
  });
