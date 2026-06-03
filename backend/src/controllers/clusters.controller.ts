import { Request, Response } from 'express';
import { query } from '../config/database';

export class ClustersController {
  async findById(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const cluster_id = req.params.id;

      const clusterRes = await query(
        `SELECT * FROM signal_clusters WHERE id = $1 AND company_id = $2`,
        [cluster_id, company_id]
      );

      if (clusterRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Cluster not found', errors: [] });
      }

      return res.json({ success: true, data: clusterRes.rows[0], meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch cluster';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }

  async findAll(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const filters = {
        status: req.query.status as string,
        house_id: req.query.house_id as string,
      };
      
      const params: any[] = [company_id];
      let conditions = 'c.company_id = $1';

      if (filters.house_id) {
        params.push(filters.house_id);
        conditions += ` AND c.house_id = $${params.length}`;
      }
      if (filters.status) {
        params.push(filters.status);
        conditions += ` AND c.cluster_status = $${params.length}`;
      }

      const sql = `SELECT c.*, h.name as house_name
                  FROM signal_clusters c
                  JOIN houses h ON h.id = c.house_id
                  WHERE ${conditions}
                  ORDER BY c.last_signal_date DESC`;

      const result = await query(sql, params);
      return res.json({ success: true, data: result.rows, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch clusters';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }
}

export const clustersController = new ClustersController();
