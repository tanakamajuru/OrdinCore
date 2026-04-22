import { query } from '../config/database';
import { risksService } from './risks.service';
import { risksRepo } from '../repositories/risks.repo';
import logger from '../utils/logger';

export class ActionEffectivenessService {
  async rateEffectiveness(actionId: string, company_id: string, userId: string, data: { effectiveness: 'Effective' | 'Neutral' | 'Ineffective'; note?: string }) {
    const action = await risksRepo.getActionById(actionId, company_id);
    if (!action) throw new Error('Action not found');

    if (action.status !== 'Completed') {
      throw new Error('Governance Block: Effectiveness can only be rated for Completed actions.');
    }

    const result = await query(
      `UPDATE risk_actions 
       SET effectiveness = $1, effectiveness_reviewed_by = $2, effectiveness_reviewed_at = NOW(), verification_notes = COALESCE($3, verification_notes)
       WHERE id = $4 AND company_id = $5 RETURNING *`,
      [data.effectiveness, userId, data.note, actionId, company_id]
    );

    const updatedAction = result.rows[0];
    logger.info(`Action ${actionId} rated as ${data.effectiveness} by ${userId}`);

    // Trigger trajectory pipeline
    await risksService.updateTrajectoryFromActions(updatedAction.risk_id, company_id);

    return updatedAction;
  }

  async getPendingEffectiveness(company_id: string, house_id?: string) {
    // Actions completed > 48h ago but not yet rated
    let sql = `
      SELECT ra.*, h.name as house_name, r.risk_title
      FROM risk_actions ra
      JOIN risks r ON r.id = ra.risk_id
      JOIN houses h ON h.id = r.house_id
      WHERE ra.company_id = $1 
      AND ra.status = 'Completed' 
      AND ra.effectiveness IS NULL
      AND ra.completed_at <= NOW() - INTERVAL '48 hours'
    `;
    const params: any[] = [company_id];

    if (house_id) {
      sql += ` AND r.house_id = $2`;
      params.push(house_id);
    }

    sql += ` ORDER BY ra.completed_at ASC`;
    const res = await query(sql, params);
    return res.rows;
  }
}

export const actionEffectivenessService = new ActionEffectivenessService();
