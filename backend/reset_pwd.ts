import './src/config/env';
import { query } from './src/config/database';
import bcrypt from 'bcryptjs';

async function run() {
    try {
        const passwordHash = await bcrypt.hash('Password123', 12);
        await query("UPDATE users SET password_hash = $1 WHERE email = 'dir@oakwoodcare.co.uk'", [passwordHash]);
        console.log('Password reset successfully for dir@oakwoodcare.co.uk to Password123');
    } catch (err) {
        console.error('Reset failed:', err);
    } finally {
        process.exit();
    }
}

run();
