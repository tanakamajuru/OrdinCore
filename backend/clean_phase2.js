const { Pool } = require('pg'); 
const pool = new Pool({host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25'}); 
const q = `DELETE FROM users WHERE email NOT IN ('superadmin@caresignal.com', 'admin@sunrise.care'); DELETE FROM houses;`; 
pool.query(q).then(() => console.log('Cleaned phase 2')).catch(console.error).finally(()=>pool.end());
