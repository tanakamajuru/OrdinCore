import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateUserDto {
  company_id?: string | null;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  status?: string;
  pulse_days?: string[];
}

export const usersRepo = {
  async findById(id: string, company_id?: string | null) {
    const isSuperAdmin = !company_id;
    const params = isSuperAdmin ? [id] : [id, company_id];
    
    const result = await query(
      `SELECT u.*, (u.first_name || ' ' || u.last_name) as name, (u.status = 'active') as is_active,
              COALESCE(uh.house_id, h_direct.id) AS assigned_house_id,
              COALESCE(h.name, h_direct.name) AS assigned_house_name
       FROM users u
       LEFT JOIN user_houses uh ON uh.user_id = u.id
       LEFT JOIN houses h ON h.id = uh.house_id
       LEFT JOIN houses h_direct ON h_direct.manager_id = u.id
       WHERE u.id = $1 ${isSuperAdmin ? '' : "AND u.company_id = $2 AND u.role != 'SUPER_ADMIN'"}`,
      params
    );
    return result.rows[0] || null;
  },

  async findByEmail(email: string) {
    const result = await query('SELECT *, (first_name || \' \' || last_name) as name, (status = \'active\') as is_active FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  async findByCompany(company_id: string | null, limit = 50, offset = 0, role?: string, status?: string) {
    const isSuperAdmin = !company_id;
    let sql = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.company_id,
             (u.first_name || ' ' || u.last_name) as name,
             u.role, u.status, (u.status = 'active') as is_active,
             u.created_at, u.updated_at,
             u.pulse_days,
             COALESCE(
               (SELECT CASE WHEN COUNT(*) > 1 THEN 'all' ELSE MAX(house_id::text) END FROM user_houses WHERE user_id = u.id),
               (SELECT CASE WHEN COUNT(*) > 1 THEN 'all' ELSE MAX(id::text) END FROM houses WHERE manager_id = u.id)
             ) AS assigned_house_id,
             COALESCE(
               (SELECT CASE WHEN COUNT(*) > 1 THEN 'All Sites' ELSE MAX(h.name) END FROM user_houses uh JOIN houses h ON h.id = uh.house_id WHERE uh.user_id = u.id),
               (SELECT CASE WHEN COUNT(*) > 1 THEN 'All Sites' ELSE MAX(name) END FROM houses WHERE manager_id = u.id)
             ) AS assigned_house_name
      FROM users u
      WHERE 1=1 ${isSuperAdmin ? '' : "AND u.company_id = $1 AND u.role != 'SUPER_ADMIN'"}
    `;
    const params: unknown[] = isSuperAdmin ? [] : [company_id];

    if (role) {
      sql += ` AND u.role = $${params.length + 1}`;
      params.push(role);
    }
    if (status) {
      sql += ` AND u.status = $${params.length + 1}`;
      params.push(status);
    }

    sql += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows;
  },

  async countByCompany(company_id: string | null, role?: string, status?: string) {
    const isSuperAdmin = !company_id;
    let sql = `SELECT COUNT(*) FROM users WHERE 1=1 ${isSuperAdmin ? '' : "AND company_id = $1 AND role != 'SUPER_ADMIN'"}`;
    const params: any[] = isSuperAdmin ? [] : [company_id];

    if (role) {
      sql += ` AND role = $${params.length + 1}`;
      params.push(role);
    }
    if (status) {
      sql += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    const result = await query(sql, params);
    return parseInt(result.rows[0].count);
  },

  async create(dto: CreateUserDto) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, status, pulse_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *, (first_name || ' ' || last_name) as name, (status = 'active') as is_active`,
      [id, dto.company_id || null, dto.email, dto.password_hash, dto.first_name, dto.last_name, dto.role, dto.status || 'active', JSON.stringify(dto.pulse_days || [])]
    );
    return result.rows[0];
  },

  async update(id: string, data: Partial<CreateUserDto> & { last_login?: Date }) {
    const updateData = { ...data };
    if (Object.keys(updateData).length === 0) {
      return this.findById(id);
    }
    if (updateData.pulse_days) {
      (updateData as any).pulse_days = JSON.stringify(updateData.pulse_days);
    }
    const fields = Object.keys(updateData).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = Object.values(updateData);
    const result = await query(
      `UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $1 RETURNING *, (first_name || ' ' || last_name) as name, (status = 'active') as is_active`,
      [id, ...values]
    );
    return result.rows[0];
  },

  async delete(id: string) {
    await query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', ['inactive', id]);
  },

  async createProfile(user_id: string, data: { phone?: string; job_title?: string }) {
    const result = await query(
      `INSERT INTO user_profiles (user_id, phone, job_title)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET phone = $2, job_title = $3, updated_at = NOW()
       RETURNING *`,
      [user_id, data.phone || null, data.job_title || null]
    );
    return result.rows[0];
  },

  async assignToHouse(user_id: string, house_id: string, company_id: string, role_in_house?: string) {
    const result = await query(
      `INSERT INTO user_houses (user_id, house_id, company_id, role_in_house)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, house_id) DO UPDATE SET role_in_house = $4
       RETURNING *`,
      [user_id, house_id, company_id, role_in_house || null]
    );
    return result.rows[0];
  },

  async clearAssignedHouses(user_id: string) {
    await query(`DELETE FROM user_houses WHERE user_id = $1`, [user_id]);
  },

  async getHouses(user_id: string) {
    const result = await query(
      `SELECT h.*, uh.role_in_house, uh.assigned_at
       FROM user_houses uh
       JOIN houses h ON h.id = uh.house_id
       WHERE uh.user_id = $1 AND h.status != 'closed'
       ORDER BY h.name`,
      [user_id]
    );
    return result.rows;
  },

  async getPermissions(user_id: string) {
    const result = await query(
      `SELECT DISTINCT p.name, p.description, p.module
       FROM users u
       JOIN role_permissions rp ON rp.role_id = (SELECT id FROM roles WHERE name = u.role LIMIT 1)
       JOIN permissions p ON p.id = rp.permission_id
       WHERE u.id = $1`,
       [user_id]
    );
    return result.rows;
  },

  async getRoleDetails(user_id: string) {
     const result = await query(
       `SELECT r.id, r.name, r.description 
        FROM users u 
        JOIN roles r ON r.name = u.role 
        WHERE u.id = $1 LIMIT 1`,
        [user_id]
     );
     return result.rows;
  },

  async assignRole(user_id: string, role_name: string) {
     const result = await query(
       `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
       [role_name, user_id]
     );
     return result.rows[0];
  },
  
  async updateStatus(user_id: string, status: string) {
     const result = await query(
       `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
       [status, user_id]
     );
     return result.rows[0];
  }
};
