import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateHouseDto {
  company_id: string;
  name: string;
  address?: string;
  postcode?: string;
  city?: string;
  capacity?: number;
  manager_id?: string;
  registration_number?: string;
}

export const housesRepo = {
  async findById(id: string, company_id?: string) {
    const params: unknown[] = [id];
    let sql = 'SELECT * FROM houses WHERE id = $1';
    if (company_id) {
      sql += ' AND company_id = $2';
      params.push(company_id);
    }
    const result = await query(sql, params);
    return result.rows[0] || null;
  },

  async findByCompany(company_id: string, filters: Record<string, unknown> = {}, limit = 50, offset = 0) {
    const conditions = ['h.company_id = $1'];
    const params: unknown[] = [company_id];
    let idx = 2;

    if (filters.search) {
      conditions.push(`(h.name ILIKE $${idx} OR h.city ILIKE $${idx} OR h.postcode ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.is_active !== undefined) {
      conditions.push(`h.is_active = $${idx++}`);
      params.push(filters.is_active === 'true' || filters.is_active === true);
    }

    const where = conditions.join(' AND ');
    const result = await query(
      `SELECT h.*, u.first_name AS manager_first_name, u.last_name AS manager_last_name
       FROM houses h
       LEFT JOIN users u ON u.id = h.manager_id
       WHERE ${where}
       ORDER BY h.name
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    return result.rows;
  },

  async countByCompany(company_id: string, filters: Record<string, unknown> = {}) {
    const conditions = ['company_id = $1'];
    const params: unknown[] = [company_id];
    let idx = 2;

    if (filters.search) {
      conditions.push(`(name ILIKE $${idx} OR city ILIKE $${idx} OR postcode ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    if (filters.is_active !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      params.push(filters.is_active === 'true' || filters.is_active === true);
    }

    const where = conditions.join(' AND ');
    const result = await query(`SELECT COUNT(*) FROM houses WHERE ${where}`, params);
    return parseInt(result.rows[0].count);
  },

  async create(dto: CreateHouseDto) {
    // [GOVERNANCE] Anti-duplication Check
    const existing = await query(
      'SELECT id FROM houses WHERE company_id = $1 AND (name = $2 OR (registration_number = $3 AND registration_number IS NOT NULL))',
      [dto.company_id, dto.name, dto.registration_number || null]
    );
    if (existing.rows.length > 0) {
      throw new Error('A site with this name or registration number already exists in your organisation (Governance Integrity Rule Section 8.4)');
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO houses (id, company_id, name, address, postcode, city, capacity, manager_id, registration_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, dto.company_id, dto.name, dto.address || null, dto.postcode || null, dto.city || null,
       dto.capacity || 0, dto.manager_id || null, dto.registration_number || null]
    );
    return result.rows[0];
  },

  async update(id: string, company_id: string, data: Partial<CreateHouseDto>) {
    const allowed = ['name', 'address', 'postcode', 'city', 'capacity', 'manager_id', 'status', 'registration_number'];
    const filteredData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in data) filteredData[key] = (data as Record<string, unknown>)[key];
    }
    const fields = Object.keys(filteredData).map((k, i) => `${k} = $${i + 3}`).join(', ');
    const values = Object.values(filteredData);
    const result = await query(
      `UPDATE houses SET ${fields}, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id, ...values]
    );
    return result.rows[0];
  },

  async delete(id: string, company_id: string) {
    await query("UPDATE houses SET status = 'closed', updated_at = NOW() WHERE id = $1 AND company_id = $2", [id, company_id]);
  },

  async getUsers(house_id: string, company_id: string) {
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, uh.role_in_house, uh.assigned_at
       FROM user_houses uh
       JOIN users u ON u.id = uh.user_id
       WHERE uh.house_id = $1 AND uh.company_id = $2 AND u.status = 'active'
       ORDER BY u.first_name`,
      [house_id, company_id]
    );
    return result.rows;
  },

  async assignStaff(house_id: string, company_id: string, user_id: string, role_in_house?: string) {
    const result = await query(
      `INSERT INTO user_houses (user_id, house_id, company_id, role_in_house)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, house_id) DO UPDATE SET role_in_house = $4
       RETURNING *`,
      [user_id, house_id, company_id, role_in_house || null]
    );
    return result.rows[0];
  },

  async removeStaff(house_id: string, company_id: string, user_id: string) {
    await query(
      `DELETE FROM user_houses WHERE house_id = $1 AND company_id = $2 AND user_id = $3`,
      [house_id, company_id, user_id]
    );
  },

  async getSettings(house_id: string, company_id: string) {
    const result = await query(
      `SELECT * FROM house_settings WHERE house_id = $1 LIMIT 1`,
      [house_id]
    );
    // If no settings exist yet, return a default template
    if (result.rows.length === 0) {
      return { house_id, company_id, notification_preferences: {}, default_escalation_paths: {} };
    }
    return result.rows[0];
  },

  async updateSettings(house_id: string, company_id: string, settings: any) {
    const result = await query(
      `INSERT INTO house_settings (house_id, settings)
       VALUES ($1, $2)
       ON CONFLICT (house_id) DO UPDATE SET settings = $2, updated_at = NOW()
       RETURNING *`,
      [house_id, JSON.stringify(settings || {})]
    );
    return result.rows[0];
  }
};
