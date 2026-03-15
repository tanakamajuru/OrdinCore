import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class CompanyService {
  async create(data: { name: string; domain?: string; plan?: string; email?: string; phone?: string; address?: string }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO companies (id, name, domain, plan, email, phone, address)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, data.name, data.domain || null, data.plan || 'starter', data.email || null, data.phone || null, data.address || null]
    );
    return result.rows[0];
  }

  async findAll(limit = 50, offset = 0) {
    const result = await query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM users WHERE company_id = c.id) AS user_count,
        (SELECT COUNT(*) FROM houses WHERE company_id = c.id) AS house_count
       FROM companies c ORDER BY c.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = await query('SELECT COUNT(*) FROM companies');
    return { companies: result.rows, total: parseInt(total.rows[0].count) };
  }

  async findById(id: string) {
    const result = await query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM users WHERE company_id = c.id) AS user_count,
        (SELECT COUNT(*) FROM houses WHERE company_id = c.id) AS house_count
       FROM companies c WHERE c.id = $1`, [id]
    );
    return result.rows[0] || null;
  }

  async update(id: string, data: Partial<{ name: string; domain: string; status: string; plan: string; email: string; phone: string; address: string }>) {
    const allowed = ['name', 'domain', 'status', 'plan', 'email', 'phone', 'address', 'logo_url'];
    const filteredData: Record<string, unknown> = {};
    for (const key of allowed) { if (key in data) filteredData[key] = (data as Record<string, unknown>)[key]; }
    const fields = Object.keys(filteredData).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = Object.values(filteredData);
    const result = await query(
      `UPDATE companies SET ${fields}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }

  async delete(id: string) {
    await query("UPDATE companies SET status = 'suspended', updated_at = NOW() WHERE id = $1", [id]);
  }
}

export const companyService = new CompanyService();
