import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function seed() {
    console.log('🚀 Starting Realistic Data Seeding...');
    const companyId = '11111111-1111-1111-1111-111111111111';

    try {
        await pool.query('BEGIN');

        // 0. Ensure company exists
        console.log('🏢 Ensuring company exists...');
        const companyResult = await pool.query(
            `INSERT INTO companies (id, name, status, created_at, updated_at)
             VALUES ($1, $2, 'active', NOW(), NOW())
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [companyId, 'OrdinCore Demo Company']
        );

        // 1. Clear existing dynamic data
        console.log('🧹 Clearing old data...');
        await pool.query('DELETE FROM governance_pulses WHERE company_id = $1', [companyId]);
        await pool.query('DELETE FROM signal_clusters WHERE company_id = $1', [companyId]);
        await pool.query('DELETE FROM risk_candidates WHERE company_id = $1', [companyId]);
        await pool.query('DELETE FROM risks WHERE company_id = $1', [companyId]);
        await pool.query('DELETE FROM incidents WHERE company_id = $1', [companyId]);
        await pool.query('DELETE FROM escalations WHERE company_id = $1', [companyId]);
        await pool.query('DELETE FROM director_interventions WHERE service_id IN (SELECT id FROM houses WHERE company_id = $1)', [companyId]);

        // 2. Ensure Houses exist
        console.log('🏠 Seeding Houses...');
        const houses = [
            { id: '11111111-2222-3333-4444-555555555555', name: 'Rose House' },
            { id: '22222222-2222-3333-4444-555555555555', name: 'Oak Lodge' },
            { id: '33333333-3333-3333-4444-555555555555', name: 'Maple Court' }
        ];

        for (const house of houses) {
            await pool.query(`
                INSERT INTO houses (id, company_id, name, created_at, updated_at)
                VALUES ($1, $2, $3, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
            `, [house.id, companyId, house.name]);
        }

        // 3. Seed Users
        console.log('👤 Seeding Users...');
        const passwordHash = await bcrypt.hash('admin123', 10);
        const users = [
            { id: '11111111-1111-1111-1111-111111111101', email: 'taylor@ordincore.com', role: 'TEAM_LEADER', firstName: 'Taylor' },
            { id: '11111111-1111-1111-1111-111111111102', email: 'sam@ordincore.com', role: 'REGISTERED_MANAGER', firstName: 'Sam' },
            { id: '11111111-1111-1111-1111-111111111103', email: 'chris@ordincore.com', role: 'RESPONSIBLE_INDIVIDUAL', firstName: 'Chris' },
            { id: '11111111-1111-1111-1111-111111111104', email: 'pat@ordincore.com', role: 'DIRECTOR', firstName: 'Pat' },
            { id: '11111111-1111-1111-1111-111111111105', email: 'jordan@ordincore.com', role: 'TEAM_LEADER', firstName: 'Jordan' },
            { id: '11111111-1111-1111-1111-111111111106', email: 'casey@ordincore.com', role: 'TEAM_LEADER', firstName: 'Casey' },
            { id: '11111111-1111-1111-1111-111111111107', email: 'alex@ordincore.com', role: 'REGISTERED_MANAGER', firstName: 'Alex' }
        ];

        for (const u of users) {
            await pool.query(`
                INSERT INTO users (id, company_id, email, password_hash, role, first_name, last_name, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'User', NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET 
                    email = EXCLUDED.email,
                    role = EXCLUDED.role,
                    first_name = EXCLUDED.first_name,
                    updated_at = NOW()
            `, [u.id, companyId, u.email, passwordHash, u.role, u.firstName]);
        }

        // 4. Assignments
        console.log('🔗 Seeding Assignments...');
        const assignments = [
            { user_id: users[0].id, house_id: houses[0].id }, // Taylor -> Rose
            { user_id: users[1].id, house_id: houses[0].id }, // Sam -> Rose
            { user_id: users[1].id, house_id: houses[1].id }, // Sam -> Oak
            { user_id: users[4].id, house_id: houses[1].id }, // Jordan -> Oak
            { user_id: users[5].id, house_id: houses[2].id }, // Casey -> Maple
            { user_id: users[6].id, house_id: houses[2].id }  // Alex -> Maple
        ];

        // 4. Seeding Assignments
        console.log('🔗 Seeding Assignments...');
        for (const a of assignments) {
            await pool.query(`
                INSERT INTO user_houses (user_id, house_id, company_id)
                VALUES ($1, $2, $3)
                ON CONFLICT DO NOTHING
            `, [a.user_id, a.house_id, companyId]);
            
            // Set primary RM for the house if they are RM
            const user = users.find(u => u.id === a.user_id);
            if (user?.role === 'REGISTERED_MANAGER') {
                await pool.query('UPDATE houses SET primary_rm_id = $1 WHERE id = $2', [a.user_id, a.house_id]);
            }
        }

        // 5. Seed Pulses (30 per house, spread over 30 days)
        console.log('📡 Seeding Pulses...');
        const domains = ['Behaviour', 'Medication', 'Staffing', 'Safeguarding', 'Environment'];
        const severities = ['Low', 'Moderate', 'High', 'Critical'];
        
        for (const house of houses) {
            const tlId = assignments.find(a => a.house_id === house.id)?.user_id || users[0].id;
            for (let i = 0; i < 30; i++) {
                const domain = domains[i % domains.length];
                const severity = severities[i % severities.length];
                const date = new Date();
                date.setDate(date.getDate() - i);

                await pool.query(`
                    INSERT INTO governance_pulses (
                        id, company_id, house_id, created_by, entry_date, entry_time, 
                        signal_type, risk_domain, description, immediate_action, 
                        severity, has_happened_before, pattern_concern, review_status, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15
                    )
                `, [
                    uuidv4(), companyId, house.id, tlId, date, '10:00:00',
                    'Concern', [domain], `Historical signal ${i} for ${domain}`, 
                    'Logged in system', severity, 'Yes', 
                    i % 5 === 0 ? 'Escalating' : 'Clear', 'Reviewed', date
                ]);
            }
        }

        // 6. Seed Risk Categories first
        console.log('📋 Seeding Risk Categories...');
        const categories = {
            'Behaviour': '484775f7-9852-46bc-a9b5-cc838b786495',
            'Medication': 'e92e1c94-3ac4-4d1e-be58-3e0ec8045d77',
            'Staffing': 'd3861712-8837-4546-aee8-37f1da6f71c9'
        };

        for (const [name, id] of Object.entries(categories)) {
            await pool.query(`
                INSERT INTO risk_categories (id, company_id, name, description, color, created_at)
                VALUES ($1, $2, $3, $4, '#ef4444', NOW())
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
            `, [id, companyId, name, `${name} related risks`]);
        }

        // 7. Seed Clusters and Candidates
        console.log('🧬 Seeding Clusters & Candidates...');

        for (const house of houses) {
            for (const [domain, catId] of Object.entries(categories)) {
                const clusterId = uuidv4();
                const clusterDate = new Date();
                clusterDate.setDate(clusterDate.getDate() - 10);

                await pool.query(`
                    INSERT INTO signal_clusters (id, company_id, house_id, risk_domain, cluster_label, cluster_status, signal_count, first_signal_date, last_signal_date, trajectory, created_at)
                    VALUES ($1, $2, $3, $4, $5, 'Escalated', 5, $6, NOW(), 'Deteriorating', $7)
                `, [clusterId, companyId, house.id, domain, `${domain} Cluster - ${house.name}`, clusterDate.toISOString().split('T')[0], clusterDate]);

                await pool.query(`
                    INSERT INTO risk_candidates (id, company_id, house_id, cluster_id, risk_domain, candidate_type, status, created_at)
                    VALUES ($1, $2, $3, $4, $5, 'Risk Review Required', 'New', NOW())
                `, [uuidv4(), companyId, house.id, clusterId, domain]);
            }
        }

        // 7. Seed Risks (Spread over 30 days)
        console.log('⚠️ Seeding Risks...');
        const trajectories = ['Stable', 'Improving', 'Deteriorating', 'Critical'];
        for (const house of houses) {
            const rmId = assignments.find(a => a.house_id === house.id && a.user_id !== users[0].id)?.user_id || users[1].id;
            for (let i = 0; i < 4; i++) {
                const domain = Object.keys(categories)[i % 3];
                const catId = Object.values(categories)[i % 3];
                const trajectory = trajectories[i % trajectories.length];
                const severity = severities[i % severities.length];
                const riskDate = new Date();
                riskDate.setDate(riskDate.getDate() - (i * 7));
                
                const riskId = uuidv4();
                await pool.query(`
                    INSERT INTO risks (
                        id, company_id, house_id, category_id, title, description, 
                        severity, trajectory, status, created_by, assigned_to, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Open', $9, $10, $11)
                `, [
                    riskId, companyId, house.id, catId, `Formal ${domain} Risk - ${house.name}`,
                    `Ongoing concerns regarding ${domain} identified via governance loop.`,
                    severity, trajectory, rmId, rmId, riskDate
                ]);

                // 8. Actions
                await pool.query(`
                    INSERT INTO risk_actions (id, risk_id, company_id, title, description, status, created_by, due_date, created_at)
                    VALUES ($1, $2, $3, $4, $5, 'In Progress', $6, NOW() + INTERVAL '7 days', $7)
                `, [uuidv4(), riskId, companyId, 'Immediate Review', 'Review all relevant care plans.', rmId, riskDate]);
                
                await pool.query(`
                    INSERT INTO risk_actions (id, risk_id, company_id, title, description, status, created_by, due_date, created_at, completed_at)
                    VALUES ($1, $2, $3, $4, $5, 'Completed', $6, $7, $7, $7)
                `, [uuidv4(), riskId, companyId, 'Staff Briefing', 'Ensure all staff are briefed on new protocols.', rmId, riskDate]);
            }
        }

        // 9. Incidents (Spread over 30 days)
        console.log('🚨 Seeding Incidents...');
        for (const house of houses) {
            const rmId = assignments.find(a => a.house_id === house.id && a.user_id !== users[0].id)?.user_id || users[1].id;
            for (let i = 0; i < 3; i++) {
                const incDate = new Date();
                incDate.setDate(incDate.getDate() - (i * 10));
                await pool.query(`
                    INSERT INTO incidents (id, company_id, house_id, title, description, severity, status, created_by, occurred_at, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
                `, [uuidv4(), companyId, house.id, `Incident ${i} - ${house.name}`, 'Details of historical incident.', i === 0 ? 'Critical' : 'High', i === 0 ? 'Open' : 'Resolved', rmId, incDate]);
            }
        }

        // 10. Escalations
        console.log('📈 Seeding Escalations...');
        const escReasons = [
            'Recurrent medication errors in Rose House',
            'Staffing levels below safe threshold',
            'Unresolved safeguarding concern'
        ];
        for (let i = 0; i < escReasons.length; i++) {
            const escalationId = uuidv4();
            const escDate = new Date();
            escDate.setDate(escDate.getDate() - (i * 5));
            await pool.query(`
                INSERT INTO escalations (id, company_id, house_id, reason, priority, status, escalated_by, escalated_to, created_at)
                VALUES ($1, $2, $3, $4, 'High', 'Pending', $5, $6, $7)
            `, [escalationId, companyId, houses[0].id, escReasons[i], users[1].id, users[2].id, escDate]);
        }

        await pool.query('COMMIT');
        console.log('✨ Realistic seeding complete!');
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('❌ Seeding failed:', err);
    } finally {
        await pool.end();
    }
}

seed();
