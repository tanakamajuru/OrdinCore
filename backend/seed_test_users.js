const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ 
    host: 'localhost', 
    port: 5432, 
    database: 'caresignal', 
    user: 'postgres', 
    password: 'Chemz@25' 
});

async function seed() {
    const client = await pool.connect();
    try {
        console.log('🌱 Seeding test users and infrastructure...');
        
        // Fixed IDs from .env.test
        const companyId = '11111111-1111-1111-1111-111111111111';
        const houseId = '11111111-2222-3333-4444-555555555555';
        
        // 0. Clean wipe of test infrastructure using CASCADE to handle ALL dependencies
        // This is the most reliable way to ensure we can recreate users with specific IDs
        await client.query("TRUNCATE TABLE users CASCADE");
        await client.query("TRUNCATE TABLE companies CASCADE");
        console.log('🧹 Deep cleaned ALL database tables');

        // 1. Create Test Company
        await client.query(`
            INSERT INTO companies (id, name, domain, status) 
            VALUES ($1, 'Ordin Test Company', 'ordincore.com', 'active') 
        `, [companyId]);
        console.log(`✅ Company created: ${companyId}`);

        // 2. Create Test House
        await client.query(`
            INSERT INTO houses (id, company_id, name, status, is_active) 
            VALUES ($1, $2, 'Rose House', 'active', true) 
        `, [houseId, companyId]);
        console.log(`✅ House created: ${houseId}`);
        
        const passwordHash = await bcrypt.hash('admin123', 10);
        
        const users = [
            { id: '11111111-1111-1111-1111-111111111101', email: 'taylor.rose@ordincore.com', first_name: 'Taylor', last_name: 'Rose', role: 'TEAM_LEADER' },
            { id: '11111111-1111-1111-1111-111111111102', email: 'sam.rivers@ordincore.com', first_name: 'Sam', last_name: 'Rivers', role: 'REGISTERED_MANAGER' },
            { id: '11111111-1111-1111-1111-111111111103', email: 'chris@ordincore.com', first_name: 'Chris', last_name: 'Assurance', role: 'RESPONSIBLE_INDIVIDUAL' },
            { id: '11111111-1111-1111-1111-111111111104', email: 'pat@ordincore.com', first_name: 'Pat', last_name: 'Director', role: 'DIRECTOR' }
        ];

        // 0. Clean wipe of test infrastructure using CASCADE to handle all dependencies
        // This will clear out pulses, answers, reports, actions, system_prompts, etc.
        await client.query("TRUNCATE TABLE risk_signal_links, governance_answers, governance_pulses, signal_clusters, risk_actions, risks, user_houses, reports, threshold_events, audit_logs, system_prompts CASCADE");
        
        for (const user of users) {
            await client.query("DELETE FROM users WHERE email = $1", [user.email]);
        }
        console.log('🧹 Deep cleaned all test-related data and users');

        for (const user of users) {
            await client.query(`
                INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
            `, [user.id, companyId, user.email, passwordHash, user.first_name, user.last_name, user.role]);
            
            // Assign Team Leader and RM to the house
            if (user.role === 'TEAM_LEADER' || user.role === 'REGISTERED_MANAGER') {
                await client.query(`
                    INSERT INTO user_houses (user_id, house_id, company_id, role_in_house)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (user_id, house_id) DO NOTHING
                `, [user.id, houseId, companyId, user.role]);
                console.log(`🏠 User ${user.email} assigned to Rose House`);
            }
            
            console.log(`✅ User created: ${user.email} (${user.role})`);
        }

        console.log('✨ Seeding complete!');
    } catch (err) {
        console.error('❌ Seeding failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
