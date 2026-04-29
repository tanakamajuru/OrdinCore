import './src/config/env';
import { query } from './src/config/database';

async function run() {
    try {
        const res = await query("SELECT DISTINCT status FROM risks");
        console.log('Risk Statuses:', res.rows.map(r => (r as any).status));







    } catch (err) {

        console.error('Query failed:', err);
    } finally {
        process.exit();
    }
}

run();
