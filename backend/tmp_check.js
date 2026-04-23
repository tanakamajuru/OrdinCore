const { Pool } = require('pg'); 
const pool = new Pool({host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25'}); 
pool.query("SELECT pg_get_constraintdef(oid) as cdef FROM pg_constraint WHERE conname = 'users_role_check';").then(res => console.log(res.rows)).catch(console.error).finally(()=>pool.end());
