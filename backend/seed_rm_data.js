// seed_rm_data.js — Seeds governance template, pulses, risks, incidents + house settings for Tanaka Care
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });

async function seed() {
  const client = await pool.connect();
  try {
    // ─── Get base IDs ─────────────────────────────────────────────────────────
    const companyRes = await client.query(`SELECT id FROM companies WHERE name ILIKE 'Tanaka Care' LIMIT 1`);
    if (!companyRes.rows.length) { console.error('❌ Tanaka Care not found'); process.exit(1); }
    const companyId = companyRes.rows[0].id;
    console.log(`✅ Company: ${companyId}`);

    const houseRes = await client.query(`SELECT id, name FROM houses WHERE company_id = $1 LIMIT 1`, [companyId]);
    if (!houseRes.rows.length) { console.error('❌ No house found for Tanaka Care'); process.exit(1); }
    const houseId = houseRes.rows[0].id;
    const houseName = houseRes.rows[0].name;
    console.log(`✅ House: ${houseName} (${houseId})`);

    const adminRes = await client.query(`SELECT id FROM users WHERE email = 'admin@tanakacare.co.uk' LIMIT 1`);
    const adminId = adminRes.rows[0].id;

    const rmRes = await client.query(`SELECT id FROM users WHERE email = 'rm@tanakacare.co.uk' LIMIT 1`);
    const rmId = rmRes.rows[0].id;
    console.log(`✅ RM user: ${rmId}`);

    // ─── House Settings (pulse days + settings) ──────────────────────────────
    const existSettings = await client.query(`SELECT id FROM house_settings WHERE house_id = $1`, [houseId]);
    if (existSettings.rows.length === 0) {
      await client.query(
        `INSERT INTO house_settings (house_id, governance_frequency, settings)
         VALUES ($1, 'weekly', $2)`,
        [houseId, JSON.stringify({ pulse_days: ['Monday', 'Wednesday', 'Friday'], pulse_time: '09:00' })]
      );
      console.log(`✅ Created house_settings with pulse_days Mon/Wed/Fri`);
    } else {
      await client.query(
        `UPDATE house_settings SET settings = $1 WHERE house_id = $2`,
        [JSON.stringify({ pulse_days: ['Monday', 'Wednesday', 'Friday'], pulse_time: '09:00' }), houseId]
      );
      console.log(`✅ Updated house_settings with pulse_days Mon/Wed/Fri`);
    }

    // ─── Governance Template ──────────────────────────────────────────────────
    let templateId;
    const existTemplate = await client.query(
      `SELECT id FROM governance_templates WHERE company_id = $1 AND name = 'Weekly Governance Pulse' LIMIT 1`, [companyId]
    );
    if (existTemplate.rows.length > 0) {
      templateId = existTemplate.rows[0].id;
      console.log(`ℹ️  Template already exists: ${templateId}`);
    } else {
      const tRes = await client.query(
        `INSERT INTO governance_templates (company_id, name, description, frequency, is_active, created_by)
         VALUES ($1, 'Weekly Governance Pulse', 'Standard weekly governance pulse for all houses', 'weekly', true, $2)
         RETURNING id`,
        [companyId, adminId]
      );
      templateId = tRes.rows[0].id;
      console.log(`✅ Created governance template: ${templateId}`);

      // Add 6 standard pulse questions
      const questions = [
        { q: 'Have any new risks emerged since the last pulse?', type: 'yes_no' },
        { q: 'Are any existing risks increasing or deteriorating?', type: 'yes_no' },
        { q: 'Any safeguarding concerns or indicators this week?', type: 'yes_no' },
        { q: 'Any operational pressures affecting service stability?', type: 'multiple_choice', opts: ['Staffing pressure', 'Behavioural support challenges', 'Medication concerns', 'Environmental issue', 'None'] },
        { q: 'Does anything require leadership attention / escalation?', type: 'yes_no' },
        { q: 'Additional observations (optional)', type: 'text' },
      ];
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await client.query(
          `INSERT INTO governance_questions (template_id, company_id, question, question_type, options, required, order_index)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [templateId, companyId, q.q, q.type, JSON.stringify(q.opts || []), i < 5, i]
        );
      }
      console.log(`✅ Created 6 governance questions`);
    }

    // ─── Governance Pulses (next 4 weeks Mon/Wed/Fri) ─────────────────────────
    const pulseDayNames = ['Monday', 'Wednesday', 'Friday'];
    const dayOfWeekMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
    
    // Generate next 12 pulse dates (4 weeks × 3 days)
    const today = new Date();
    const pulseDates = [];
    const current = new Date(today);
    current.setHours(9, 0, 0, 0);
    
    while (pulseDates.length < 12) {
      const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][current.getDay()];
      if (pulseDayNames.includes(dayName)) {
        pulseDates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    // Also add 3 past pulses for history
    const pastDates = [];
    const pastCurrent = new Date(today);
    pastCurrent.setDate(pastCurrent.getDate() - 1);
    while (pastDates.length < 3) {
      const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][pastCurrent.getDay()];
      if (pulseDayNames.includes(dayName)) {
        pastDates.push(new Date(pastCurrent));
      }
      pastCurrent.setDate(pastCurrent.getDate() - 1);
    }
    pastDates.reverse();

    let pulseCount = 0;
    // Create past completed pulses
    for (const date of pastDates) {
      const existPulse = await client.query(
        `SELECT id FROM governance_pulses WHERE house_id = $1 AND due_date::date = $2::date`, [houseId, date]
      );
      if (existPulse.rows.length === 0) {
        await client.query(
          `INSERT INTO governance_pulses (company_id, house_id, template_id, status, due_date, completed_at, completed_by, compliance_score)
           VALUES ($1, $2, $3, 'completed', $4, $4, $5, 85.0)`,
          [companyId, houseId, templateId, date, rmId]
        );
        pulseCount++;
      }
    }
    // Create upcoming pending pulses
    for (const date of pulseDates) {
      const existPulse = await client.query(
        `SELECT id FROM governance_pulses WHERE house_id = $1 AND due_date::date = $2::date`, [houseId, date]
      );
      if (existPulse.rows.length === 0) {
        const status = date <= today ? 'pending' : 'pending';
        await client.query(
          `INSERT INTO governance_pulses (company_id, house_id, template_id, status, due_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [companyId, houseId, templateId, status, date]
        );
        pulseCount++;
      }
    }
    console.log(`✅ Created ${pulseCount} governance pulses`);

    // ─── Risk Categories ──────────────────────────────────────────────────────
    const existCat = await client.query(`SELECT id FROM risk_categories WHERE company_id = $1 LIMIT 1`, [companyId]);
    let catId;
    if (existCat.rows.length > 0) {
      catId = existCat.rows[0].id;
    } else {
      const cats = [
        { name: 'Safeguarding', color: '#ef4444' },
        { name: 'Health & Safety', color: '#f97316' },
        { name: 'Medication', color: '#eab308' },
        { name: 'Staffing', color: '#3b82f6' },
        { name: 'Environmental', color: '#22c55e' },
      ];
      for (const cat of cats) {
        const r = await client.query(
          `INSERT INTO risk_categories (company_id, name, color) VALUES ($1, $2, $3) RETURNING id`,
          [companyId, cat.name, cat.color]
        );
        catId = r.rows[0].id;
      }
      console.log(`✅ Created risk categories`);
    }

    // ─── Sample Risks ─────────────────────────────────────────────────────────
    const existRisks = await client.query(`SELECT COUNT(*) FROM risks WHERE house_id = $1`, [houseId]);
    if (parseInt(existRisks.rows[0].count) < 2) {
      const risks = [
        { title: 'Medication administration errors', desc: 'Potential adverse health outcomes for residents due to medication errors', severity: 'high', status: 'open', likelihood: 3, impact: 4 },
        { title: 'Staffing shortage during night shifts', desc: 'Below minimum staffing ratio on weekend nights', severity: 'high', status: 'in_progress', likelihood: 4, impact: 3 },
        { title: 'Wet floor in bathroom — slip risk', desc: 'Persistent water pooling near shower area, fall risk for residents', severity: 'medium', status: 'open', likelihood: 3, impact: 3 },
        { title: 'Resident with escalating behaviour', desc: 'Resident displaying increased aggression, risk to other residents', severity: 'high', status: 'open', likelihood: 4, impact: 4 },
      ];
      for (const r of risks) {
        const reviewDue = new Date(); reviewDue.setDate(reviewDue.getDate() + 7);
        await client.query(
          `INSERT INTO risks (company_id, house_id, category_id, title, description, severity, status, likelihood, impact, assigned_to, created_by, review_due_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [companyId, houseId, catId, r.title, r.desc, r.severity, r.status, r.likelihood, r.impact, rmId, rmId, reviewDue]
        );
      }
      console.log(`✅ Created sample risks`);
    } else {
      console.log(`ℹ️  Risks already exist`);
    }

    // ─── Incident Categories ──────────────────────────────────────────────────
    const existIncCat = await client.query(`SELECT id FROM incident_categories WHERE company_id = $1 LIMIT 1`, [companyId]);
    let incCatId;
    if (existIncCat.rows.length > 0) {
      incCatId = existIncCat.rows[0].id;
    } else {
      const r = await client.query(
        `INSERT INTO incident_categories (company_id, name, description, reportable) VALUES ($1, 'Serious Incident', 'Reportable serious incident', true) RETURNING id`,
        [companyId]
      );
      incCatId = r.rows[0].id;
      await client.query(
        `INSERT INTO incident_categories (company_id, name, description, reportable) VALUES ($1, 'Near Miss', 'Near miss event', false) RETURNING id`,
        [companyId]
      );
      await client.query(
        `INSERT INTO incident_categories (company_id, name, description, reportable) VALUES ($1, 'Safeguarding', 'Safeguarding concern', true) RETURNING id`,
        [companyId]
      );
      console.log(`✅ Created incident categories`);
    }

    // ─── Sample Incidents ─────────────────────────────────────────────────────
    const existInc = await client.query(`SELECT COUNT(*) FROM incidents WHERE house_id = $1`, [houseId]);
    if (parseInt(existInc.rows[0].count) < 2) {
      const incidents = [
        { title: 'Resident fall in bedroom', desc: 'Resident found on floor, no apparent injury. Fall prevention review required.', severity: 'moderate', status: 'under_review', occurred: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { title: 'Medication error — wrong dosage', desc: 'Wrong dosage administered during morning rounds. GP notified, resident monitored.', severity: 'serious', status: 'open', occurred: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      ];
      for (const inc of incidents) {
        await client.query(
          `INSERT INTO incidents (company_id, house_id, category_id, title, description, severity, status, occurred_at, created_by, assigned_to, follow_up_required, reportable_to_authority)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)`,
          [companyId, houseId, incCatId, inc.title, inc.desc, inc.severity, inc.status, inc.occurred, rmId, rmId, inc.severity === 'serious']
        );
      }
      console.log(`✅ Created sample incidents`);
    } else {
      console.log(`ℹ️  Incidents already exist`);
    }

    console.log('\n🎉 RM data seeded! Summary:');
    console.log('   Company: Tanaka Care');
    console.log('   House: Tanaka View');
    console.log('   Pulse days: Mon/Wed/Fri');
    console.log('   Template: Weekly Governance Pulse (6 questions)');
    console.log('   Pulses: 3 past (completed) + upcoming schedule');
    console.log('   Risks: 4 sample risks (high/medium)');
    console.log('   Incidents: 2 sample incidents');

  } finally {
    client.release();
    pool.end();
  }
}

seed().catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
