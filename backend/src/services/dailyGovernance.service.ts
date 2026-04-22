import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class DailyGovernanceService {
  async openLog(house_id: string, user_id: string, company_id: string) {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if log already exists for today
    const existing = await query(
      'SELECT * FROM daily_governance_log WHERE house_id = $1 AND review_date = $2',
      [house_id, today]
    );

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO daily_governance_log (id, house_id, review_date, completed, review_type)
       VALUES ($1, $2, $3, false, 'Primary') RETURNING *`,
      [id, house_id, today]
    );

    return result.rows[0];
  }

  async completeLog(log_id: string, note: string, user_id: string, company_id: string) {
    const result = await query(
      `UPDATE daily_governance_log 
       SET completed = true, daily_note = $1, reviewed_by = $2, completed_at = NOW()
       WHERE id = $3 RETURNING *`,
      [note, user_id, log_id]
    );

    if (!result.rows[0]) throw new Error('Governance log not found');
    return result.rows[0];
  }

  async getCoverage(company_id: string) {
    const result = await query(
      `SELECT h.id as house_id, h.name as house_name, 
              MAX(dgl.review_date) as last_review_date,
              CASE 
                WHEN MAX(dgl.review_date) = CURRENT_DATE THEN 'Up to Date'
                WHEN MAX(dgl.review_date) = CURRENT_DATE - INTERVAL '1 day' THEN 'Due'
                ELSE 'Overdue'
              END as status
       FROM houses h
       LEFT JOIN daily_governance_log dgl ON dgl.house_id = h.id AND dgl.completed = true
       WHERE h.company_id = $1
       GROUP BY h.id, h.name
       ORDER BY last_review_date DESC NULLS LAST`,
      [company_id]
    );
    return result.rows;
  }
}

export const dailyGovernanceService = new DailyGovernanceService();
