require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'caresignal_db',
  password: 'Chemz@25',
  port: 5432,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Create Company
    const companyId = uuidv4();
    await client.query(
      `INSERT INTO companies (id, name, domain, plan, status) VALUES ($1, $2, $3, $4, $5)`,
      [companyId, 'Sunrise Care Group Ltd', 'sunrise.care', 'professional', 'active']
    );

    // 2. Create Houses
    const roseHouseId = uuidv4();
    await client.query(
      `INSERT INTO houses (id, name, company_id) VALUES ($1, $2, $3)`,
      [roseHouseId, 'Rose House', companyId]
    );

    const hash = await bcrypt.hash('Pass123!', 10);

    // 3. Create Users
    // TL
    const tlId = uuidv4();
    await client.query(
      `INSERT INTO users (id, first_name, last_name, email, password_hash, role, status, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tlId, 'Sarah', 'Thompson', 'sarah.t@sunrise.care', hash, 'TEAM_LEADER', 'active', companyId]
    );

    // RM
    const rmId = uuidv4();
    await client.query(
      `INSERT INTO users (id, first_name, last_name, email, password_hash, role, status, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [rmId, 'Mark', 'Davies', 'mark.d@sunrise.care', hash, 'REGISTERED_MANAGER', 'active', companyId]
    );

    // 4. Map Users to House
    await client.query(
      `INSERT INTO user_houses (id, user_id, house_id, company_id, role_in_house) VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), tlId, roseHouseId, companyId, 'TEAM_LEADER']
    );
    await client.query(
      `INSERT INTO user_houses (id, user_id, house_id, company_id, role_in_house) VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), rmId, roseHouseId, companyId, 'PRIMARY_RM']
    );
    
    // Ensure RM is primary_rm in houses table
    await client.query(
      `UPDATE houses SET primary_rm_id = $1 WHERE id = $2`,
      [rmId, roseHouseId]
    );

    await client.query('COMMIT');
    console.log('✅ QAT Phase 1 & 2 seeded successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding QAT data:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
