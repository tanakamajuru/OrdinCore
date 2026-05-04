import path from 'path';
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query } = require('../src/config/database');

async function seedDashboardData() {
  const company_id = '11111111-1111-1111-1111-111111111111';
  const rose_house_id = '11111111-2222-3333-4444-555555555555';
  const maple_court_id = '11111111-2222-3333-4444-555555555555'; // Using same for now if others not found

  console.log('Seeding daily governance logs...');
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Rose House
    await query(`
      INSERT INTO daily_governance_log (id, house_id, review_date, completed, reviewed_by, completed_at, daily_note)
      VALUES (gen_random_uuid(), $1, $2, true, '11111111-1111-1111-1111-111111111102', NOW(), 'Daily review completed.')
      ON CONFLICT (house_id, review_date) DO UPDATE SET completed = true
    `, [rose_house_id, dateStr]);
  }

  console.log('Updating action effectiveness...');
  const actions = await query(`SELECT id FROM risk_actions WHERE company_id = $1 LIMIT 20`, [company_id]);
  const outcomes = ['Effective', 'Neutral', 'Ineffective'];
  for (let i = 0; i < actions.rows.length; i++) {
    const outcome = outcomes[i % 3];
    await query(`
      UPDATE risk_actions 
      SET effectiveness = $1, calculated_outcome = $1, status = 'Completed', completed_at = NOW() - INTERVAL '${i} days'
      WHERE id = $2
    `, [outcome, actions.rows[i].id]);
  }

  console.log('Seeding incidents and escalations...');
  for (let i = 0; i < 15; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (i % 42)); // within 6 weeks
    
    await query(`
      INSERT INTO incidents (id, company_id, house_id, title, description, severity, status, created_at, occurred_at, created_by)
      VALUES (gen_random_uuid(), $1, $2, 'Incident ' || $3, 'Description', 'High', 'Open', $4, $4, '11111111-1111-1111-1111-111111111102')
    `, [company_id, rose_house_id, i, date]);

    if (i % 3 === 0) {
      await query(`
        INSERT INTO escalations (id, company_id, service_unit_id, house_id, reason, status, priority, created_at, escalated_by, escalated_to)
        VALUES (gen_random_uuid(), $1, $2, $2, 'Escalation reason ' || $3, 'Pending', 'High', $4, '11111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111102')
      `, [company_id, rose_house_id, i, date]);
    }
  }

  console.log('Dashboard data seeded successfully.');
}

seedDashboardData().catch(console.error).finally(() => process.exit(0));
