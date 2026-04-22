import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateRiskDto {
  company_id: string;
  house_id: string;
  category_id?: string;
  title: string;
  description?: string;
  severity?: string;
  likelihood?: number;
  impact?: number;
  assigned_to?: string;
  created_by: string;
  review_due_date?: Date;
  status?: string;
  metadata?: any;
  source_cluster_id?: string;
  trajectory?: string;
  control_effectiveness?: string;
  next_review_date?: Date;
  closure_reason?: string;
}

export const risksRepo = {
  async findById(id: string, company_id?: string) {
    const params: unknown[] = [id];
    let sql = `SELECT r.*, 
        rc.name AS category_name,
        u1.first_name || ' ' || u1.last_name AS created_by_name,
        u2.first_name || ' ' || u2.last_name AS assigned_to_name,
        h.name AS house_name,
        sc.cluster_label AS source_cluster_name
      FROM risks r
      LEFT JOIN risk_categories rc ON rc.id = r.category_id
      LEFT JOIN users u1 ON u1.id = r.created_by
      LEFT JOIN users u2 ON u2.id = r.assigned_to
      LEFT JOIN houses h ON h.id = r.house_id
      LEFT JOIN signal_clusters sc ON sc.id = r.source_cluster_id
      WHERE r.id = $1`;
    if (company_id) { sql += ' AND r.company_id = $2'; params.push(company_id); }
    const result = await query(sql, params);
    return result.rows[0] || null;
  },

  async findByCompany(company_id: string, filters: Record<string, unknown> = {}, limit = 50, offset = 0) {
    const conditions: string[] = ['r.company_id = $1'];
    const params: unknown[] = [company_id];
    let idx = 2;

    if (filters.status) { conditions.push(`r.status = $${idx++}`); params.push(filters.status); }
    if (filters.severity) { conditions.push(`r.severity = $${idx++}`); params.push(filters.severity); }
    if (filters.house_id) { conditions.push(`r.house_id = $${idx++}`); params.push(filters.house_id); }
    if (filters.assigned_to) { conditions.push(`r.assigned_to = $${idx++}`); params.push(filters.assigned_to); }

    const where = conditions.join(' AND ');
    const result = await query(
      `SELECT r.*, rc.name AS category_name, h.name AS house_name,
        u.first_name || ' ' || u.last_name AS assigned_to_name
       FROM risks r
       LEFT JOIN risk_categories rc ON rc.id = r.category_id
       LEFT JOIN houses h ON h.id = r.house_id
       LEFT JOIN users u ON u.id = r.assigned_to
       WHERE ${where}
       ORDER BY CASE WHEN r.status = 'Escalated' THEN 1 ELSE 2 END, r.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    return result.rows;
  },

  async countByCompany(company_id: string, filters: Record<string, unknown> = {}) {
    const conditions = ['company_id = $1'];
    const params: unknown[] = [company_id];
    let idx = 2;
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.severity) { conditions.push(`severity = $${idx++}`); params.push(filters.severity); }
    const result = await query(`SELECT COUNT(*) FROM risks WHERE ${conditions.join(' AND ')}`, params);
    return parseInt(result.rows[0].count);
  },

  async create(dto: CreateRiskDto) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO risks (
        id, company_id, house_id, category_id, title, description, severity, status, 
        likelihood, impact, assigned_to, created_by, review_due_date, metadata,
        source_cluster_id, trajectory, control_effectiveness, next_review_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [id, dto.company_id, dto.house_id, dto.category_id || null, dto.title, dto.description || null,
       dto.severity || 'Medium', dto.status || 'Open', dto.likelihood || null, dto.impact || null,
       dto.assigned_to || null, dto.created_by, dto.review_due_date || null, JSON.stringify(dto.metadata || {}),
       dto.source_cluster_id || null, dto.trajectory || 'Stable', dto.control_effectiveness || 'Partially', dto.next_review_date || null]
    );
    return result.rows[0];
  },

  async update(id: string, company_id: string, data: Partial<CreateRiskDto> & { status?: string; resolved_at?: Date }) {
    const allowed = [
      'title', 'description', 'severity', 'status', 'likelihood', 'impact', 
      'assigned_to', 'category_id', 'review_due_date', 'resolved_at',
      'trajectory', 'control_effectiveness', 'next_review_date', 'closure_reason'
    ];
    const filteredData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in data) filteredData[key] = (data as Record<string, unknown>)[key];
    }
    const fields = Object.keys(filteredData).map((k, i) => `${k} = $${i + 3}`).join(', ');
    const values = Object.values(filteredData);
    const result = await query(
      `UPDATE risks SET ${fields}, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id, ...values]
    );
    return result.rows[0];
  },

  async delete(id: string, company_id: string) {
    await query("UPDATE risks SET status = 'closed', updated_at = NOW() WHERE id = $1 AND company_id = $2", [id, company_id]);
  },

  async addEvent(risk_id: string, company_id: string, event_type: string, description: string, created_by: string) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO risk_events (id, risk_id, company_id, event_type, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, risk_id, company_id, event_type, description, created_by]
    );
    return result.rows[0];
  },

  async addAction(risk_id: string, company_id: string, data: { title: string; description?: string; assigned_to?: string; due_date?: Date; created_by: string }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO risk_actions (id, risk_id, company_id, title, description, assigned_to, due_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, risk_id, company_id, data.title, data.description || null, data.assigned_to || null, data.due_date || null, data.created_by]
    );
    return result.rows[0];
  },

  async getActions(risk_id: string, company_id: string) {
    const result = await query(
      `SELECT ra.*, 
        u1.first_name || ' ' || u1.last_name AS created_by_name,
        u2.first_name || ' ' || u2.last_name AS verified_by_rm_name,
        u3.first_name || ' ' || u3.last_name AS verified_by_ri_name
       FROM risk_actions ra
       JOIN users u1 ON u1.id = ra.created_by
       LEFT JOIN users u2 ON u2.id = ra.verified_by_rm
       LEFT JOIN users u3 ON u3.id = ra.verified_by_ri
       WHERE ra.risk_id = $1 AND ra.company_id = $2
       ORDER BY ra.created_at DESC`,
      [risk_id, company_id]
    );
    return result.rows;
  },

  async getActionById(id: string, company_id: string) {
    const result = await query(
      `SELECT * FROM risk_actions WHERE id = $1 AND company_id = $2`,
      [id, company_id]
    );
    return result.rows[0];
  },

  async updateAction(id: string, company_id: string, data: Record<string, any>) {
    const fields = Object.keys(data).map((k, i) => `${k} = $${i + 3}`).join(', ');
    const values = Object.values(data);
    const result = await query(
      `UPDATE risk_actions SET ${fields}, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id, ...values]
    );
    return result.rows[0];
  },

  async getTimeline(risk_id: string, company_id: string) {
    const result = await query(
      `SELECT re.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM risk_events re
       JOIN users u ON u.id = re.created_by
       WHERE re.risk_id = $1 AND re.company_id = $2
       ORDER BY re.created_at DESC`,
      [risk_id, company_id]
    );
    return result.rows;
  },

  async getCategories(company_id: string) {
    const result = await query(
      `SELECT * FROM risk_categories WHERE company_id = $1 ORDER BY name`,
      [company_id]
    );
    return result.rows;
  },

  async createCategory(company_id: string, data: { name: string; description?: string; color?: string; created_by: string }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO risk_categories (id, company_id, name, description, color, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, company_id, data.name, data.description || null, data.color || '#cccccc', data.created_by]
    );
    return result.rows[0];
  },

  async getAttachments(risk_id: string, company_id: string) {
    const result = await query(
      `SELECT a.*, u.first_name || ' ' || u.last_name AS uploaded_by_name
       FROM risk_attachments a
       JOIN users u ON u.id = a.uploaded_by
       WHERE a.risk_id = $1 AND a.company_id = $2
       ORDER BY a.created_at DESC`,
      [risk_id, company_id]
    );
    return result.rows;
  },

  async addAttachment(risk_id: string, company_id: string, data: { file_name: string; file_url: string; file_type?: string; file_size?: number; uploaded_by: string }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO risk_attachments (id, risk_id, company_id, file_name, file_url, file_type, file_size, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, risk_id, company_id, data.file_name, data.file_url, data.file_type || null, data.file_size || 0, data.uploaded_by]
    );
    return result.rows[0];
  },

  async removeAttachment(attachment_id: string, risk_id: string, company_id: string) {
    await query(
      `DELETE FROM risk_attachments WHERE id = $1 AND risk_id = $2 AND company_id = $3`,
      [attachment_id, risk_id, company_id]
    );
  },

  async assignRisk(risk_id: string, company_id: string, assigned_to: string) {
    const result = await query(
      `UPDATE risks SET assigned_to = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *`,
      [assigned_to, risk_id, company_id]
    );
    return result.rows[0];
  },

  async updateStatus(risk_id: string, company_id: string, status: string) {
    const result = await query(
      `UPDATE risks SET status = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *`,
      [status, risk_id, company_id]
    );
    return result.rows[0];
  }
};
