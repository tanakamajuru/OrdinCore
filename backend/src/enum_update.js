const { Client } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

async function fix() {
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

        // Check current enum labels
        const resBefore = await client.query(`
            SELECT enumlabel 
            FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE pg_type.typname = 'threshold_output_type'
        `);
        const labels = resBefore.rows.map(r => r.enumlabel);
        console.log('Current labels:', labels);

        if (!labels.includes('Immediate Alert')) {
            console.log('Adding "Immediate Alert" to threshold_output_type...');
            await client.query(`ALTER TYPE threshold_output_type ADD VALUE 'Immediate Alert'`);
        }
        if (!labels.includes('Immediate Risk')) {
            console.log('Adding "Immediate Risk" to threshold_output_type...');
            await client.query(`ALTER TYPE threshold_output_type ADD VALUE 'Immediate Risk'`);
        }

        const resAfter = await client.query(`
            SELECT enumlabel 
            FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE pg_type.typname = 'threshold_output_type'
        `);
        console.log('Updated labels:', resAfter.rows.map(r => r.enumlabel));
        console.log('Fix applied successfully!');
    } catch (err) {
        console.error('Error applying fix:', err);
    } finally {
        await client.end();
    }
}
fix();
