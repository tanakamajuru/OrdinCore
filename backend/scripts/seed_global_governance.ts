import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });
import { query } from '../src/config/database';

async function seedGlobalGovernance() {
  const company_id = '11111111-1111-1111-1111-111111111111';
  
  try {
    const housesRes = await query(`SELECT id, name FROM houses WHERE company_id = $1`, [company_id]);
    const houses = housesRes.rows;

    const usersRes = await query(`SELECT id, role FROM users WHERE company_id = $1`, [company_id]);
    const tlUser = usersRes.rows.find((u: any) => u.role === 'TEAM_LEADER' || u.role === 'TL') || usersRes.rows[0];
    const rmUser = usersRes.rows.find((u: any) => u.role === 'REGISTERED_MANAGER' || u.role === 'RM') || usersRes.rows[0];

    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    
    console.log('--- OrdinCore Global Governance Seeding ---');

    for (const house of houses) {
      console.log(`\nSeeding for ${house.name}...`);
      
      const date25 = new Date(now.getTime() - 10 * day);
      const date26 = new Date(now.getTime() - 8 * day);
      const date01 = new Date(now.getTime() - 3 * day);

      // 1. Signal
      await query(`
        INSERT INTO governance_pulses (id, company_id, house_id, entry_date, risk_domain, description, severity, review_status, immediate_action, created_by, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3::date, ARRAY['Medication'], $4, 'High', 'Reviewed', 'Protocol review initiated', $5, $3)
        ON CONFLICT DO NOTHING
      `, [company_id, house.id, date25, `Medication signal for ${house.name}`, tlUser.id]);

      // 2. Risk
      const riskRes = await query(`
        INSERT INTO risks (id, company_id, house_id, title, severity, risk_domain, status, created_by, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, 'High', 'Medication', 'Open', $4, $5)
        RETURNING id
      `, [company_id, house.id, `Medication risk at ${house.name}`, rmUser.id, date26]);
      const riskId = riskRes.rows[0].id;

      // 3. Escalation
      await query(`
        INSERT INTO escalations (id, company_id, house_id, reason, status, priority, created_at, escalated_by, escalated_to)
        VALUES (gen_random_uuid(), $1, $2, $3, 'Pending', 'High', $4, $5, $5)
      `, [company_id, house.id, `Escalated medication concern - ${house.name}`, date26, rmUser.id]);

      // 4. Weekly Review
      await query(`
        INSERT INTO weekly_reviews (id, company_id, house_id, week_ending, status, overall_position, created_by, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3::date, 'LOCKED', 'Concern', $4, $3)
        ON CONFLICT (house_id, week_ending) DO NOTHING
      `, [company_id, house.id, date01, rmUser.id]);

      // 5. Find existing incidents for this house and link them to the new risk
      const incRes = await query(`SELECT id FROM incidents WHERE house_id = $1 AND company_id = $2`, [house.id, company_id]);
      for (const inc of incRes.rows) {
        await query(`INSERT INTO incident_risks (incident_id, risk_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [inc.id, riskId]);
        console.log(`🔗 Linked incident ${inc.id} to new risk ${riskId}`);
      }
      
      console.log(`✅ Governance chain created for ${house.name}`);
    }

    console.log('\n--- Seeding Complete ---');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
}

seedGlobalGovernance().catch(console.error).finally(() => process.exit(0));
