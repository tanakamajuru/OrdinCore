import path from 'path';
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query } = require('../src/config/database');

async function seedDirectorData() {
  const company_id = '11111111-1111-1111-1111-111111111111';
  const rose_house_id = '11111111-2222-3333-4444-555555555555';
  const userId = '11111111-1111-1111-1111-111111111102'; // Sam Rivers

  console.log('Seeding enriched director dashboard data...');

  // 1. Actions across different domains and dates for "Effectiveness by Domain" and "Organisational Trajectory"
  const domains = ['Clinical', 'Safety', 'Quality', 'Staffing', 'Environment'];
  const outcomes = ['Effective', 'Neutral', 'Ineffective'];
  
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString();

    for (let j = 0; j < 3; j++) {
      const outcome = outcomes[j];
      const domain = domains[(i + j) % domains.length];
      
      const riskRes = await query(`
        INSERT INTO risks (id, company_id, house_id, title, severity, risk_domain, status, created_by)
        VALUES (gen_random_uuid(), $1, $2, $3, 'High', $4, 'Open', $5)
        RETURNING id
      `, [company_id, rose_house_id, `Risk ${i}-${j}`, domain, userId]);
      
      const riskId = riskRes.rows[0].id;

      await query(`
        INSERT INTO risk_actions (id, company_id, risk_id, title, status, effectiveness, calculated_outcome, completed_at, created_by)
        VALUES (gen_random_uuid(), $1, $2, $3, 'Completed', $4, $4, $5, $6)
      `, [company_id, riskId, `Action ${i}-${j}`, outcome, dateStr, userId]);
    }
  }

  // 2. Escalations with varying priorities for "Escalation Velocity"
  const priorities = ['High', 'Medium', 'Critical'];
  for (let i = 0; i < 20; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (i % 42)); // 6 weeks
    const priority = priorities[i % priorities.length];
    
    await query(`
      INSERT INTO escalations (id, company_id, service_unit_id, house_id, reason, status, priority, created_at, escalated_by, escalated_to)
      VALUES (gen_random_uuid(), $1, $2, $2, 'Escalation ' || $3, 'Pending', $4, $5, $6, $6)
    `, [company_id, rose_house_id, i, priority, date, userId]);
  }

  // 3. Incidents for "Safeguarding Volume"
  for (let i = 0; i < 25; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (i % 42));
    await query(`
      INSERT INTO incidents (id, company_id, house_id, title, description, severity, status, created_at, occurred_at, created_by)
      VALUES (gen_random_uuid(), $1, $2, 'Incident ' || $3, 'Description', 'High', 'Open', $4, $4, $5)
    `, [company_id, rose_house_id, i, date, userId]);
  }

  console.log('Enriched director data seeded successfully.');
}

seedDirectorData().catch(console.error).finally(() => process.exit(0));
