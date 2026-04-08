"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.governanceService = exports.GovernanceService = void 0;
const database_1 = require("../config/database");
const uuid_1 = require("uuid");
const eventBus_1 = require("../events/eventBus");
const risks_service_1 = require("./risks.service");
class GovernanceService {
    async createPulse(company_id, data) {
        const id = (0, uuid_1.v4)();
        // Verify template exists
        const tpl = await (0, database_1.query)('SELECT * FROM governance_templates WHERE id = $1', [data.template_id]);
        if (!tpl.rows[0])
            throw new Error('Governance template not found');
        const result = await (0, database_1.query)(`INSERT INTO governance_pulses (id, company_id, house_id, template_id, status, due_date)
       VALUES ($1,$2,$3,$4,'DRAFT',$5) RETURNING *`, [id, company_id, data.house_id, data.template_id, data.due_date]);
        return result.rows[0];
    }
    async findAllPulses(company_id, filters = {}, page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        const conditions = ['gp.company_id = $1'];
        const params = [company_id];
        let idx = 2;
        if (filters.status) {
            conditions.push(`gp.status = $${idx++}`);
            params.push(filters.status);
        }
        if (filters.house_id) {
            conditions.push(`gp.house_id = $${idx++}`);
            params.push(filters.house_id);
        }
        if (filters.assigned_user_id) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(filters.assigned_user_id)) {
                conditions.push(`gp.assigned_user_id = $${idx++}`);
                params.push(filters.assigned_user_id);
            }
        }
        const where = conditions.join(' AND ');
        const [pulses, countResult] = await Promise.all([
            (0, database_1.query)(`SELECT gp.*, gt.name AS template_name, h.name AS house_name,
          u.first_name || ' ' || u.last_name AS completed_by_name
         FROM governance_pulses gp
         JOIN governance_templates gt ON gt.id = gp.template_id
         JOIN houses h ON h.id = gp.house_id
         LEFT JOIN users u ON u.id = gp.completed_by
         WHERE ${where}
         ORDER BY gp.due_date DESC
         LIMIT ${limit} OFFSET ${offset}`, params),
            (0, database_1.query)(`SELECT COUNT(*) FROM governance_pulses gp WHERE ${where}`, params),
        ]);
        return {
            pulses: pulses.rows,
            total: parseInt(countResult.rows[0].count),
            page, limit,
            pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
        };
    }
    async findPulseById(id, company_id) {
        const result = await (0, database_1.query)(`SELECT gp.*, gt.name AS template_name, h.name AS house_name,
        json_agg(json_build_object('question', gq.question, 'type', gq.question_type, 'order', gq.order_index))
          FILTER (WHERE gq.id IS NOT NULL) AS questions
       FROM governance_pulses gp
       JOIN governance_templates gt ON gt.id = gp.template_id
       JOIN houses h ON h.id = gp.house_id
       LEFT JOIN governance_questions gq ON gq.template_id = gp.template_id
       WHERE gp.id = $1 AND gp.company_id = $2
       GROUP BY gp.id, gt.name, h.name`, [id, company_id]);
        if (!result.rows[0])
            throw new Error('Governance pulse not found');
        // Load answers
        const answers = await (0, database_1.query)('SELECT * FROM governance_answers WHERE pulse_id = $1', [id]);
        return { ...result.rows[0], answers: answers.rows };
    }
    async submitAnswers(pulse_id, company_id, user_id, answers) {
        const pulse = await (0, database_1.query)('SELECT * FROM governance_pulses WHERE id = $1 AND company_id = $2', [pulse_id, company_id]);
        if (!pulse.rows[0])
            throw new Error('Governance pulse not found');
        // [GOVERNANCE] Locked Means Locked
        if (pulse.rows[0].status === 'completed' || pulse.rows[0].status === 'locked') {
            throw new Error('This pulse is already completed/locked and cannot be modified (Governance Integrity Rule Section 7.2)');
        }
        let totalQuestions = answers.length;
        let flaggedCount = 0;
        for (const ans of answers) {
            const id = (0, uuid_1.v4)();
            if (ans.flagged)
                flaggedCount++;
            await (0, database_1.query)(`INSERT INTO governance_answers (id, pulse_id, question_id, company_id, answer, comment, flagged, answered_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (pulse_id, question_id) DO UPDATE
         SET answer = $5, comment = $6, flagged = $7, answered_by = $8, answered_at = NOW()`, [id, pulse_id, ans.question_id, company_id, ans.answer, ans.comment || null, ans.flagged || false, user_id]);
        }
        const complianceScore = totalQuestions > 0 ? ((totalQuestions - flaggedCount) / totalQuestions) * 100 : 0;
        await (0, database_1.query)(`UPDATE governance_pulses SET status = 'SUBMITTED', completed_at = NOW(), completed_by = $1, compliance_score = $2, updated_at = NOW()
       WHERE id = $3`, [user_id, complianceScore.toFixed(2), pulse_id]);
        await eventBus_1.eventBus.emitEvent(eventBus_1.EVENTS.GOVERNANCE_COMPLETED, { pulse_id, company_id, compliance_score: complianceScore });
        // [GOVERNANCE] Risk Register Integration
        // If any question was flagged (answered 'yes' to a risk question), create a risk in the register
        if (flaggedCount > 0) {
            for (const ans of answers) {
                if (ans.flagged) {
                    // Get question text
                    const qRes = await (0, database_1.query)('SELECT question FROM governance_questions WHERE id = $1', [ans.question_id]);
                    const questionText = qRes.rows[0]?.question || 'Risk identified in governance pulse';
                    await risks_service_1.risksService.create(company_id, user_id, {
                        house_id: pulse.rows[0].house_id,
                        title: `Pulse Risk: ${questionText.substring(0, 50)}...`,
                        description: `Auto-generated from pulse answer: "${ans.answer}". Comment: ${ans.comment || 'None'}`,
                        severity: 'High',
                        metadata: { pulse_id, question_id: ans.question_id }
                    });
                }
            }
        }
        return { message: 'Governance pulse submitted', compliance_score: complianceScore };
    }
    async createTemplate(company_id, user_id, data) {
        const id = (0, uuid_1.v4)();
        await (0, database_1.query)(`INSERT INTO governance_templates (id, company_id, name, description, frequency, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)`, [id, company_id, data.name, data.description || null, data.frequency || 'monthly', user_id]);
        for (let i = 0; i < data.questions.length; i++) {
            const q = data.questions[i];
            await (0, database_1.query)(`INSERT INTO governance_questions (id, template_id, company_id, question, question_type, required, options, order_index)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [(0, uuid_1.v4)(), id, company_id, q.question, q.question_type || 'yes_no', q.required !== false, JSON.stringify(q.options || []), i]);
        }
        const result = await (0, database_1.query)('SELECT * FROM governance_templates WHERE id = $1', [id]);
        return result.rows[0];
    }
    async getTemplates(company_id) {
        const result = await (0, database_1.query)(`SELECT gt.*, COUNT(gq.id) AS question_count
       FROM governance_templates gt
       LEFT JOIN governance_questions gq ON gq.template_id = gt.id
       WHERE gt.company_id = $1 OR gt.company_id IS NULL
       GROUP BY gt.id
       ORDER BY (gt.company_id IS NULL AND gt.name = 'Standard Governance Pulse') DESC, gt.created_at DESC`, [company_id]);
        return result.rows;
    }
    async getTemplateQuestions(template_id, company_id) {
        const result = await (0, database_1.query)(`SELECT * FROM governance_questions 
       WHERE template_id = $1 AND (company_id = $2 OR company_id IS NULL)
       ORDER BY order_index ASC`, [template_id, company_id]);
        return result.rows;
    }
    async addTemplateQuestion(template_id, company_id, data) {
        const id = (0, uuid_1.v4)();
        const result = await (0, database_1.query)(`INSERT INTO governance_questions (id, template_id, company_id, question, question_type, required, options, order_index)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [id, template_id, company_id, data.question, data.question_type || 'yes_no', data.required !== false, JSON.stringify(data.options || []), data.order_index || 0]);
        return result.rows[0];
    }
    async updateTemplateQuestion(question_id, template_id, company_id, data) {
        const allowed = ['question', 'question_type', 'required', 'options', 'order_index'];
        const filteredData = {};
        for (const key of allowed) {
            if (key in data)
                filteredData[key] = data[key];
        }
        // Convert options to JSON string if it exists
        if (filteredData.options) {
            filteredData.options = JSON.stringify(filteredData.options);
        }
        const fields = Object.keys(filteredData).map((k, i) => `${k} = $${i + 4}`).join(', ');
        const values = Object.values(filteredData);
        const result = await (0, database_1.query)(`UPDATE governance_questions SET ${fields} 
       WHERE id = $1 AND template_id = $2 AND (company_id = $3 OR company_id IS NULL) RETURNING *`, [question_id, template_id, company_id, ...values]);
        return result.rows[0];
    }
    async removeTemplateQuestion(question_id, template_id, company_id) {
        await (0, database_1.query)(`DELETE FROM governance_questions WHERE id = $1 AND template_id = $2 AND (company_id = $3 OR company_id IS NULL)`, [question_id, template_id, company_id]);
    }
    async getPulseAnswers(pulse_id, company_id) {
        const result = await (0, database_1.query)(`SELECT ga.*, u.first_name || ' ' || u.last_name AS answered_by_name
       FROM governance_answers ga
       LEFT JOIN users u ON u.id = ga.answered_by
       WHERE ga.pulse_id = $1 AND ga.company_id = $2`, [pulse_id, company_id]);
        return result.rows;
    }
    async updatePulseStatus(pulse_id, company_id, status) {
        const result = await (0, database_1.query)(`UPDATE governance_pulses SET status = $1, updated_at = NOW() 
       WHERE id = $2 AND company_id = $3 RETURNING *`, [status, pulse_id, company_id]);
        return result.rows[0];
    }
    // [ENGINE] Governance Pulse Compliance Engine
    async checkPulseCompliance(company_id) {
        const result = await (0, database_1.query)(`UPDATE governance_pulses 
       SET status = 'LOCKED', updated_at = NOW()
       WHERE company_id = $1 
         AND status = 'DRAFT' 
         AND due_date < NOW()
       RETURNING id, house_id AS house_id, due_date`, [company_id]);
        for (const pulse of result.rows) {
            await eventBus_1.eventBus.emitEvent(eventBus_1.EVENTS.GOVERNANCE_OVERDUE, {
                pulse_id: pulse.id,
                company_id,
                house_id: pulse.house_id,
                due_date: pulse.due_date
            });
        }
        return result.rows;
    }
    // [ENGINE] Governance Pulse Engine (Generation)
    async generateMissingPulses(company_id, house_id, user_id) {
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
        if (house_id)
            params.push(house_id);
        if (user_id)
            params.push(user_id);
        const targetRes = await (0, database_1.query)(queryStr, params);
        for (const target of targetRes.rows) {
            const pulseDays = target.pulse_days || [];
            // Get template
            const tplRes = await (0, database_1.query)(`SELECT id FROM governance_templates 
         WHERE (company_id = $1 OR (company_id IS NULL AND name = 'Standard Governance Pulse')) 
         AND is_active = TRUE 
         ORDER BY (company_id IS NULL AND name = 'Standard Governance Pulse') DESC, created_at DESC 
         LIMIT 1`, [company_id]);
            const templateId = tplRes.rows[0]?.id;
            if (!templateId)
                continue;
            // Check next 7 days
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = new Date();
            for (let i = 0; i < 7; i++) {
                const d = new Date();
                d.setDate(today.getDate() + i);
                const dayName = days[d.getDay()];
                if (pulseDays.includes(dayName)) {
                    const dateStr = d.toISOString().split('T')[0];
                    const existing = await (0, database_1.query)('SELECT id FROM governance_pulses WHERE house_id = $1 AND due_date = $2 AND assigned_user_id = $3', [target.house_id, dateStr, target.user_id]);
                    if (existing.rows.length === 0) {
                        console.log(`[DEBUG_PULSE_GEN_XYZ] Generating pulse for user ${target.user_id} at house ${target.house_id} on ${dateStr}`);
                        await (0, database_1.query)(`INSERT INTO governance_pulses (id, company_id, house_id, template_id, status, due_date, assigned_user_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`, [(0, uuid_1.v4)(), company_id, target.house_id, templateId, 'DRAFT', dateStr, target.user_id]);
                    }
                }
            }
        }
    }
}
exports.GovernanceService = GovernanceService;
exports.governanceService = new GovernanceService();
//# sourceMappingURL=governance.service.js.map