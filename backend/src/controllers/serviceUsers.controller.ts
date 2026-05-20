import { Request, Response } from 'express';
import { query } from '../config/database';

export class ServiceUsersController {
  async update(req: Request, res: Response) {
    try {
      const result = await query(
        `UPDATE service_users SET is_active = $1 WHERE id = $2 RETURNING *`,
        [req.body.is_active, req.params.id]
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
