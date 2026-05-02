const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: __dirname + '/../.env' });

async function seed() {
    const client = new Client({
        host: process.env.DB_HOST, port: process.env.DB_PORT,
        database: process.env.DB_NAME, user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
    try {
        await client.connect();
        const companyId = '11111111-1111-1111-1111-111111111111';
        const samId = '11111111-1111-1111-1111-111111111102';

        // Check existing categories
        const existing = await client.query('SELECT * FROM risk_categories WHERE company_id = $1', [companyId]);
        console.log('Existing categories:', existing.rows.length);

        if (existing.rows.length === 0) {
            const cats = [
                { name: 'Clinical & Care', description: 'Risks related to clinical practice and care delivery', color: '#DC2626' },
                { name: 'Safeguarding', description: 'Safeguarding concerns and adult protection', color: '#EA580C' },
                { name: 'Medication', description: 'Medication errors, administration and storage', color: '#D97706' },
                { name: 'Falls & Mobility', description: 'Falls prevention and mobility risks', color: '#CA8A04' },
                { name: 'Behaviour', description: 'Behavioural concerns and support needs', color: '#65A30D' },
                { name: 'Staffing & Workforce', description: 'Staff competence, recruitment, and capacity', color: '#0891B2' },
                { name: 'Environmental', description: 'Premises, equipment and environmental hazards', color: '#7C3AED' },
                { name: 'Infection Control', description: 'Infection prevention and outbreak management', color: '#BE185D' },
            ];
            for (const cat of cats) {
                await client.query(
                    'INSERT INTO risk_categories (id, company_id, name, description, color) VALUES ($1,$2,$3,$4,$5)',
                    [uuidv4(), companyId, cat.name, cat.description, cat.color]
                );
            }
            console.log('Created', cats.length, 'risk categories');
        }

        // Verify
        const final = await client.query('SELECT id, name, color FROM risk_categories WHERE company_id = $1', [companyId]);
        console.table(final.rows);

        // Also check the route is wired
        const route = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'risk_categories' ORDER BY ordinal_position");
        console.log('\nrisk_categories columns:', route.rows.map(r => r.column_name).join(', '));

    } catch (err) {
        console.error('Error', err);
    } finally {
        await client.end();
    }
}
seed();
