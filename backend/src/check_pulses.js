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
        const r = await client.query("SELECT * FROM governance_pulses LIMIT 1");
        console.log('Pulse Row Keys:');
        if (r.rows.length > 0) {
            console.log(Object.keys(r.rows[0]));
        } else {
            console.log('No rows found');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
check();
