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

  async completeLog(log_id: string, note: string, user_id: string, company_id: string, is_deputy_review: boolean = false) {
    // 1. Check for High/Critical signals today if deputy review
    let enhanced_oversight = false;
    let director_notified = null;

    if (is_deputy_review) {
      const logRes = await query('SELECT house_id FROM daily_governance_log WHERE id = $1', [log_id]);
      const house_id = logRes.rows[0]?.house_id;
      
      const signalsRes = await query(
        `SELECT COUNT(*) FROM governance_pulses 
         WHERE house_id = $1 AND entry_date = CURRENT_DATE 
         AND severity IN ('High', 'Critical')`,
        [house_id]
      );
      
      if (parseInt(signalsRes.rows[0].count) > 0) {
        enhanced_oversight = true;
        director_notified = new Date();
        // [INTEGRATION] In a real system, trigger SMS/Email here via notificationsService
      }
    }

    const result = await query(
      `UPDATE daily_governance_log 
       SET completed = true, daily_note = $1, reviewed_by = $2, completed_at = NOW(), 
           is_deputy_review = $4, review_type = $5, 
           enhanced_oversight_required = $6, director_notified_at = $7
       WHERE id = $3 RETURNING *`,
      [note, user_id, log_id, is_deputy_review, is_deputy_review ? 'Deputy Cover' : 'Primary', enhanced_oversight, director_notified]
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
