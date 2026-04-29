import './src/config/env';
import { query } from './src/config/database';
import fs from 'fs';
import path from 'path';

async function run() {
    try {
        const res = await query("SELECT filename FROM _migrations");
        const executed = res.rows.map(r => (r as any).filename);

        console.log('Executed migrations:', executed);
        
        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
        
        const pending = files.filter(f => !executed.includes(f));
        console.log('Pending migrations:', pending);
    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        process.exit();
    }
}

run();
