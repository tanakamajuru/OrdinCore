import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { eventBus, EVENTS } from '../events/eventBus';

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
          COALESCE(e.service_unit_id, r.house_id, i.house_id) AS house_id
         FROM escalations e
         JOIN users u1 ON u1.id = e.escalated_by
         LEFT JOIN users u2 ON u2.id = e.escalated_to
         LEFT JOIN risks r ON r.id = e.risk_id
         LEFT JOIN incidents i ON i.id = e.incident_id
         LEFT JOIN houses h ON h.id = COALESCE(e.service_unit_id, r.house_id, i.house_id)
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

    await query(
      `UPDATE escalations SET status = 'resolved', resolved_at = NOW(), resolution_notes = $1, updated_at = NOW() WHERE id = $2`,
      [resolution_notes, id]
    );

    await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by)
       VALUES ($1,$2,$3,'resolved',$4,$5)`,
      [uuidv4(), id, company_id, resolution_notes, user_id]
    );

    await eventBus.emitEvent(EVENTS.ESCALATION_RESOLVED, { escalation_id: id, company_id, resolved_by: user_id });
    return { message: 'Escalation resolved successfully' };
  }

  async acknowledge(id: string, company_id: string, user_id: string) {
    await query(
      `UPDATE escalations SET status = 'acknowledged', acknowledged_at = NOW(), updated_at = NOW() WHERE id = $1 AND company_id = $2`,
      [id, company_id]
    );
    await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by) VALUES ($1,$2,$3,'acknowledged','Escalation acknowledged',$4)`,
      [uuidv4(), id, company_id, user_id]
    );
    return { message: 'Escalation acknowledged' };
  }

  async addAction(id: string, company_id: string, user_id: string, data: { action_type: string; description: string }) {
    const escalation = await query('SELECT * FROM escalations WHERE id = $1 AND company_id = $2', [id, company_id]);
    if (!escalation.rows[0]) throw new Error('Escalation not found');

    if (escalation.rows[0].status === 'resolved' || escalation.rows[0].status === 'closed') {
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

    if (escalation.rows[0].status === 'resolved' || escalation.rows[0].status === 'closed') {
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

    if (escalation.rows[0].status === 'resolved' || escalation.rows[0].status === 'closed') {
      throw new Error('This record is locked and cannot be modified (Governance Integrity Rule Section 7.2)');
    }

    const result = await query(
      `UPDATE escalations SET priority = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *`,
      [priority, id, company_id]
    );

    await query(
      `INSERT INTO escalation_actions (id, escalation_id, company_id, action_type, description, taken_by)
       VALUES ($1,$2,$3,'priority_updated',$4,$5)`,
      [uuidv4(), id, company_id, `Priority updated to ${priority}`, user_id]
    );

    return result.rows[0];
  }

  async getEscalationStats(company_id: string) {
    const result = await query(
      `SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'acknowledged' OR status = 'in_progress') AS active,
        COUNT(*) FILTER (WHERE priority = 'critical' OR priority = 'urgent') AS urgent_count
       FROM escalations
       WHERE company_id = $1`,
      [company_id]
    );
    return result.rows[0];
  }
}

export const escalationsService = new EscalationsService();
