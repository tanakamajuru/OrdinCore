import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { eventBus, EVENTS } from '../events/eventBus';

export class AuditChecklistService {
  async createPulse(company_id: string, data: { house_id: string; entry_date: string; user_id?: string }) {
    const id = uuidv4();

    const result = await query(
      `INSERT INTO governance_pulses (id, company_id, house_id, review_status, entry_date, description, created_by)
       VALUES ($1,$2,$3,'New', $4, 'Systematic Governance Pulse', $5) RETURNING *, review_status as status, entry_date as due_date`,
      [id, company_id, data.house_id, data.entry_date, data.user_id || null]
    );

    return result.rows[0];
  }

  async findAllPulses(company_id: string, filters: Record<string, unknown> = {}, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const conditions = ['gp.company_id = $1'];
    const params: unknown[] = [company_id];
    let idx = 2;

    if (filters.status) { conditions.push(`gp.review_status = $${idx++}`); params.push(filters.status); }
    if (filters.house_id) { conditions.push(`gp.house_id = $${idx++}`); params.push(filters.house_id); }
    if (filters.assigned_user_id) { 
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(filters.assigned_user_id as string)) {
        conditions.push(`gp.assigned_user_id = $${idx++}`); 
        params.push(filters.assigned_user_id); 
      }
    }

    const where = conditions.join(' AND ');
    const [pulses, countResult] = await Promise.all([
      query(
        `SELECT gp.*, 
          CASE 
            WHEN gp.completed_at IS NOT NULL THEN 'SUBMITTED'
            ELSE 'DRAFT'
          END AS status,
          gp.entry_date AS due_date, h.name AS house_name,
          u.first_name || ' ' || u.last_name AS created_by_name
         FROM governance_pulses gp
         JOIN houses h ON h.id = gp.house_id
         LEFT JOIN users u ON u.id = gp.created_by
         WHERE ${where}
         ORDER BY gp.entry_date DESC
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
      `SELECT gp.*, 
        CASE 
          WHEN gp.completed_at IS NOT NULL THEN 'SUBMITTED'
          ELSE 'DRAFT'
        END AS status,
        gp.entry_date AS due_date, h.name AS house_name, u.first_name || ' ' || u.last_name AS created_by_name
       FROM governance_pulses gp
       JOIN houses h ON h.id = gp.house_id
       LEFT JOIN users u ON u.id = gp.created_by
       WHERE gp.id = $1 AND gp.company_id = $2`,
      [id, company_id]
    );
    if (!result.rows[0]) throw new Error('Governance pulse not found');

    const answers = await query(
      'SELECT * FROM governance_answers WHERE pulse_id = $1',
      [id]
    );

    return { ...result.rows[0], answers: answers.rows };
  }

  async submitAnswers(pulse_id: string, company_id: string, user_id: string, answers: Array<{ question_id: string; answer: string; comment?: string; flagged?: boolean }>) {
    const pulse = await query('SELECT * FROM governance_pulses WHERE id = $1 AND company_id = $2', [pulse_id, company_id]);
    if (pulse.rows[0].completed_at) {
      throw new Error('This pulse is already completed and cannot be modified');
    }

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
      `UPDATE governance_pulses SET completed_at = NOW(), completed_by = $1, updated_at = NOW()
       WHERE id = $2 AND company_id = $3`,
      [user_id, pulse_id, company_id]
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
       ORDER BY (gt.company_id IS NULL AND gt.name = 'Standard Governance Pulse') DESC, gt.created_at DESC`,
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
      `UPDATE governance_pulses SET review_status = $1, updated_at = NOW() 
       WHERE id = $2 AND company_id = $3 RETURNING *, review_status as status, entry_date as due_date`,
      [status, pulse_id, company_id]
    );
    return result.rows[0];
  }

  async checkPulseCompliance(company_id: string) {
    const result = await query(
      `UPDATE governance_pulses 
       SET review_status = 'LOCKED', updated_at = NOW()
       WHERE company_id = $1 
         AND review_status = 'DRAFT' 
         AND entry_date < NOW()
       RETURNING id, house_id AS house_id, entry_date as due_date`,
      [company_id]
    );

    for (const pulse of result.rows) {
      await eventBus.emitEvent(EVENTS.GOVERNANCE_OVERDUE, {
        pulse_id: pulse.id,
        company_id,
        house_id: pulse.house_id,
        due_date: pulse.due_date
      });
    }

    return result.rows;
  }

  async generateMissingPulses(company_id: string, house_id?: string, user_id?: string) {
    const queryStr = `
      SELECT u.id AS user_id, u.pulse_days, h.id AS house_id
      FROM users u
      JOIN houses h ON (h.manager_id = u.id OR EXISTS (SELECT 1 FROM user_houses uh WHERE uh.user_id = u.id AND uh.house_id = h.id))
      WHERE u.status = 'active' AND u.company_id = $1
      AND (u.pulse_days IS NOT NULL AND u.pulse_days <> '[]'::jsonb)
      ${house_id ? 'AND h.id = $2' : ''}
      ${user_id ? `AND u.id = $${house_id ? 3 : 2}` : ''}
    `;
    const params = [company_id];
    if (house_id) params.push(house_id);
    if (user_id) params.push(user_id);
    
    const targetRes = await query(queryStr, params);

    for (const target of targetRes.rows) {
      const pulseDays = target.pulse_days || [];
      
      const tplRes = await query(
        `SELECT id FROM governance_templates 
         WHERE (company_id = $1 OR (company_id IS NULL AND name = 'Standard Governance Pulse')) 
         AND is_active = TRUE 
         ORDER BY (company_id IS NULL AND name = 'Standard Governance Pulse') DESC, created_at DESC 
         LIMIT 1`,
        [company_id]
      );
      
      const templateId = tplRes.rows[0]?.id;
      if (!templateId) continue;

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = new Date();
      
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(today.getDate() + i);
        const dayName = days[d.getDay()];
        
        if (pulseDays.includes(dayName)) {
          const dateStr = d.toISOString().split('T')[0];
          
          const existing = await query(
            'SELECT id FROM governance_pulses WHERE house_id = $1 AND entry_date = $2 AND assigned_user_id = $3',
            [target.house_id, dateStr, target.user_id]
          );
          
          if (existing.rows.length === 0) {
            await query(
              `INSERT INTO governance_pulses (id, company_id, house_id, review_status, entry_date, assigned_user_id, description)
               VALUES ($1, $2, $3, 'New', $4, $5, 'Scheduled Governance Pulse') RETURNING *, review_status as status, entry_date as due_date`,
              [uuidv4(), company_id, target.house_id, dateStr, target.user_id]
            );

          }
        }
      }
    }
  }
}

export const auditChecklistService = new AuditChecklistService();
