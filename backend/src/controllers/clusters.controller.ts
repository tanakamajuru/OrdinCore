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
      
      const sql = `SELECT c.*, h.name as house_name 
                  FROM signal_clusters c
                  JOIN houses h ON h.id = c.house_id
                  WHERE c.company_id = $1
                  ORDER BY c.last_signal_date DESC`;
      
      const result = await query(sql, [company_id]);
      return res.json({ success: true, data: result.rows, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch clusters';
      return res.status(500).json({ success: false, message, errors: [] });
    }
  }
}

export const clustersController = new ClustersController();
