import './src/config/env';
import { query } from './src/config/database';

import fs from 'fs';
import path from 'path';

async function run() {
    try {
        const sqlPath = path.join(__dirname, 'migrations', '037_director_governance_alignment.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Running migration 037...');
        await query(sql);
        console.log('Migration 037 successful');
        
        // Also mark as done in _migrations table if it exists
        try {
            await query("INSERT INTO _migrations (name) VALUES ('037_director_governance_alignment.sql') ON CONFLICT DO NOTHING");
        } catch (e) {
            console.log('Could not update _migrations table (maybe it uses a different schema)');
        }
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

run();
