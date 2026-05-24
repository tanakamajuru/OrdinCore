import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'caresignal_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function run() {
    console.log('🚀 Seeding Beam of Light Users...');
    const companyId = '11111111-1111-1111-1111-111111111111';
    const houseId = '22222222-2222-3333-4444-555555555555';

    try {
        await pool.query('BEGIN');

        // Ensure company exists
        await pool.query(
            `INSERT INTO companies (id, name, status) 
             VALUES ($1, 'OrdinCore Demo Company', 'active') 
             ON CONFLICT (id) DO NOTHING`,
            [companyId]
        );

        // Ensure house exists
        await pool.query(
            `INSERT INTO houses (id, company_id, name, address, city, postcode, status, capacity)
             VALUES ($1, $2, 'Oak Lodge', '45 Oak Lane', 'Bristol', 'BS1 2AB', 'active', 6)
             ON CONFLICT (id) DO NOTHING`,
            [houseId, companyId]
        );

        const emails = [
            'kuda@beamoflight.org.uk',
            'lauren.gittins@beamoflight.org.uk',
            'teddy@beamoflight.org.uk',
            'tendayi@beamoflight.org.uk',
            'lola@beamoflight.org.uk'
        ];

        const userIds = [
            '21111111-1111-1111-1111-111111111101',
            '21111111-1111-1111-1111-111111111102',
            '21111111-1111-1111-1111-111111111103',
            '21111111-1111-1111-1111-111111111104',
            '21111111-1111-1111-1111-111111111105'
        ];

        const userIdsStr = "'21111111-1111-1111-1111-111111111101', '21111111-1111-1111-1111-111111111102', '21111111-1111-1111-1111-111111111103', '21111111-1111-1111-1111-111111111104', '21111111-1111-1111-1111-111111111105'";

        // Clear test data to ensure a fresh, reproducible state and avoid constraint issues
        console.log('🧹 Clearing old test data for house and users...');
        const cleanupQueries = [
            `DELETE FROM weekly_reviews WHERE house_id = '${houseId}'`,
            `DELETE FROM risk_actions WHERE risk_id IN (SELECT id FROM risks WHERE house_id = '${houseId}')`,
            `DELETE FROM risks WHERE house_id = '${houseId}'`,
            `DELETE FROM escalations WHERE house_id = '${houseId}'`,
            `DELETE FROM signal_clusters WHERE house_id = '${houseId}'`,
            `DELETE FROM incidents WHERE house_id = '${houseId}'`,
            `DELETE FROM governance_pulses WHERE house_id = '${houseId}'`,
            
            // Cascade deletes for seeded users
            `DELETE FROM escalation_actions WHERE taken_by IN (${userIdsStr})`,
            `DELETE FROM escalation_decisions WHERE decided_by IN (${userIdsStr})`,
            `DELETE FROM escalations WHERE escalated_by IN (${userIdsStr})`,
            `DELETE FROM ri_acknowledgements WHERE ri_user_id IN (${userIdsStr})`,
            `DELETE FROM websocket_sessions WHERE user_id IN (${userIdsStr})`,
            `DELETE FROM audit_logs WHERE user_id IN (${userIdsStr})`,
            `DELETE FROM notification_preferences WHERE user_id IN (${userIdsStr})`,
            `DELETE FROM notifications WHERE user_id IN (${userIdsStr})`,
            `DELETE FROM report_exports WHERE downloaded_by IN (${userIdsStr})`,
            `DELETE FROM report_requests WHERE requested_by IN (${userIdsStr})`,
            `DELETE FROM monthly_board_reports WHERE generated_by IN (${userIdsStr})`,
            `DELETE FROM monthly_reports WHERE signed_by IN (${userIdsStr}) OR co_signed_by IN (${userIdsStr}) OR locked_by IN (${userIdsStr})`,
            `DELETE FROM reports WHERE generated_by IN (${userIdsStr})`,
            `DELETE FROM ri_queries WHERE ri_user_id IN (${userIdsStr}) OR rm_user_id IN (${userIdsStr})`,
            `DELETE FROM risk_actions WHERE assigned_to IN (${userIdsStr}) OR created_by IN (${userIdsStr}) OR effectiveness_reviewed_by IN (${userIdsStr}) OR verified_by_rm IN (${userIdsStr}) OR verified_by_ri IN (${userIdsStr})`,
            `DELETE FROM weekly_reviews WHERE created_by IN (${userIdsStr})`,
            `DELETE FROM risks WHERE created_by IN (${userIdsStr}) OR assigned_to IN (${userIdsStr})`,
            `DELETE FROM incidents WHERE created_by IN (${userIdsStr}) OR assigned_to IN (${userIdsStr})`,
            `DELETE FROM governance_pulses WHERE created_by IN (${userIdsStr}) OR completed_by IN (${userIdsStr}) OR locked_by IN (${userIdsStr}) OR assigned_user_id IN (${userIdsStr}) OR reviewed_by IN (${userIdsStr})`,
            `DELETE FROM user_houses WHERE user_id IN (${userIdsStr})`,
            `UPDATE houses SET manager_id = NULL, primary_rm_id = NULL, deputy_rm_id = NULL WHERE manager_id IN (${userIdsStr}) OR primary_rm_id IN (${userIdsStr}) OR deputy_rm_id IN (${userIdsStr})`
        ];

        for (const q of cleanupQueries) {
            try {
                await pool.query(q);
            } catch (e) {
                console.log(`⚠️ Skip cleanup query: ${q} (${e instanceof Error ? e.message : e})`);
            }
        }

        // Delete existing Beam of Light users to avoid duplicates
        console.log('🧹 Clearing old Beam of Light users...');
        await pool.query('DELETE FROM users WHERE email = ANY($1) OR id = ANY($2)', [emails, userIds]);

        // Generate password hash
        const passwordHash = await bcrypt.hash('admin123', 10);

        const usersToSeed = [
            {
                id: '21111111-1111-1111-1111-111111111101',
                email: 'lauren.gittins@beamoflight.org.uk',
                role: 'TEAM_LEADER',
                first_name: 'Lauren',
                last_name: 'Gittins'
            },
            {
                id: '21111111-1111-1111-1111-111111111102',
                email: 'kuda@beamoflight.org.uk',
                role: 'REGISTERED_MANAGER',
                first_name: 'Kuda',
                last_name: 'Manager'
            },
            {
                id: '21111111-1111-1111-1111-111111111103',
                email: 'tendayi@beamoflight.org.uk',
                role: 'RESPONSIBLE_INDIVIDUAL',
                first_name: 'Tendayi',
                last_name: 'Individual'
            },
            {
                id: '21111111-1111-1111-1111-111111111104',
                email: 'lola@beamoflight.org.uk',
                role: 'DIRECTOR',
                first_name: 'Lola',
                last_name: 'Director'
            },
            {
                id: '21111111-1111-1111-1111-111111111105',
                email: 'teddy@beamoflight.org.uk',
                role: 'ADMIN',
                first_name: 'Teddy',
                last_name: 'Admin'
            }
        ];

        for (const u of usersToSeed) {
            await pool.query(
                `INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, status, pulse_days)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', '[]')
                 ON CONFLICT (email) DO UPDATE SET 
                    id = EXCLUDED.id,
                    company_id = EXCLUDED.company_id,
                    role = EXCLUDED.role, 
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    password_hash = EXCLUDED.password_hash`,
                [u.id, companyId, u.email, passwordHash, u.first_name, u.last_name, u.role]
            );
            console.log(`👤 Seeded user: ${u.email} (${u.role})`);
        }

        // Assign Team Leader to Oak Lodge as staff
        await pool.query(
            `INSERT INTO user_houses (user_id, house_id, company_id, role_in_house)
             VALUES ($1, $2, $3, 'staff')`,
            ['21111111-1111-1111-1111-111111111101', houseId, companyId]
        );

        // Assign Registered Manager to Oak Lodge as manager
        await pool.query(
            `INSERT INTO user_houses (user_id, house_id, company_id, role_in_house)
             VALUES ($1, $2, $3, 'manager')`,
            ['21111111-1111-1111-1111-111111111102', houseId, companyId]
        );

        // Set manager_id in house Oak Lodge
        await pool.query(
            `UPDATE houses SET manager_id = $1 WHERE id = $2`,
            ['21111111-1111-1111-1111-111111111102', houseId]
        );

        // Ensure J Smith service user exists and is active (display_name is generated, so omit it)
        const serviceUserId = 'bf324b7b-cb4b-475b-a6aa-342c292d59a1';
        await pool.query(
            `INSERT INTO service_users (id, house_id, first_name, last_name, is_active)
             VALUES ($1, $2, 'Jane', 'Smith', true)
             ON CONFLICT (id) DO UPDATE SET is_active = true, house_id = EXCLUDED.house_id`,
            [serviceUserId, houseId]
        );

        await pool.query('COMMIT');
        console.log('🎉 Seeding Beam of Light Complete');
    } catch (e) {
        await pool.query('ROLLBACK');
        console.error('❌ Seeding Failed', e);
        throw e;
    } finally {
        await pool.end();
    }
}

run();