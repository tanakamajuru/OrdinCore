require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'caresignal_db',
  password: process.env.DB_PASSWORD || 'Chemz@25',
  port: process.env.DB_PORT || 5432,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Starting Full QAT Seeding...');

    // 1. Create Company
    const existingCompany = await client.query("SELECT id FROM companies WHERE name = 'Sunrise Care Group Ltd' LIMIT 1");
    let companyId;
    if (existingCompany.rows.length > 0) {
      companyId = existingCompany.rows[0].id;
    } else {
      const res = await client.query(
        `INSERT INTO companies (id, name, domain, plan, status) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [uuidv4(), 'Sunrise Care Group Ltd', 'sunrise.care', 'professional', 'active']
      );
      companyId = res.rows[0].id;
    }

    // 2. Create House
    const existingHouse = await client.query("SELECT id FROM houses WHERE name = 'Rose House' AND company_id = $1 LIMIT 1", [companyId]);
    let roseHouseId;
    if (existingHouse.rows.length > 0) {
      roseHouseId = existingHouse.rows[0].id;
    } else {
      const res = await client.query(
        `INSERT INTO houses (id, name, company_id, status) VALUES ($1, $2, $3, 'active') RETURNING id`,
        [uuidv4(), 'Rose House', companyId]
      );
      roseHouseId = res.rows[0].id;
    }

    const hash = await bcrypt.hash('Pass123!', 10);

    // 3. Create Users
    const users = [
      { email: 'sarah.t@sunrise.care', first: 'Sarah', last: 'Thompson', role: 'TEAM_LEADER' },
      { email: 'mark.d@sunrise.care', first: 'Mark', last: 'Davies', role: 'REGISTERED_MANAGER' },
      { email: 'emma.w@sunrise.care', first: 'Emma', last: 'Wilson', role: 'DIRECTOR' },
      { email: 'james.c@sunrise.care', first: 'James', last: 'Carter', role: 'RESPONSIBLE_INDIVIDUAL' },
    ];

    const userIdMap = {};

    for (const u of users) {
      const res = await client.query(
        `INSERT INTO users (id, first_name, last_name, email, password_hash, role, status, company_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (email) DO UPDATE SET 
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            role = EXCLUDED.role,
            company_id = EXCLUDED.company_id
         RETURNING id`,
        [uuidv4(), u.first, u.last, u.email, hash, u.role, 'active', companyId]
      );
      userIdMap[u.email] = res.rows[0].id;
      console.log(`✅ User ${u.email} ready.`);
    }

    // 4. Map Sarah and Mark to Rose House
    await client.query(
        `INSERT INTO user_houses (id, user_id, house_id, company_id, role_in_house) 
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, house_id) DO NOTHING`,
        [uuidv4(), userIdMap['sarah.t@sunrise.care'], roseHouseId, companyId, 'TEAM_LEADER']
    );
    await client.query(
        `INSERT INTO user_houses (id, user_id, house_id, company_id, role_in_house) 
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, house_id) DO NOTHING`,
        [uuidv4(), userIdMap['mark.d@sunrise.care'], roseHouseId, companyId, 'PRIMARY_RM']
    );

    // Set Mark as manager of Rose House
    await client.query(`UPDATE houses SET manager_id = $1 WHERE id = $2`, [userIdMap['mark.d@sunrise.care'], roseHouseId]);

    // 5. Baseline Data for Test Script
    // 2.2.1 Ensure at least 2 Behaviour signals exist
    const signalData = {
        company_id: companyId,
        house_id: roseHouseId,
        created_by: userIdMap['sarah.t@sunrise.care'],
        entry_date: new Date().toISOString().split('T')[0],
        entry_time: '10:00',
        related_person: 'Resident X',
        signal_type: 'Concern',
        risk_domain: '{Behaviour}',
        description: 'Baseline Behaviour Signal 1',
        severity: 'Low',
        has_happened_before: 'No',
        pattern_concern: 'None',
        escalation_required: 'None',
        review_status: 'New'
    };

    await client.query(
        `INSERT INTO governance_pulses (id, company_id, house_id, created_by, entry_date, entry_time, related_person, signal_type, risk_domain, description, severity, has_happened_before, pattern_concern, escalation_required, review_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [uuidv4(), signalData.company_id, signalData.house_id, signalData.created_by, signalData.entry_date, signalData.entry_time, signalData.related_person, signalData.signal_type, signalData.risk_domain, 'Baseline Behaviour Signal 1', 'Low', 'No', 'None', 'None', 'New']
    );
    await client.query(
        `INSERT INTO governance_pulses (id, company_id, house_id, created_by, entry_date, entry_time, related_person, signal_type, risk_domain, description, severity, has_happened_before, pattern_concern, escalation_required, review_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [uuidv4(), signalData.company_id, signalData.house_id, signalData.created_by, signalData.entry_date, signalData.entry_time, signalData.related_person, signalData.signal_type, signalData.risk_domain, 'Baseline Behaviour Signal 2', 'Low', 'No', 'None', 'None', 'New']
    );

    await client.query('COMMIT');
    console.log('🚀 Full QAT Seeding Complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding QAT data:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
