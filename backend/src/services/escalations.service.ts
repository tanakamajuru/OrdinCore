import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { eventBus, EVENTS } from '../events/eventBus';
import { risksRepo } from '../repositories/risks.repo';

export type EscalationLifecycleStatus =
  | 'Open'
  | 'Under Review'
  | 'Actions Implemented'
  | 'Monitoring Effectiveness'
  | 'Closed'
  | 'Reopened';

// Time-bound escalation SLAs (spec module 4). Hours until an escalation is "due by".
const ESCALATION_DUE_HOURS: Record<string, number> = {
  SIMILAR_SIGNALS_14_DAYS: 72,
  HIGH_SAFEGUARDING: 24,
  CROSS_SERVICE_PATTERN: 72,
  ACTION_INEFFECTIVE_TWICE: 72,
  SERIOUS_INCIDENT: 24,
  REOPENED_RISK: 72,
};

export function escalationDueBy(triggerType: string | undefined | null, now = new Date()): Date {
  const hours = (triggerType && ESCALATION_DUE_HOURS[triggerType]) || 72;
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

// Allowed lifecycle transitions for time-bound escalations.
const LIFECYCLE_TRANSITIONS: Record<EscalationLifecycleStatus, EscalationLifecycleStatus[]> = {
  'Open': ['Under Review'],
  'Under Review': ['Actions Implemented', 'Reopened'],
  'Actions Implemented': ['Monitoring Effectiveness'],
  'Monitoring Effectiveness': ['Closed', 'Reopened'],
  'Reopened': ['Under Review'],
  'Closed': [],
};

export class EscalationsService {
  async findAll(company_id: string, filters: Record<string, unknown> = {}, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const conditions = ['e.company_id = $1'];
    const params: unknown[] = [company_id];
    let idx = 2;
    if (filters.status) { conditions.push(`e.status = $${idx++}`); params.push(filters.status); }
    const where = conditions.join(' AND ');

    const [esc, countResult] = await Promise.all([
      query(
        `SELECT e.*,
          u1.first_name || ' ' || u1.last_name AS escalated_by_name,
          u2.first_name || ' ' || u2.last_name AS escalated_to_name,
          r.title AS risk_title,
          i.title AS incident_title,
          h.name AS house_name,
          h.name AS service_name,
          COALESCE(e.house_id, r.house_id, i.house_id) AS house_id,
          (e.due_by IS NOT NULL AND e.due_by < NOW() AND e.lifecycle_status <> 'Closed') AS overdue
         FROM escalations e
         JOIN users u1 ON u1.id = e.escalated_by
         LEFT JOIN users u2 ON u2.id = e.escalated_to
         LEFT JOIN risks r ON r.id = e.risk_id
         LEFT JOIN incidents i ON i.id = e.incident_id
         LEFT JOIN houses h ON h.id = COALESCE(e.house_id, r.house_id, i.house_id)
         WHERE ${where}
         ORDER BY e.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        params
      ),
      query(`SELECT COUNT(*) FROM escalations e WHERE ${where}`, params),
    ]);

    return { escalations: esc.rows, total: parseInt(countResult.rows[0].count), page, limit, pages: Math.ceil(parseInt(countResult.rows[0].count) / limit) };
  }

  async findById(id: string, company_id: string) {
    const result = await query(
      `SELECT e.*,
        u1.first_name || ' ' || u1.last_name AS escalated_by_name,
        u2.first_name || ' ' || u2.last_name AS escalated_to_name
       FROM escalations e
       JOIN users u1 ON u1.id = e.escalated_by
       JOIN users u2 ON u2.id = e.escalated_to
       WHERE e.id = $1 AND e.company_id = $2`,
      [id, company_id]
    );
    if (!result.rows[0]) throw new Error('Escalation not found');

    const actions = await query('SELECT * FROM escalation_actions WHERE escalation_id = $1 ORDER BY created_at', [id]);
    return { ...result.rows[0], actions: actions.rows };
  }

  async resolve(id: string, company_id: string, user_id: string, resolution_notes: string) {
    const escalation = await query('SELECT * FROM escalations WHERE id = $1 AND company_id = $2', [id, company_id]);
    if (!escalation.rows[0]) throw new Error('Escalation not found');

    if (escalation.rows[0].status === 'resolved' || escalation.rows[0].status === 'closed') {
      throw new Error('This record is locked and cannot be modified (Governance Integrity Rule Section 7.2)');
    }

    const status = 'Resolved';
    await query(
      `UPDATE escalations SET status = $1, resolved_at = NOW(), resolution_notes = $2, updated_at = NOW() WHERE id = $3`,
      [status, resolution_notes, id]
    );

    await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by)
       VALUES ($1,$2,$3,'Resolved',$4,$5)`,
      [uuidv4(), id, company_id, resolution_notes, user_id]
    );

    await eventBus.emitEvent(EVENTS.ESCALATION_RESOLVED, { escalation_id: id, company_id, resolved_by: user_id });

    // If escalation is linked to a risk, check remaining open escalations and update risk status if appropriate
    const riskId = escalation.rows[0].risk_id;
    if (riskId) {
      const openRes = await query(`SELECT COUNT(*) FROM escalations WHERE risk_id = $1 AND status NOT IN ('Resolved','Closed')`, [riskId]);
      const openCount = parseInt(openRes.rows[0].count || '0');
      if (openCount === 0) {
        try {
          await risksRepo.updateStatus(riskId, company_id, 'Open');
          await risksRepo.addEvent(riskId, company_id, 'escalation_resolved', `All escalations resolved for this risk`, user_id);
        } catch (err) {
          console.warn('Failed to update risk status after escalation resolved:', err);
        }
      }
    }

    return { message: 'Escalation resolved successfully' };
  }

  async acknowledge(id: string, company_id: string, user_id: string) {
    const res = await query(
      `UPDATE escalations SET status = 'Acknowledged', acknowledged_at = NOW(), updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id]
    );
    const escalation = res.rows[0];

    await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by) VALUES ($1,$2,$3,'Acknowledged','Escalation acknowledged',$4)`,
      [uuidv4(), id, company_id, user_id]
    );

    // If escalation linked to a risk, mark the risk status to 'Escalated'
    try {
      const riskId = escalation?.risk_id;
      if (riskId) {
        await risksRepo.updateStatus(riskId, company_id, 'Escalated');
        await risksRepo.addEvent(riskId, company_id, 'escalation_acknowledged', `Escalation acknowledged for this risk`, user_id);
      }
    } catch (err) {
      console.warn('Failed to update risk status after escalation acknowledged:', err);
    }

    return { message: 'Escalation acknowledged' };
  }

  async addAction(id: string, company_id: string, user_id: string, data: { action_type: string; description: string }) {
    const escalation = await query('SELECT * FROM escalations WHERE id = $1 AND company_id = $2', [id, company_id]);
    if (!escalation.rows[0]) throw new Error('Escalation not found');

    if (escalation.rows[0].status === 'Resolved' || escalation.rows[0].status === 'Closed') {
      throw new Error('This record is locked and cannot be modified (Governance Integrity Rule Section 7.2)');
    }

    const result = await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [uuidv4(), id, company_id, data.action_type, data.description, user_id]
    );
    return result.rows[0];
  }

  async getActions(id: string, company_id: string) {
    const escalation = await query('SELECT * FROM escalations WHERE id = $1 AND company_id = $2', [id, company_id]);
    if (!escalation.rows[0]) throw new Error('Escalation not found');

    const actions = await query(
      `SELECT ea.*, u.first_name || ' ' || u.last_name AS taken_by_name
       FROM escalation_actions ea
       JOIN users u ON u.id = ea.taken_by
       WHERE ea.escalation_id = $1 AND ea.company_id = $2
       ORDER BY ea.created_at DESC`,
      [id, company_id]
    );
    return actions.rows;
  }

  async assignEscalation(id: string, company_id: string, user_id: string, assigned_to: string) {
    const escalation = await query('SELECT * FROM escalations WHERE id = $1 AND company_id = $2', [id, company_id]);
    if (!escalation.rows[0]) throw new Error('Escalation not found');

    if (escalation.rows[0].status === 'Resolved' || escalation.rows[0].status === 'Closed') {
      throw new Error('This record is locked and cannot be modified (Governance Integrity Rule Section 7.2)');
    }

    const result = await query(
      `UPDATE escalations SET escalated_to = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *`,
      [assigned_to, id, company_id]
    );

    await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by)
       VALUES ($1,$2,$3,'assigned','Escalation reassigned',$4)`,
      [uuidv4(), id, company_id, user_id]
    );

    return result.rows[0];
  }

  async updatePriority(id: string, company_id: string, user_id: string, priority: string) {
    const escalation = await query('SELECT * FROM escalations WHERE id = $1 AND company_id = $2', [id, company_id]);
    if (!escalation.rows[0]) throw new Error('Escalation not found');

    if (escalation.rows[0].status === 'Resolved' || escalation.rows[0].status === 'Closed') {
      throw new Error('This record is locked and cannot be modified (Governance Integrity Rule Section 7.2)');
    }

    // Normalize priority to capitalize first letter to match DB constraint
    const normalizedPriority = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
    const result = await query(
      `UPDATE escalations SET priority = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *`,
      [normalizedPriority, id, company_id]
    );

    await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by)
       VALUES ($1,$2,$3,'priority_updated',$4,$5)`,
      [uuidv4(), id, company_id, `Priority updated to ${priority}`, user_id]
    );

    return result.rows[0];
  }

  /**
   * Move an escalation through its time-bound lifecycle, enforcing valid transitions.
   * Closure is handled separately by ClosureService (requires an evidenced closure review).
   */
  async transition(id: string, company_id: string, user_id: string, nextStatus: EscalationLifecycleStatus) {
    const escalation = await query('SELECT * FROM escalations WHERE id = $1 AND company_id = $2', [id, company_id]);
    if (!escalation.rows[0]) throw new Error('Escalation not found');

    const current: EscalationLifecycleStatus = escalation.rows[0].lifecycle_status || 'Open';
    if (current === 'Closed') {
      throw new Error('This escalation is closed and cannot be modified (Governance Integrity Rule).');
    }
    if (!LIFECYCLE_TRANSITIONS[current]?.includes(nextStatus)) {
      throw new Error(`Invalid escalation transition: ${current} -> ${nextStatus}`);
    }
    if (nextStatus === 'Closed') {
      throw new Error('Use the closure review flow to close an escalation.');
    }

    const result = await query(
      `UPDATE escalations
         SET lifecycle_status = $1,
             reviewed_at = CASE WHEN $1 = 'Under Review' AND reviewed_at IS NULL THEN NOW() ELSE reviewed_at END,
             actions_implemented_at = CASE WHEN $1 = 'Actions Implemented' THEN NOW() ELSE actions_implemented_at END,
             effectiveness_review_due = CASE WHEN $1 = 'Monitoring Effectiveness' THEN NOW() + INTERVAL '72 hours' ELSE effectiveness_review_due END,
             updated_at = NOW()
       WHERE id = $2 AND company_id = $3
       RETURNING *`,
      [nextStatus, id, company_id]
    );

    await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by)
       VALUES ($1,$2,$3,'lifecycle_transition',$4,$5)`,
      [uuidv4(), id, company_id, `Lifecycle moved to ${nextStatus}`, user_id]
    );

    return result.rows[0];
  }

  async reopen(id: string, company_id: string, user_id: string, reopened_reason: string) {
    if (!reopened_reason || reopened_reason.trim().length < 5) {
      throw new Error('A reason is required to reopen an escalation.');
    }
    const escalation = await query('SELECT * FROM escalations WHERE id = $1 AND company_id = $2', [id, company_id]);
    if (!escalation.rows[0]) throw new Error('Escalation not found');

    const result = await query(
      `UPDATE escalations
         SET lifecycle_status = 'Reopened',
             status = 'In Progress',
             reopened_at = NOW(),
             reopened_reason = $1,
             closed_at = NULL,
             due_by = $2,
             updated_at = NOW()
       WHERE id = $3 AND company_id = $4
       RETURNING *`,
      [reopened_reason, escalationDueBy('REOPENED_RISK'), id, company_id]
    );

    await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by)
       VALUES ($1,$2,$3,'reopened',$4,$5)`,
      [uuidv4(), id, company_id, `Escalation reopened: ${reopened_reason}`, user_id]
    );

    return result.rows[0];
  }

  async getEscalationStats(company_id: string) {
    const result = await query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE lifecycle_status <> 'Closed') AS open,
        COUNT(*) FILTER (WHERE lifecycle_status = 'Open') AS new_open,
        COUNT(*) FILTER (WHERE lifecycle_status = 'Under Review') AS under_review,
        COUNT(*) FILTER (WHERE lifecycle_status = 'Actions Implemented') AS actions_implemented,
        COUNT(*) FILTER (WHERE lifecycle_status = 'Monitoring Effectiveness') AS monitoring_effectiveness,
        COUNT(*) FILTER (WHERE lifecycle_status = 'Closed') AS closed,
        COUNT(*) FILTER (WHERE lifecycle_status <> 'Closed' AND due_by IS NOT NULL AND due_by < NOW()) AS overdue,
        COUNT(*) FILTER (WHERE lifecycle_status <> 'Closed' AND (due_by IS NULL OR due_by >= NOW())) AS on_time,
        COUNT(*) FILTER (WHERE priority = 'Critical' OR priority = 'Urgent') AS urgent_count
       FROM escalations
       WHERE company_id = $1`,
      [company_id]
    );
    return result.rows[0];
  }
}

export const escalationsService = new EscalationsService();
