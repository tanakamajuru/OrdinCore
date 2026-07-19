import { Request, Response } from 'express';
import { query } from '../config/database';

export class ServiceUsersController {
  // List all patients (service users) for the company, with optional search + site filter.
  async list(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const role = (req.user!.role || '').toUpperCase().replace('-', '_');
      const scoped = ['REGISTERED_MANAGER', 'TEAM_LEADER'].includes(role);
      const search = ((req.query.search as string) || '').trim();
      const houseId = req.query.house_id as string;

      const conditions: string[] = ['h.company_id = $1'];
      const params: unknown[] = [company_id];
      let idx = 2;

      if (scoped) {
        const houseIds = req.user!.assigned_house_ids || [];
        conditions.push(`su.house_id = ANY($${idx++}::uuid[])`);
        params.push(houseIds);
      }
      if (houseId && houseId !== 'all') {
        conditions.push(`su.house_id = $${idx++}`);
        params.push(houseId);
      }
      if (search) {
        conditions.push(`(su.display_name ILIKE $${idx} OR su.first_name ILIKE $${idx} OR su.last_name ILIKE $${idx})`);
        params.push(`%${search}%`);
        idx++;
      }

      const result = await query(
        `SELECT su.id, su.first_name, su.last_name, su.display_name, su.is_active,
                su.house_id, h.name AS house_name, COALESCE(su.vulnerability, 3) AS vulnerability
           FROM service_users su
           JOIN houses h ON h.id = su.house_id
          WHERE ${conditions.join(' AND ')}
          ORDER BY h.name ASC, su.display_name ASC`,
        params
      );
      return res.json({ success: true, data: result.rows, meta: { total: result.rows.length } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch patients';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const sets: string[] = [];
      const params: unknown[] = [];
      let idx = 1;
      if (req.body.is_active !== undefined) { sets.push(`is_active = $${idx++}`); params.push(req.body.is_active); }
      if (req.body.vulnerability !== undefined) {
        const v = Math.round(Number(req.body.vulnerability));
        if (!(v >= 1 && v <= 5)) return res.status(400).json({ success: false, message: 'Vulnerability must be 1–5.', errors: [] });
        sets.push(`vulnerability = $${idx++}`); params.push(v);
      }
      if (sets.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update.', errors: [] });
      sets.push('updated_at = NOW()');
      params.push(req.params.id);
      const result = await query(
        `UPDATE service_users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Service user not found', errors: [] });
      }

      return res.json({ success: true, data: result.rows[0], meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update service user';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }
}

export const serviceUsersController = new ServiceUsersController();
