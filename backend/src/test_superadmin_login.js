const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config();

async function test() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'caresignal_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'Chemz@25',
    });
    try {
        await client.connect();
        const emails = ['superadmin1@ordincore.co.uk', 'superadmin1@ordincore.com'];
        for (const email of emails) {
            const r = await client.query("SELECT password_hash, role FROM users WHERE email = $1", [email]);
            const user = r.rows[0];
            if (!user) {
                console.log(`User ${email} not found`);
                continue;
            }
            console.log(`User: ${email}, Role: ${user.role}, Hash: ${user.password_hash}`);
            const pass = 'SuperSecure123!';
            const valid = await bcrypt.compare(pass, user.password_hash);
            console.log(`Password '${pass}' valid for ${email}: ${valid}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
test();
