import { Request, Response } from 'express';
import { query } from '../config/database';

export class AdminController {
  async getUserStatsSummary(req: Request, res: Response) {
    try {
      const company_id = req.user?.company_id || null;
      console.log(`[AdminStats] Fetching user stats for company_id: ${company_id}`);

      const result = await query(
        `SELECT 
          COUNT(*) AS total, 
          COUNT(*) FILTER (WHERE status = 'active') AS active 
         FROM users 
         WHERE ($1::text IS NULL OR company_id::text = $1::text)`,
        [company_id]
      );
      
      const data = {
        total: parseInt(result.rows[0].total) || 0,
        active: parseInt(result.rows[0].active) || 0
      };
      return res.json({ success: true, data, meta: {} });
    } catch (err: any) {
      console.error('[AdminStats] User stats error:', err.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch user stats', error: err.message });
    }
  }

  async getHouseStatsSummary(req: Request, res: Response) {
    try {
      const company_id = req.user?.company_id || null;
      console.log(`[AdminStats] Fetching house stats for company_id: ${company_id}`);

      // Removed current_occupancy as it might not exist in the table
      const result = await query(
        `SELECT 
          COUNT(*) AS total, 
          COUNT(*) FILTER (WHERE status = 'active') AS active
         FROM houses 
         WHERE ($1::text IS NULL OR company_id::text = $1::text)`,
        [company_id]
      );
      
      const data = {
        total: parseInt(result.rows[0].total) || 0,
        active: parseInt(result.rows[0].active) || 0,
        occupancyRate: 0 // Default to 0 until column exists or logic is defined
      };
      
      return res.json({ success: true, data, meta: {} });
    } catch (err: any) {
      console.error('[AdminStats] House stats error:', err.message);
      return res.status(500).json({ success: false, message: 'Failed to fetch house stats', error: err.message });
    }
  }

  async getPulseStatsSummary(req: Request, res: Response) {
    try {
      const company_id = req.user?.company_id || null;
      const result = await query(
        `SELECT 
          COUNT(*) AS total, 
          COUNT(*) FILTER (WHERE status = 'pending') AS pending 
         FROM governance_pulses 
         WHERE ($1::text IS NULL OR company_id::text = $1::text)`,
        [company_id]
      );
      const data = {
        total: parseInt(result.rows[0].total) || 0,
        pending: parseInt(result.rows[0].pending) || 0
      };
      return res.json({ success: true, data, meta: {} });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: 'Failed to fetch pulse stats', error: err.message });
    }
  }

  async getRiskStatsSummary(req: Request, res: Response) {
    try {
      const company_id = req.user?.company_id || null;
      const result = await query(
        `SELECT 
          COUNT(*) AS total, 
          COUNT(*) FILTER (WHERE status = 'open') AS active 
         FROM risks 
         WHERE ($1::text IS NULL OR company_id::text = $1::text)`,
        [company_id]
      );
      const data = {
        total: parseInt(result.rows[0].total) || 0,
        active: parseInt(result.rows[0].active) || 0
      };
      return res.json({ success: true, data, meta: {} });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: 'Failed to fetch risk stats', error: err.message });
    }
  }
}

export const adminController = new AdminController();
