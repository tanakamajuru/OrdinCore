const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: __dirname + '/../.env' });

async function setup() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
    try {
        await client.connect();
        const companyId = '11111111-1111-1111-1111-111111111111';
        const roseHouseId = '11111111-2222-3333-4444-555555555555';

        // Check houses schema first
        const colsRes = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'houses' ORDER BY ordinal_position");
        console.log('Houses columns:', colsRes.rows.map(r => r.column_name).join(', '));

        // 1. Create Oak Lodge if it doesn't exist
        const oakLodgeId = '22222222-2222-3333-4444-555555555555';
        await client.query(`
            INSERT INTO houses (id, name, company_id, address, capacity)
            VALUES ($1, 'Oak Lodge', $2, '45 Oak Lane, Bristol BS1 2AB', 6)
            ON CONFLICT (id) DO NOTHING
        `, [oakLodgeId, companyId]);
        console.log('Oak Lodge created (or already exists)');

        // 2. Get Sam Rivers' user ID
        const samRes = await client.query("SELECT id FROM users WHERE email = 'sam.rivers@ordincore.com'");
        const samId = samRes.rows[0]?.id;
        if (!samId) { console.error('Sam Rivers not found!'); return; }
        console.log('Sam Rivers ID:', samId);

        // 3. Assign Sam to Oak Lodge
        await client.query(`
            INSERT INTO user_houses (user_id, house_id, company_id) 
            VALUES ($1, $2, $3) 
            ON CONFLICT DO NOTHING
        `, [samId, oakLodgeId, companyId]);
        console.log('Sam assigned to Oak Lodge');

        // 4. Create some governance pulses for both houses to seed pattern detection
        const domains = ['Behaviour', 'Medication', 'Falls', 'Staffing', 'Safeguarding'];
        const severities = ['Low', 'Moderate', 'High', 'Critical'];
        const signalTypes = ['Observation', 'Incident', 'Concern', 'Safeguarding'];
        const patternConcerns = ['None', 'Possible', 'Possible repeat', 'Escalating'];
        
        const houses = [
            { id: roseHouseId, name: 'Rose House' },
            { id: oakLodgeId, name: 'Oak Lodge' }
        ];

        for (const house of houses) {
            // Create 8 pulses per house across different domains
            for (let i = 0; i < 8; i++) {
                const domain = domains[i % domains.length];
                const severity = severities[i % severities.length];
                const signalType = signalTypes[i % signalTypes.length];
                const patternConcern = patternConcerns[i % patternConcerns.length];
                const daysAgo = Math.floor(Math.random() * 5); // within last 5 days
                const entryDate = new Date();
                entryDate.setDate(entryDate.getDate() - daysAgo);
                
                const pulseId = uuidv4();
                await client.query(`
                    INSERT INTO governance_pulses (
                        id, company_id, house_id, created_by, entry_date, entry_time,
                        signal_type, risk_domain, description, severity,
                        has_happened_before, pattern_concern, escalation_required,
                        review_status, immediate_action
                    ) VALUES (
                        $1, $2, $3, $4, $5, '09:00',
                        $6, $7, $8, $9,
                        'Yes', $10, 'None',
                        'New', 'Documented and monitored'
                    ) ON CONFLICT DO NOTHING
                `, [
                    pulseId, companyId, house.id, samId, 
                    entryDate.toISOString().split('T')[0],
                    signalType, [domain],
                    `${domain} concern observed at ${house.name} - ${signalType} #${i+1}`,
                    severity, patternConcern
                ]);
            }
            console.log(`Created 8 pulses for ${house.name}`);
        }

        // 5. Create signal clusters for pattern detection results
        for (const house of houses) {
            for (const domain of ['Behaviour', 'Medication', 'Falls']) {
                const clusterId = uuidv4();
                await client.query(`
                    INSERT INTO signal_clusters (id, company_id, house_id, risk_domain, signal_count, cluster_status, first_signal_date, last_signal_date, cluster_label)
                    VALUES ($1, $2, $3, $4, $5, 'Emerging', NOW() - INTERVAL '5 days', NOW(), $6)
                    ON CONFLICT DO NOTHING
                `, [clusterId, companyId, house.id, domain, 3 + Math.floor(Math.random() * 5), `${domain} Pattern Cluster`]);
                
                // 6. Create risk candidates linked to clusters
                await client.query(`
                    INSERT INTO risk_candidates (id, company_id, house_id, cluster_id, risk_domain, candidate_type, source_signals, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'New')
                    ON CONFLICT DO NOTHING
                `, [uuidv4(), companyId, house.id, clusterId, domain, 
                    domain === 'Falls' ? 'Risk Review Required' : 'Pattern Emerging', 
                    '{}']);
            }
            console.log(`Created clusters + candidates for ${house.name}`);
        }

        // Verify
        const verifyHouses = await client.query(`SELECT h.name FROM user_houses uh JOIN houses h ON h.id = uh.house_id JOIN users u ON u.id = uh.user_id WHERE u.email = 'sam.rivers@ordincore.com'`);
        console.log('\nSam now has houses:', verifyHouses.rows.map(r => r.name));

        const verifyClusters = await client.query('SELECT COUNT(*) FROM signal_clusters WHERE company_id = $1', [companyId]);
        console.log('Signal clusters:', verifyClusters.rows[0].count);

        const verifyCandidates = await client.query("SELECT COUNT(*) FROM risk_candidates WHERE company_id = $1 AND status = 'New'", [companyId]);
        console.log('Risk candidates (New):', verifyCandidates.rows[0].count);

        const verifyPulses = await client.query('SELECT COUNT(*) FROM governance_pulses WHERE company_id = $1', [companyId]);
        console.log('Total pulses:', verifyPulses.rows[0].count);

        console.log('\n✅ Setup complete!');

    } catch (err) {
        console.error('Error', err);
    } finally {
        await client.end();
    }
}
setup();
