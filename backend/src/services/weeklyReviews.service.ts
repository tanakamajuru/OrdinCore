import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class WeeklyReviewsService {
  async save(company_id: string, user_id: string, data: { house_id: string; week_ending: string; content: any; status?: string }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO weekly_reviews (id, company_id, house_id, week_ending, content, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (house_id, week_ending) DO UPDATE
       SET content = $5, status = EXCLUDED.status, updated_at = NOW()
       RETURNING *`,
      [id, company_id, data.house_id, data.week_ending, JSON.stringify(data.content), data.status || 'draft', user_id]
    );
    return result.rows[0];
  }

  async findByHouse(company_id: string, house_id: string, limit = 10) {
    const result = await query(
      `SELECT wr.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM weekly_reviews wr
       JOIN users u ON u.id = wr.created_by
       WHERE wr.company_id = $1 AND wr.house_id = $2
       ORDER BY wr.week_ending DESC LIMIT $3`,
      [company_id, house_id, limit]
    );
    return result.rows;
  }

  async findById(id: string, company_id: string) {
    const result = await query(
      `SELECT wr.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM weekly_reviews wr
       JOIN users u ON u.id = wr.created_by
       WHERE wr.id = $1 AND wr.company_id = $2`,
      [id, company_id]
    );
    return result.rows[0];
  }
}

export const weeklyReviewsService = new WeeklyReviewsService();
