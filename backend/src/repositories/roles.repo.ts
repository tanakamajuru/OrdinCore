import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export const rolesRepo = {
  async findAll(company_id: string) {
    const result = await query(
      `SELECT r.*, COUNT(u.id) AS user_count
       FROM roles r
       LEFT JOIN users u ON u.role = r.name AND u.company_id = r.company_id
       WHERE r.company_id = $1 OR r.is_system = true
       GROUP BY r.id
       ORDER BY CASE WHEN r.is_system THEN 0 ELSE 1 END, r.name`,
      [company_id]
    );
    return result.rows;
  },

  async createRole(company_id: string, name: string, description: string, is_system: boolean = false) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO roles (id, company_id, name, description, is_system)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, company_id, name.toUpperCase(), description, is_system]
    );
    return result.rows[0];
  },

  async getRolePermissions(role_id: string) {
    const result = await query(
      `SELECT p.id, p.resource, p.action, p.description
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = $1`,
      [role_id]
    );
    return result.rows;
  },

  async addRolePermission(role_id: string, permission_id: string) {
    await query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [role_id, permission_id]
    );
  },

  async removeRolePermission(role_id: string, permission_id: string) {
    await query(
      `DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2`,
      [role_id, permission_id]
    );
  }
};
