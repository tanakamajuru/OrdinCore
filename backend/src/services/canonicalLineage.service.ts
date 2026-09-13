import { query } from '../config/database';

export type CanonicalSourceType = 'ESCALATION' | 'GOVERNANCE_REVIEW' | 'SIGNAL' | 'PATTERN' | 'RISK';

/** Read-only reconstruction of an action's existing evidence chain. */
export class CanonicalLineageService {
  async action(companyId: string, actionId: string) {
    const result = await query(
      `SELECT ra.id AS action_id, ra.source_type, ra.source_id, ra.risk_id,
              ra.source_cluster_id AS pattern_id, ra.source_pulse_id AS signal_id,
              ra.escalation_id, ra.governance_review_id,
              COALESCE(ra.governance_domain, r.risk_domain, sc.risk_domain,
                       gp.governance_domain, (gp.risk_domain)[1]) AS governance_domain,
              CASE WHEN ra.source_id IS NULL THEN false ELSE true END AS lineage_complete
         FROM risk_actions ra
         LEFT JOIN risks r ON r.id=ra.risk_id AND r.company_id=ra.company_id
         LEFT JOIN signal_clusters sc ON sc.id=ra.source_cluster_id AND sc.company_id=ra.company_id
         LEFT JOIN governance_pulses gp ON gp.id=ra.source_pulse_id AND gp.company_id=ra.company_id
        WHERE ra.company_id=$1 AND ra.id=$2`,
      [companyId, actionId]
    );
    if (!result.rows[0]) throw new Error('Action not found');
    return result.rows[0];
  }

  async exceptions(companyId: string) {
    return (await query(
      `SELECT record_type, record_id, reason, created_at
         FROM governance_lineage_exceptions
        WHERE company_id=$1 ORDER BY created_at ASC`, [companyId]
    )).rows;
  }
}

export const canonicalLineageService = new CanonicalLineageService();
