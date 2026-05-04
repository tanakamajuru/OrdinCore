import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });
import { query } from '../src/config/database';

async function seedIncidentReconstruction() {
  const company_id = '11111111-1111-1111-1111-111111111111';
  const oak_lodge_id = '22222222-2222-3333-4444-555555555555';
  
  try {
    // Get users
    const usersRes = await query(`SELECT id, role, first_name FROM users WHERE company_id = $1`, [company_id]);
    if (usersRes.rows.length === 0) {
      console.error('No users found for company. Please seed users first.');
      return;
    }
    const tlUser = usersRes.rows.find((u: any) => u.role === 'TEAM_LEADER' || u.role === 'TL') || usersRes.rows[0];
    const rmUser = usersRes.rows.find((u: any) => u.role === 'REGISTERED_MANAGER' || u.role === 'RM') || usersRes.rows[0];

    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    
    const date25 = new Date(now.getTime() - 9 * day); // Signal
    const date26 = new Date(now.getTime() - 8 * day); // Risk created
    const date28 = new Date(now.getTime() - 6 * day); // Action assigned (Action completed)
    const date01 = new Date(now.getTime() - 3 * day); // Weekly review
    const date04 = new Date(now.getTime());           // Incident

    console.log('--- OrdinCore Governance Reconstruction Seeding ---');
    console.log(`Company: ${company_id}`);
    console.log(`Service: Oak Lodge (${oak_lodge_id})`);

    // 1. Signal (Governance Pulse) on 25th
    await query(`
      INSERT INTO governance_pulses (id, company_id, house_id, entry_date, risk_domain, description, severity, review_status, immediate_action, created_by, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3::date, ARRAY['Medication'], 'Medication error signal (PRN missed)', 'High', 'Reviewed', 'N/A', $4, $5)
      ON CONFLICT DO NOTHING
    `, [company_id, oak_lodge_id, date25, tlUser.id, date25]);
    console.log('✅ Signal (Pulse) created for 25th');

    // 2. Risk on 26th
    const riskRes = await query(`
      INSERT INTO risks (id, company_id, house_id, title, severity, risk_domain, status, created_by, created_at)
      VALUES (gen_random_uuid(), $1, $2, 'Medication error risk - Oak Lodge', 'High', 'Medication', 'Open', $3, $4)
      RETURNING id
    `, [company_id, oak_lodge_id, rmUser.id, date26]);
    const riskId = riskRes.rows[0].id;
    console.log(`✅ Risk created: ${riskId}`);

    // 3. Risk Action on 28th
    await query(`
      INSERT INTO risk_actions (id, company_id, risk_id, title, status, assigned_to, created_by, created_at, completed_at, effectiveness)
      VALUES (gen_random_uuid(), $1, $2, 'Review medication protocol', 'Completed', $3, $4, $5, $6, 'Effective')
    `, [company_id, riskId, tlUser.id, rmUser.id, date28, date28]);
    console.log('✅ Risk Action completed on 28th');

    // 4. Escalation
    await query(`
      INSERT INTO escalations (id, company_id, house_id, reason, status, priority, created_at, escalated_by, escalated_to)
      VALUES (gen_random_uuid(), $1, $2, 'Medication risk escalated to RI', 'Pending', 'High', $3, $4, $4)
    `, [company_id, oak_lodge_id, date26, rmUser.id]);
    console.log('✅ Escalation raised to RI');

    // 5. Weekly Review on 01st
    await query(`
      INSERT INTO weekly_reviews (id, company_id, house_id, week_ending, status, overall_position, governance_narrative, created_by, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3::date, 'LOCKED', 'Concern', 'Weekly review discussed medication risks.', $4, $5::timestamp)
    `, [company_id, oak_lodge_id, date01, rmUser.id, date01]);
    console.log('✅ Weekly Review locked for 1st');

    // 6. Incident on 04th (Today)
    const incRes = await query(`
      INSERT INTO incidents (id, company_id, house_id, title, description, severity, status, occurred_at, created_at, created_by)
      VALUES (gen_random_uuid(), $1, $2, 'Serious incident: Medication error', 'Wrong medication administered.', 'Critical', 'Open', $3, $4, $5)
      RETURNING id
    `, [company_id, oak_lodge_id, date04, date04, tlUser.id]);
    const incidentId = incRes.rows[0].id;
    console.log(`✅ Serious Incident created: ${incidentId}`);

    // 7. Link Incident to Risk
    await query(`
      INSERT INTO incident_risks (incident_id, risk_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
    `, [incidentId, riskId]);
    console.log('🔗 Incident linked to Risk (Doctrine of Linkage)');

    console.log('\n--- Seeding Complete ---');
    console.log(`Reconstruction Ready for Incident: ${incidentId}`);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
}

seedIncidentReconstruction().catch(console.error).finally(() => process.exit(0));
