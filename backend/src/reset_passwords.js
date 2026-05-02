require('dotenv').config();
const { query } = require('./config/database');
const bcrypt = require('bcryptjs');

async function run() {
    try {
        const hash = await bcrypt.hash('password123', 12);
        const emails = [
            'taylor.rose@ordincore.com',
            'jordan@ordincore.com',
            'chris@ordincore.com',
            'admin@ordincore.com',
            'sam.rivers@ordincore.com'
        ];
        
        for (const email of emails) {
            await query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);
            console.log(`Updated password for ${email}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

run();
