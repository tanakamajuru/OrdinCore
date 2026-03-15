import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateIncidentDto {
  company_id: string;
  house_id: string;
  category_id?: string;
  title: string;
  description: string;
  severity?: string;
  occurred_at: Date;
  location?: string;
  immediate_action?: string;
  created_by: string;
  assigned_to?: string;
}

export const incidentsRepo = {
  async findById(id: string, company_id?: string) {
    const params: unknown[] = [id];
    let sql = `SELECT i.*, ic.name AS category_name, h.name AS house_name,
        u1.first_name || ' ' || u1.last_name AS created_by_name,
        u2.first_name || ' ' || u2.last_name AS assigned_to_name
      FROM incidents i
      LEFT JOIN incident_categories ic ON ic.id = i.category_id
      LEFT JOIN houses h ON h.id = i.house_id
      LEFT JOIN users u1 ON u1.id = i.created_by
      LEFT JOIN users u2 ON u2.id = i.assigned_to
      WHERE i.id = $1`;
    if (company_id) { sql += ' AND i.company_id = $2'; params.push(company_id); }
    const result = await query(sql, params);
    return result.rows[0] || null;
  },

  async findByCompany(company_id: string, filters: Record<string, unknown> = {}, limit = 50, offset = 0) {
    const conditions: string[] = ['i.company_id = $1'];
    const params: unknown[] = [company_id];
    let idx = 2;

    if (filters.status) { conditions.push(`i.status = $${idx++}`); params.push(filters.status); }
    if (filters.severity) { conditions.push(`i.severity = $${idx++}`); params.push(filters.severity); }
    if (filters.house_id) { conditions.push(`i.house_id = $${idx++}`); params.push(filters.house_id); }

    const where = conditions.join(' AND ');
    const result = await query(
      `SELECT i.*, ic.name AS category_name, h.name AS house_name
       FROM incidents i
       LEFT JOIN incident_categories ic ON ic.id = i.category_id
       LEFT JOIN houses h ON h.id = i.house_id
       WHERE ${where}
       ORDER BY i.occurred_at DESC
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
    const result = await query(`SELECT COUNT(*) FROM incidents WHERE ${conditions.join(' AND ')}`, params);
    return parseInt(result.rows[0].count);
  },

  async create(dto: CreateIncidentDto) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO incidents (id, company_id, house_id, category_id, title, description, severity, occurred_at, location, immediate_action, created_by, assigned_to)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [id, dto.company_id, dto.house_id, dto.category_id || null, dto.title, dto.description,
       dto.severity || 'moderate', dto.occurred_at, dto.location || null,
       dto.immediate_action || null, dto.created_by, dto.assigned_to || null]
    );
    return result.rows[0];
  },

  async update(id: string, company_id: string, data: Partial<CreateIncidentDto> & { status?: string; resolved_at?: Date }) {
    const allowed = ['title', 'description', 'severity', 'status', 'occurred_at', 'location', 'immediate_action', 'assigned_to', 'resolved_at', 'follow_up_required'];
    const filteredData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in data) filteredData[key] = (data as Record<string, unknown>)[key];
    }
    const fields = Object.keys(filteredData).map((k, i) => `${k} = $${i + 3}`).join(', ');
    const values = Object.values(filteredData);
    const result = await query(
      `UPDATE incidents SET ${fields}, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id, ...values]
    );
    return result.rows[0];
  },

  async getTimeline(incident_id: string, company_id: string) {
    const result = await query(
      `SELECT ie.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM incident_events ie
       JOIN users u ON u.id = ie.created_by
       WHERE ie.incident_id = $1 AND ie.company_id = $2
       ORDER BY ie.created_at DESC`,
      [incident_id, company_id]
    );
    return result.rows;
  },

  async addEvent(incident_id: string, company_id: string, event_type: string, description: string, created_by: string) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO incident_events (id, incident_id, company_id, event_type, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, incident_id, company_id, event_type, description, created_by]
    );
    return result.rows[0];
  },

  async getCategories(company_id: string) {
    const result = await query(
      `SELECT * FROM incident_categories WHERE company_id = $1 OR is_system = true ORDER BY name`,
      [company_id]
    );
    return result.rows;
  },

  async createCategory(company_id: string, data: { name: string; description?: string; severity_level?: string; created_by: string }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO incident_categories (id, company_id, name, description, severity_level, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, company_id, data.name, data.description || null, data.severity_level || 'moderate', data.created_by]
    );
    return result.rows[0];
  },

  async getAttachments(incident_id: string, company_id: string) {
    const result = await query(
      `SELECT a.*, u.first_name || ' ' || u.last_name AS uploaded_by_name
       FROM incident_attachments a
       JOIN users u ON u.id = a.uploaded_by
       WHERE a.incident_id = $1 AND a.company_id = $2
       ORDER BY a.created_at DESC`,
      [incident_id, company_id]
    );
    return result.rows;
  },

  async addAttachment(incident_id: string, company_id: string, data: { file_name: string; file_url: string; file_type?: string; file_size?: number; uploaded_by: string }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO incident_attachments (id, incident_id, company_id, file_name, file_url, file_type, file_size, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, incident_id, company_id, data.file_name, data.file_url, data.file_type || null, data.file_size || 0, data.uploaded_by]
    );
    return result.rows[0];
  },

  async removeAttachment(attachment_id: string, incident_id: string, company_id: string) {
    await query(
      `DELETE FROM incident_attachments WHERE id = $1 AND incident_id = $2 AND company_id = $3`,
      [attachment_id, incident_id, company_id]
    );
  },

  async assignIncident(incident_id: string, company_id: string, assigned_to: string) {
    const result = await query(
      `UPDATE incidents SET assigned_to = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *`,
      [assigned_to, incident_id, company_id]
    );
    return result.rows[0];
  },

  async resolveIncident(incident_id: string, company_id: string, resolution_notes: string) {
    const result = await query(
      `UPDATE incidents SET status = 'resolved', resolved_at = NOW(), updated_at = NOW() 
       WHERE id = $1 AND company_id = $2 RETURNING *`,
      [incident_id, company_id]
    );
    return result.rows[0];
  },

  async delete(id: string, company_id: string) {
    await query("UPDATE incidents SET status = 'closed', updated_at = NOW() WHERE id = $1 AND company_id = $2", [id, company_id]);
  }
};
