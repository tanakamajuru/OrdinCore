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
}

export const usersRepo = {
  async findById(id: string) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByEmail(email: string) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  async findByCompany(company_id: string, limit = 50, offset = 0) {
    const result = await query(
      `SELECT u.*, p.job_title, p.phone, p.avatar_url
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.company_id = $1
       ORDER BY u.created_at DESC
       LIMIT $2 OFFSET $3`,
      [company_id, limit, offset]
    );
    return result.rows;
  },

  async countByCompany(company_id: string) {
    const result = await query('SELECT COUNT(*) FROM users WHERE company_id = $1', [company_id]);
    return parseInt(result.rows[0].count);
  },

  async create(dto: CreateUserDto) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, dto.company_id || null, dto.email, dto.password_hash, dto.first_name, dto.last_name, dto.role, dto.status || 'active']
    );
    return result.rows[0];
  },

  async update(id: string, data: Partial<CreateUserDto> & { last_login?: Date }) {
    const fields = Object.keys(data).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = Object.values(data);
    const result = await query(
      `UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $1 RETURNING *`,
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
};
