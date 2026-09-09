import { query } from '../config/database';
import { risksService } from './risks.service';
import { risksRepo } from '../repositories/risks.repo';
import logger from '../utils/logger';
import { reviewObligationsService } from './reviewObligations.service';

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
      if (updatedAction.risk_id) await risksService.updateTrajectoryFromActions(updatedAction.risk_id, company_id);
    }

    await reviewObligationsService.complete(company_id, 'ACTION_EFFECTIVENESS', actionId, userId, `Effectiveness recorded: ${outcome}`);
    if (outcome === 'Too Early To Assess') {
      await reviewObligationsService.open({
        companyId: company_id, type: 'ACTION_EFFECTIVENESS', subjectType: 'ACTION', subjectId: actionId,
        actionId, riskId: updatedAction.risk_id || null,
        dueAt: updatedAction.effectiveness_due_at && new Date(updatedAction.effectiveness_due_at) > new Date()
          ? updatedAction.effectiveness_due_at : new Date(Date.now() + 7 * 86400000),
        ownerRole: 'REGISTERED_MANAGER', reason: 'Effectiveness was too early to assess; repeat the review with further evidence.',
      });
    } else if (updatedAction.risk_id) {
      // The verdict changes the evidence on the risk. Create an immediate, explicit obligation so
      // the risk is reviewed rather than silently relying on a cached trajectory.
      await reviewObligationsService.open({
        companyId: company_id, type: 'RISK_POST_EFFECTIVENESS', subjectType: 'RISK', subjectId: updatedAction.risk_id,
        actionId, riskId: updatedAction.risk_id, dueAt: new Date(), ownerRole: 'REGISTERED_MANAGER',
        reason: `Risk requires review after action effectiveness was rated ${outcome}.`,
      });
    }

    return updatedAction;
  }

  async getPendingEffectiveness(company_id: string, house_id?: string) {
    // Risk-linked completed actions still awaiting an effectiveness verdict. Same predicate as the
    // My Work / pipeline counts (completed_at IS NOT NULL AND effectiveness_outcome IS NULL) so the
    // list matches the count. The fixed 48-hour assumption is removed (doctrine): an action is due a
    // verdict as soon as it is completed — the RM schedules the actual review date.
    let sql = `
      SELECT ra.*, COALESCE(h.name, 'Organisation-wide') as house_name, r.title as risk_title,
             gro.due_at AS review_due_at, (gro.due_at < NOW()) AS review_overdue
      FROM risk_actions ra
      LEFT JOIN risks r ON r.id = ra.risk_id AND r.company_id=ra.company_id
      LEFT JOIN houses h ON h.id = COALESCE(ra.house_id, r.house_id)
      LEFT JOIN governance_review_obligations gro
        ON gro.company_id=ra.company_id AND gro.subject_id=ra.id
       AND gro.obligation_type='ACTION_EFFECTIVENESS' AND gro.status='OPEN'
      WHERE ra.company_id = $1
      AND ra.completed_at IS NOT NULL
      AND ra.effectiveness_outcome IS NULL
    `;
    const params: any[] = [company_id];

    if (house_id) {
      sql += ` AND COALESCE(ra.house_id, r.house_id) = $2`;
      params.push(house_id);
    }

    sql += ` ORDER BY ra.completed_at ASC`;
    const res = await query(sql, params);
    return res.rows;
  }

  async summary(company_id: string, start: string, end: string) {
    const result = await query(
      `WITH reviewed AS (
         SELECT ra.id, COALESCE(ra.effectiveness_outcome,
                  CASE ra.effectiveness::text WHEN 'Neutral' THEN 'Partially Effective'
                    WHEN 'Ineffective' THEN 'Not Effective' ELSE ra.effectiveness::text END) AS outcome,
                ra.effectiveness_reviewed_at::date AS day,
                COALESCE(NULLIF(TRIM(r.risk_domain),''), NULLIF(TRIM(r.strategic_theme),''),
                         NULLIF(TRIM(sc.risk_domain),''), 'Uncategorised') AS domain,
                COALESCE(h.name, 'Organisation-wide') AS service_name
           FROM risk_actions ra
           LEFT JOIN risks r ON r.id=ra.risk_id AND r.company_id=ra.company_id
           LEFT JOIN signal_clusters sc ON sc.id=ra.source_cluster_id AND sc.company_id=ra.company_id
           LEFT JOIN houses h ON h.id=COALESCE(ra.house_id,r.house_id)
          WHERE ra.company_id=$1
            AND ra.effectiveness_reviewed_at BETWEEN $2::timestamptz AND $3::timestamptz
            AND (ra.effectiveness_outcome IS NOT NULL OR ra.effectiveness IS NOT NULL)
       )
       SELECT
         (SELECT JSON_BUILD_OBJECT(
           'effective', COUNT(*) FILTER (WHERE outcome='Effective'),
           'neutral', COUNT(*) FILTER (WHERE outcome='Partially Effective'),
           'ineffective', COUNT(*) FILTER (WHERE outcome='Not Effective'),
           'too_early', COUNT(*) FILTER (WHERE outcome='Too Early To Assess')) FROM reviewed) AS org_summary,
         COALESCE((SELECT JSON_AGG(x ORDER BY service_name) FROM (
           SELECT service_name, COUNT(*) FILTER (WHERE outcome='Effective')::int AS effective,
             COUNT(*) FILTER (WHERE outcome='Partially Effective')::int AS neutral,
             COUNT(*) FILTER (WHERE outcome='Not Effective')::int AS ineffective
           FROM reviewed GROUP BY service_name) x), '[]'::json) AS service_comparison,
         COALESCE((SELECT JSON_AGG(x ORDER BY domain) FROM (
           SELECT domain, COUNT(*) FILTER (WHERE outcome='Effective')::int AS effective,
             COUNT(*) FILTER (WHERE outcome='Partially Effective')::int AS neutral,
             COUNT(*) FILTER (WHERE outcome='Not Effective')::int AS ineffective
           FROM reviewed GROUP BY domain) x), '[]'::json) AS domain_analysis,
         COALESCE((SELECT JSON_AGG(x ORDER BY day) FROM (
           SELECT day, COUNT(*) FILTER (WHERE outcome='Effective')::int AS effective,
             COUNT(*) FILTER (WHERE outcome='Partially Effective')::int AS partial,
             COUNT(*) FILTER (WHERE outcome='Not Effective')::int AS ineffective
           FROM reviewed GROUP BY day) x), '[]'::json) AS daily_trend`,
      [company_id, start, end]
    );
    const pending = await this.getPendingEffectiveness(company_id);
    return { ...(result.rows[0] || {}), pending, pending_count: pending.length };
  }
}

export const actionEffectivenessService = new ActionEffectivenessService();
