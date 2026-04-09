require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  console.log('--- LIVE SEEDING START ---');
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    // 1. Get Superadmin ID
    const saRes = await client.query("SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1");
    const superadminId = saRes.rows[0]?.id;
    if (!superadminId) throw new Error('No SUPER_ADMIN found');
    console.log('Found Superadmin:', superadminId);

    const companyId = uuidv4();
    const siteId = uuidv4();
    const passwordHash = await bcrypt.hash('Password123!', 12);

    // 2. Create Company
    await client.query(
      "INSERT INTO companies (id, name, plan, status) VALUES ($1, $2, $3, $4)",
      [companyId, 'Live Verification Co', 'pro', 'active']
    );
    console.log('Company created');

    // 3. Create Site
    await client.query(
      "INSERT INTO houses (id, company_id, name, status, is_active) VALUES ($1, $2, $3, $4, $5)",
      [siteId, companyId, 'Live Site Alpha', 'active', true]
    );
    console.log('Site created');

    // 4. Create Users (DIR, RM, TL)
    const users = [
      { id: uuidv4(), email: 'dir_live@example.com', role: 'DIR', fn: 'Jane', ln: 'Director' },
      { id: uuidv4(), email: 'rm_live@example.com', role: 'RM', fn: 'Robert', ln: 'Manager' },
      { id: uuidv4(), email: 'tl_live@example.com', role: 'TL', fn: 'Thomas', ln: 'Leader' }
    ];

    for (const u of users) {
      await client.query(
        "INSERT INTO users (id, company_id, email, password_hash, role, first_name, last_name, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [u.id, companyId, u.email, passwordHash, u.role, u.fn, u.ln, 'active']
      );
      
      // Assign RM/TL to site
      if (u.role === 'RM' || u.role === 'TL') {
        await client.query(
          "INSERT INTO user_houses (id, user_id, house_id, company_id, role_in_house, assigned_at) VALUES ($1, $2, $3, $4, $5, NOW())",
          [uuidv4(), u.id, siteId, companyId, u.role]
        );
      }
    }
    console.log('Users created and assigned');

    // 5. Initialize Governance Template
    const templateId = uuidv4();
    await client.query(
      "INSERT INTO governance_templates (id, company_id, name, description, frequency, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())",
      [templateId, companyId, 'Live Standard Pulse', 'Daily check', 'daily', superadminId]
    );
    console.log('Template created');

    // 6. Questions
    const questions = ['Risk check', 'Safeguarding', 'Operations'];
    for (let i = 0; i < questions.length; i++) {
        await client.query(
            "INSERT INTO governance_questions (id, template_id, company_id, question, question_type, required, order_index, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())",
            [uuidv4(), templateId, companyId, questions[i], 'yes_no', true, i]
        );
    }
    console.log('Questions created');

    console.log('--- LIVE SEEDING COMPLETED ---');
    console.log('DIR: dir_live@example.com / Password123!');
    console.log('RM:  rm_live@example.com / Password123!');
    console.log('TL:  tl_live@example.com / Password123!');

  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await client.end();
  }
}

seed();
