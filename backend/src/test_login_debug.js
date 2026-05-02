const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

async function test() {
    const client = new Client({
        host: process.env.DB_HOST, port: process.env.DB_PORT,
        database: process.env.DB_NAME, user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
    try {
        await client.connect();
        const r = await client.query("SELECT email, password_hash FROM users WHERE email = 'sam@ordincore.com'");
        const user = r.rows[0];
        console.log('User:', user.email);
        console.log('Hash in DB:', user.password_hash);
        const valid = await bcrypt.compare('Password123!', user.password_hash);
        console.log('Password valid:', valid);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
test();
