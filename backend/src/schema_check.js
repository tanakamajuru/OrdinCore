const { Client } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

async function check() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
    try {
        await client.connect();
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'governance_pulses' ORDER BY ordinal_position");
        console.log('governance_pulses columns:', res.rows.map(r => r.column_name).join(', '));
        
        // Also check user_houses columns
        const uhRes = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_houses' ORDER BY ordinal_position");
        console.log('\nuser_houses columns:', uhRes.rows.map(r => r.column_name).join(', '));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
check();
