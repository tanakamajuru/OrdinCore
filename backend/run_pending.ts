import './src/config/env';
import { query } from './src/config/database';
import fs from 'fs';
import path from 'path';

async function run() {
    const pending = [
        '032_fix_risk_signal_links.sql',
        '033_fix_escalations_house_id.sql',
        '034_add_incident_links.sql',
        '035_stabilize_schema.sql',
        '036_ri_governance_alignment.sql',
        '037_director_governance_alignment.sql'
    ];
    
    for (const file of pending) {
        try {
            console.log(`Running migration ${file}...`);
            const sql = fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8');
            await query(sql);
            await query("INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING", [file]);
            console.log(`Migration ${file} successful`);
        } catch (err) {
            console.error(`Migration ${file} failed:`, (err as Error).message);
            if (file === '032_fix_risk_signal_links.sql') {
                console.log('Skipping 032 as it is known to fail due to duplicate data in this env.');
            } else {
                // For other files, we might want to stop, but let's try to continue for 036/037
            }
        }
    }
    process.exit();
}

run();
