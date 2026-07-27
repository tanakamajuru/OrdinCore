import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';

export class ClustersController {
  // Dismiss a pattern/cluster — requires a written reason (doctrine: every promote
  // and every dismiss carries a name + reason). Stored + auditable.
  async dismiss(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const cluster_id = req.params.id;
      const { reason } = req.body || {};
      if (!reason || String(reason).trim().length < 10) {
        return res.status(400).json({ success: false, message: 'A dismissal reason (min 10 characters) is required.', errors: [] });
      }
      const upd = await query(
        `UPDATE signal_clusters
            SET cluster_status = 'Dismissed', dismissed_by = $1, dismiss_reason = $2, updated_at = NOW()
          WHERE id = $3 AND company_id = $4 AND linked_risk_id IS NULL
          RETURNING id`,
        [req.user!.user_id, String(reason).trim(), cluster_id, company_id]
      );
      if (upd.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Cluster not found, or already promoted to a risk (cannot dismiss).', errors: [] });
      }
      await query(
        `INSERT INTO audit_logs (id, company_id, user_id, action, resource, resource_id, new_values)
         VALUES ($1,$2,$3,'PATTERN_DISMISSED','signal_cluster',$4,$5)`,
        [uuidv4(), company_id, req.user!.user_id, cluster_id, JSON.stringify({ reason: String(reason).trim() })]
      );
      return res.json({ success: true, data: { dismissed: true }, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to dismiss pattern';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const company_id = req.user!.company_id!;
      const cluster_id = req.params.id;

      const clusterRes = await query(
        `SELECT c.*, h.name AS house_name,
                (SELECT array_agg(hh.name ORDER BY hh.name) FROM houses hh WHERE hh.id = ANY(c.affected_house_ids)) AS affected_house_names
           FROM signal_clusters c LEFT JOIN houses h ON h.id = c.house_id
          WHERE c.id = $1 AND c.company_id = $2`,
        [cluster_id, company_id]
      );

      if (clusterRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Cluster not found', errors: [] });
      }
      const cluster = clusterRes.rows[0];

      // The signals that form this pattern — so the RM can open a pattern and read the actual
      // observations behind it before deciding. A within-service cluster has direct
      // risk_signal_links; a systemic (cross-service) cluster's evidence lives on its per-service
      // child clusters, so fall back to signals in the same domain across the affected houses.
      let signals = (await query(
        `SELECT gp.id, gp.description, gp.severity::text AS severity, gp.related_person,
                gp.entry_date, gp.entry_time, h.name AS house
           FROM risk_signal_links rsl JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id
           LEFT JOIN houses h ON h.id = gp.house_id
          WHERE rsl.cluster_id = $1 ORDER BY gp.entry_date DESC, gp.entry_time DESC`,
        [cluster_id]
      )).rows;
      if (signals.length === 0 && Array.isArray(cluster.affected_house_ids) && cluster.affected_house_ids.length && cluster.risk_domain) {
        signals = (await query(
          `SELECT gp.id, gp.description, gp.severity::text AS severity, gp.related_person,
                  gp.entry_date, gp.entry_time, h.name AS house
             FROM governance_pulses gp LEFT JOIN houses h ON h.id = gp.house_id
            WHERE gp.company_id = $1 AND gp.risk_domain && ARRAY[$2]::text[]
              AND gp.house_id = ANY($3::uuid[])
            ORDER BY gp.entry_date DESC, gp.entry_time DESC LIMIT 30`,
          [company_id, cluster.risk_domain, cluster.affected_house_ids]
        )).rows;
      }

      return res.json({ success: true, data: { ...cluster, signals }, meta: {} });
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
