const { Client } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

async function fixColumns() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        const tables = ['daily_governance_log', 'action_effectiveness', 'risk_candidates'];
        
        for (const table of tables) {
            const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
            console.log(`Table ${table} has columns: ${res.rows.map(r => r.column_name).join(', ')}`);
        }

        console.log('Adding missing columns to daily_governance_log...');
        await client.query(`ALTER TABLE daily_governance_log ADD COLUMN IF NOT EXISTS is_deputy_review BOOLEAN DEFAULT FALSE`);
        await client.query(`ALTER TABLE daily_governance_log ADD COLUMN IF NOT EXISTS review_type VARCHAR(20) DEFAULT 'Primary'`);
        await client.query(`ALTER TABLE daily_governance_log ADD COLUMN IF NOT EXISTS escalation_sent BOOLEAN DEFAULT FALSE`);
        await client.query(`ALTER TABLE daily_governance_log ADD COLUMN IF NOT EXISTS director_alerted_at TIMESTAMP WITH TIME ZONE`);
        await client.query(`ALTER TABLE daily_governance_log ADD COLUMN IF NOT EXISTS enhanced_oversight_required BOOLEAN DEFAULT FALSE`);
        await client.query(`ALTER TABLE daily_governance_log ADD COLUMN IF NOT EXISTS director_notified_at TIMESTAMP WITH TIME ZONE`);

        console.log('Adding missing columns to action_effectiveness...');
        await client.query(`ALTER TABLE action_effectiveness ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);

        console.log('Adding missing columns to risk_candidates...');
        await client.query(`ALTER TABLE risk_candidates ADD COLUMN IF NOT EXISTS linked_risk_id UUID REFERENCES risks(id) ON DELETE SET NULL`);

        console.log('All missing columns added successfully.');

    } catch (err) {
        console.error('Error', err);
    } finally {
        await client.end();
    }
}

fixColumns();
