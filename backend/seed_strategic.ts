
import { query } from './src/config/database';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  try {
    // 1. Get or create a company to associate with
    const companyRes = await query('SELECT id FROM companies LIMIT 1');
    const companyId = companyRes.rows[0]?.id;
    if (!companyId) {
      console.error('No company found to seed questions for');
      return;
    }

    const userRes = await query('SELECT id FROM users LIMIT 1');
    const userId = userRes.rows[0]?.id;
    if (!userId) {
      console.error('No user found to seed questions for');
      return;
    }

    // 2. Create the Strategic Pulse Template
    const templateId = uuidv4();
    await query(
      `INSERT INTO governance_templates (id, company_id, name, description, frequency, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [templateId, companyId, 'Strategic Governance Pulse', 'Daily assessment across 5 core governance domains', 'daily', userId]
    );

    const questions = [
      // Section 1: Emerging Risk Signals
      { section: 'Emerging Risk Signals', q: 'Are there any new or emerging risks identified in the house today?', type: 'yes_no' },
      { section: 'Emerging Risk Signals', q: 'Have any new residents or staff changes introduced potential risks?', type: 'yes_no' },
      
      // Section 2: Risk Movement
      { section: 'Risk Movement', q: 'Have any existing risks deteriorated or increased in severity?', type: 'yes_no' },
      { section: 'Risk Movement', q: 'Are risk mitigation plans proving ineffective for any active risks?', type: 'yes_no' },

      // Section 3: Safeguarding Signals
      { section: 'Safeguarding Signals', q: 'Have any safeguarding concerns or incidents occurred in the last 24 hours?', type: 'yes_no' },
      { section: 'Safeguarding Signals', q: 'Are there any unexplained injuries or behavioral changes in residents?', type: 'yes_no' },

      // Section 4: Operational Pressure
      { section: 'Operational Pressure', q: 'Is there any staffing pressure (shortages, high agency use)?', type: 'yes_no' },
      { section: 'Operational Pressure', q: 'Are there any behavioral escalations or medication errors today?', type: 'yes_no' },
      { section: 'Operational Pressure', q: 'Are there any environmental or health and safety concerns?', type: 'yes_no' },

      // Section 5: Escalation Required
      { section: 'Escalation Required', q: 'Do any of today\'s findings require immediate escalation to the Provider?', type: 'yes_no' },
      { section: 'Escalation Required', q: 'Is a formal out-of-cycle risk review required for any item?', type: 'yes_no' }
    ];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await query(
        `INSERT INTO governance_questions (id, template_id, company_id, question, question_type, required, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuidv4(), templateId, companyId, `[${q.section}] ${q.q}`, q.type, true, i]
      );
    }

    // 3. Create a pending pulse for this template for the first house
    const houseRes = await query('SELECT id FROM houses WHERE company_id = $1 LIMIT 1', [companyId]);
    const houseId = houseRes.rows[0]?.id;
    if (houseId) {
      await query(
        `INSERT INTO governance_pulses (id, company_id, house_id, template_id, status, due_date)
         VALUES ($1, $2, $3, $4, 'pending', NOW())`,
        [uuidv4(), companyId, houseId, templateId]
      );
    }

    console.log('Successfully seeded strategic governance questions and created a pending pulse');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    process.exit();
  }
}

seed();
