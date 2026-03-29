import { pool } from '../src/config/database';
import logger from '../src/utils/logger';

async function seed() {
  const client = await pool.connect();
  try {
    // Check if standard template already exists
    const existing = await client.query(
      "SELECT id FROM governance_templates WHERE name = 'Standard Governance Pulse' AND company_id IS NULL"
    );

    // Delete old standard template if exists to ensure latest version
    await client.query(
      "DELETE FROM governance_templates WHERE name = 'Standard Governance Pulse' AND company_id IS NULL"
    );

    // Get superadmin ID
    const superadmin = await client.query(
      "SELECT id FROM users WHERE email = 'superadmin@caresignal.com'"
    );

    if (superadmin.rows.length === 0) {
      logger.error('Superadmin not found. Please run 001_superadmin.ts first.');
      process.exit(1);
    }

    const userId = superadmin.rows[0].id;

    await client.query('BEGIN');

    // Create template
    const templateResult = await client.query(
      `INSERT INTO governance_templates (name, description, frequency, is_active, created_by, company_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      ['Standard Governance Pulse', 'The standard 1.0 Governance Pulse for early warning signals.', 'weekly', true, userId, null]
    );

    const templateId = templateResult.rows[0].id;

    // Create questions
    const questions = [
      {
        question: 'Emerging Risk Signals: Have any new risks emerged since the last pulse?',
        type: 'yes_no',
        order: 1
      },
      {
        question: 'Risk Movement: Are any existing risks increasing or deteriorating?',
        type: 'yes_no',
        order: 2
      },
      {
        question: 'Safeguarding Signals: Any safeguarding concerns or indicators this week?',
        type: 'yes_no',
        order: 3
      },
      {
        question: 'Operational Pressure: Any operational pressures affecting service stability?',
        type: 'multi_select',
        options: JSON.stringify(['Staffing pressure', 'Behavioural support challenges', 'Medication concerns', 'Environmental issue', 'None']),
        order: 4
      },
      {
        question: 'Escalation Required: Does anything require leadership attention?',
        type: 'yes_no',
        order: 5
      }
    ];

    for (const q of questions) {
      await client.query(
        `INSERT INTO governance_questions (template_id, company_id, question, question_type, options, order_index, required)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [templateId, null, q.question, q.type, q.options || '[]', q.order, true]
      );
    }

    await client.query('COMMIT');

    logger.info(`✅ Standard Governance Pulse template created (ID: ${templateId})`);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Seed 002 failed', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  logger.error('Seed script 002 failed', err);
  process.exit(1);
});
