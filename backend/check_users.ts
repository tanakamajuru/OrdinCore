import './src/config/env';
import { query } from './src/config/database';

async function run() {
    try {
        const res = await query("SELECT id, email, role FROM users WHERE email = 'dir@oakwoodcare.co.uk'");
        console.log('User found:', res.rows);
        
        if (res.rows.length === 0) {
            console.log('User not found. Listing all users...');
            const allUsers = await query("SELECT id, email, role FROM users LIMIT 20");
            console.log('All users:', allUsers.rows);
        }
    } catch (err) {
        console.error('Query failed:', err);
    } finally {
        process.exit();
    }
}

run();
