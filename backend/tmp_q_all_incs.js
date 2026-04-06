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
    SELECT pg_get_constraintdef(oid) as def 
    FROM pg_constraint 
    WHERE conrelid = 'incidents'::regclass
  `))
  .then(r => {
    r.rows.forEach(row => {
      console.log("CONSTRAINT_DEF:" + row.def);
    });
    client.end();
  })
  .catch(e => {
    console.error('ERR:' + e.message);
    client.end();
  });
