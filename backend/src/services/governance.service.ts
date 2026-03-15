import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { eventBus, EVENTS } from '../events/eventBus';

export class GovernanceService {
  async createPulse(company_id: string, data: { house_id: string; template_id: string; due_date: Date }) {
    const id = uuidv4();

    // Verify template exists
    const tpl = await query('SELECT * FROM governance_templates WHERE id = $1', [data.template_id]);
    if (!tpl.rows[0]) throw new Error('Governance template not found');

    const result = await query(
      `INSERT INTO governance_pulses (id, company_id, house_id, template_id, status, due_date)
       VALUES ($1,$2,$3,$4,'pending',$5) RETURNING *`,
      [id, company_id, data.house_id, data.template_id, data.due_date]
    );

    return result.rows[0];
  }

  async findAllPulses(company_id: string, filters: Record<string, unknown> = {}, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const conditions = ['gp.company_id = $1'];
    const params: unknown[] = [company_id];
    let idx = 2;

    if (filters.status) { conditions.push(`gp.status = $${idx++}`); params.push(filters.status); }
    if (filters.house_id) { conditions.push(`gp.house_id = $${idx++}`); params.push(filters.house_id); }

    const where = conditions.join(' AND ');
    const [pulses, countResult] = await Promise.all([
      query(
        `SELECT gp.*, gt.name AS template_name, h.name AS house_name,
          u.first_name || ' ' || u.last_name AS completed_by_name
         FROM governance_pulses gp
         JOIN governance_templates gt ON gt.id = gp.template_id
         JOIN houses h ON h.id = gp.house_id
         LEFT JOIN users u ON u.id = gp.completed_by
         WHERE ${where}
         ORDER BY gp.due_date DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params
      ),
      query(`SELECT COUNT(*) FROM governance_pulses gp WHERE ${where}`, params),
    ]);

    return {
      pulses: pulses.rows,
      total: parseInt(countResult.rows[0].count),
      page, limit,
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    };
  }

  async findPulseById(id: string, company_id: string) {
    const result = await query(
      `SELECT gp.*, gt.name AS template_name, h.name AS house_name,
        json_agg(json_build_object('question', gq.question, 'type', gq.question_type, 'order', gq.order_index))
          FILTER (WHERE gq.id IS NOT NULL) AS questions
       FROM governance_pulses gp
       JOIN governance_templates gt ON gt.id = gp.template_id
       JOIN houses h ON h.id = gp.house_id
       LEFT JOIN governance_questions gq ON gq.template_id = gp.template_id
       WHERE gp.id = $1 AND gp.company_id = $2
       GROUP BY gp.id, gt.name, h.name`,
      [id, company_id]
    );
    if (!result.rows[0]) throw new Error('Governance pulse not found');

    // Load answers
    const answers = await query(
      'SELECT * FROM governance_answers WHERE pulse_id = $1',
      [id]
    );

    return { ...result.rows[0], answers: answers.rows };
  }

  async submitAnswers(pulse_id: string, company_id: string, user_id: string, answers: Array<{ question_id: string; answer: string; comment?: string; flagged?: boolean }>) {
    const pulse = await query('SELECT * FROM governance_pulses WHERE id = $1 AND company_id = $2', [pulse_id, company_id]);
    if (!pulse.rows[0]) throw new Error('Governance pulse not found');

    let totalQuestions = answers.length;
    let flaggedCount = 0;

    for (const ans of answers) {
      const id = uuidv4();
      if (ans.flagged) flaggedCount++;
      await query(
        `INSERT INTO governance_answers (id, pulse_id, question_id, company_id, answer, comment, flagged, answered_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (pulse_id, question_id) DO UPDATE
         SET answer = $5, comment = $6, flagged = $7, answered_by = $8, answered_at = NOW()`,
        [id, pulse_id, ans.question_id, company_id, ans.answer, ans.comment || null, ans.flagged || false, user_id]
      );
    }

    const complianceScore = totalQuestions > 0 ? ((totalQuestions - flaggedCount) / totalQuestions) * 100 : 0;

    await query(
      `UPDATE governance_pulses SET status = 'completed', completed_at = NOW(), completed_by = $1, compliance_score = $2, updated_at = NOW()
       WHERE id = $3`,
      [user_id, complianceScore.toFixed(2), pulse_id]
    );

    await eventBus.emitEvent(EVENTS.GOVERNANCE_COMPLETED, { pulse_id, company_id, compliance_score: complianceScore });
    return { message: 'Governance pulse submitted', compliance_score: complianceScore };
  }

  async createTemplate(company_id: string, user_id: string, data: { name: string; description?: string; frequency?: string; questions: Array<{ question: string; question_type: string; required?: boolean; options?: unknown[] }> }) {
    const id = uuidv4();
    await query(
      `INSERT INTO governance_templates (id, company_id, name, description, frequency, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, company_id, data.name, data.description || null, data.frequency || 'monthly', user_id]
    );

    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      await query(
        `INSERT INTO governance_questions (id, template_id, company_id, question, question_type, required, options, order_index)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [uuidv4(), id, company_id, q.question, q.question_type || 'yes_no', q.required !== false, JSON.stringify(q.options || []), i]
      );
    }

    const result = await query('SELECT * FROM governance_templates WHERE id = $1', [id]);
    return result.rows[0];
  }

  async getTemplates(company_id: string) {
    const result = await query(
      `SELECT gt.*, COUNT(gq.id) AS question_count
       FROM governance_templates gt
       LEFT JOIN governance_questions gq ON gq.template_id = gt.id
       WHERE gt.company_id = $1 OR gt.company_id IS NULL
       GROUP BY gt.id
       ORDER BY gt.created_at DESC`,
      [company_id]
    );
    return result.rows;
  }

  async getTemplateQuestions(template_id: string, company_id: string) {
    const result = await query(
      `SELECT * FROM governance_questions 
       WHERE template_id = $1 AND (company_id = $2 OR company_id IS NULL)
       ORDER BY order_index ASC`,
      [template_id, company_id]
    );
    return result.rows;
  }

  async addTemplateQuestion(template_id: string, company_id: string, data: { question: string; question_type: string; required?: boolean; options?: unknown[]; order_index?: number }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO governance_questions (id, template_id, company_id, question, question_type, required, options, order_index)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, template_id, company_id, data.question, data.question_type || 'yes_no', data.required !== false, JSON.stringify(data.options || []), data.order_index || 0]
    );
    return result.rows[0];
  }

  async updateTemplateQuestion(question_id: string, template_id: string, company_id: string, data: Record<string, unknown>) {
    const allowed = ['question', 'question_type', 'required', 'options', 'order_index'];
    const filteredData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in data) filteredData[key] = data[key];
    }
    
    // Convert options to JSON string if it exists
    if (filteredData.options) {
      filteredData.options = JSON.stringify(filteredData.options);
    }

    const fields = Object.keys(filteredData).map((k, i) => `${k} = $${i + 4}`).join(', ');
    const values = Object.values(filteredData);
    
    const result = await query(
      `UPDATE governance_questions SET ${fields} 
       WHERE id = $1 AND template_id = $2 AND (company_id = $3 OR company_id IS NULL) RETURNING *`,
      [question_id, template_id, company_id, ...values]
    );
    return result.rows[0];
  }

  async removeTemplateQuestion(question_id: string, template_id: string, company_id: string) {
    await query(
      `DELETE FROM governance_questions WHERE id = $1 AND template_id = $2 AND (company_id = $3 OR company_id IS NULL)`,
      [question_id, template_id, company_id]
    );
  }

  async getPulseAnswers(pulse_id: string, company_id: string) {
    const result = await query(
      `SELECT ga.*, u.first_name || ' ' || u.last_name AS answered_by_name
       FROM governance_answers ga
       LEFT JOIN users u ON u.id = ga.answered_by
       WHERE ga.pulse_id = $1 AND ga.company_id = $2`,
      [pulse_id, company_id]
    );
    return result.rows;
  }

  async updatePulseStatus(pulse_id: string, company_id: string, status: string) {
    const result = await query(
      `UPDATE governance_pulses SET status = $1, updated_at = NOW() 
       WHERE id = $2 AND company_id = $3 RETURNING *`,
      [status, pulse_id, company_id]
    );
    return result.rows[0];
  }
}

export const governanceService = new GovernanceService();
