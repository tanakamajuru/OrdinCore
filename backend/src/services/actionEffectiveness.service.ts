import { query } from '../config/database';
import { risksService } from './risks.service';
import { risksRepo } from '../repositories/risks.repo';
import logger from '../utils/logger';

export type EffectivenessOutcome = 'Effective' | 'Partially Effective' | 'Not Effective' | 'Too Early To Assess';

// Map the 4 governance outcomes back to the legacy 3-value scale the
// trajectory pipeline (updateTrajectoryFromActions) still reads.
const OUTCOME_TO_LEGACY: Record<EffectivenessOutcome, 'Effective' | 'Neutral' | 'Ineffective' | null> = {
  'Effective': 'Effective',
  'Partially Effective': 'Neutral',
  'Not Effective': 'Ineffective',
  'Too Early To Assess': null,
};

const LEGACY_TO_OUTCOME: Record<string, EffectivenessOutcome> = {
  'Effective': 'Effective',
  'Neutral': 'Partially Effective',
  'Ineffective': 'Not Effective',
};

export class ActionEffectivenessService {
  async rateEffectiveness(
    actionId: string,
    company_id: string,
    userId: string,
    data: { outcome?: EffectivenessOutcome; effectiveness?: 'Effective' | 'Neutral' | 'Ineffective'; evidence?: string; note?: string }
  ) {
    const action = await risksRepo.getActionById(actionId, company_id);
    if (!action) throw new Error('Action not found');

    if (action.status !== 'Completed') {
      throw new Error('Governance Block: Effectiveness can only be rated for Completed actions.');
    }

    // Resolve the governance outcome from either the new or legacy field.
    const outcome: EffectivenessOutcome | undefined =
      data.outcome || (data.effectiveness ? LEGACY_TO_OUTCOME[data.effectiveness] : undefined);
    if (!outcome) throw new Error('An effectiveness outcome is required.');

    const evidence = data.evidence || data.note;
    if (outcome !== 'Too Early To Assess' && (!evidence || evidence.trim().length < 20)) {
      throw new Error('Evidence (at least 20 characters) is required for an effectiveness review.');
    }

    const legacy = OUTCOME_TO_LEGACY[outcome];

    const result = await query(
      `UPDATE risk_actions
       SET effectiveness_outcome = $1,
           effectiveness = COALESCE($2, effectiveness),
           effectiveness_evidence = COALESCE($3, effectiveness_evidence),
           effectiveness_reviewed_by = $4,
           effectiveness_reviewed_at = NOW(),
           verification_notes = COALESCE($3, verification_notes)
       WHERE id = $5 AND company_id = $6 RETURNING *`,
      [outcome, legacy, evidence, userId, actionId, company_id]
    );

    const updatedAction = result.rows[0];
    logger.info(`Action ${actionId} rated as ${outcome} by ${userId}`);

    // Trigger trajectory pipeline (only when the outcome maps to a directional signal).
    if (legacy) {
      await risksService.updateTrajectoryFromActions(updatedAction.risk_id, company_id);
    }

    return updatedAction;
  }

  async getPendingEffectiveness(company_id: string, house_id?: string) {
    // Actions completed > 48h ago but not yet rated
    let sql = `
      SELECT ra.*, h.name as house_name, r.title as risk_title
      FROM risk_actions ra
      JOIN risks r ON r.id = ra.risk_id
      JOIN houses h ON h.id = r.house_id
      WHERE ra.company_id = $1
      AND ra.status = 'Completed'
      AND ra.effectiveness_outcome IS NULL
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
