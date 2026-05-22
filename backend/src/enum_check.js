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
        const res = await client.query(`
            SELECT enumlabel 
            FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE pg_type.typname = 'threshold_output_type'
        `);
        console.log('--- ENUM LABELS ---');
        console.log(res.rows.map(r => r.enumlabel));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
check();
