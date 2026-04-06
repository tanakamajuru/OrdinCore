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
    AND conname = 'incidents_severity_check'
  `))
  .then(r => {
    if (r.rows.length > 0) {
      console.log("EXACT_CONSTRAINT_START");
      console.log(r.rows[0].def);
      console.log("EXACT_CONSTRAINT_END");
    } else {
      console.log("CONSTRAINT_NOT_FOUND");
    }
    client.end();
  })
  .catch(e => {
    console.error('ERR:' + e.message);
    client.end();
  });
