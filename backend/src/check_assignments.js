const { Client } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

async function check() {
    const client = new Client({
        host: process.env.DB_HOST, port: process.env.DB_PORT,
        database: process.env.DB_NAME, user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
    try {
        await client.connect();
        const r = await client.query("SELECT * FROM user_houses WHERE user_id = '11111111-1111-1111-1111-111111111102'");
        console.log('Assignments:');
        console.table(r.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
check();
