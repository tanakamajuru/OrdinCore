import { query } from '../config/database';

type Obligation = {
  companyId: string;
  type: 'ACTION_EFFECTIVENESS' | 'RISK_POST_EFFECTIVENESS' | 'POST_ESCALATION_RISK' | 'PATTERN_REVIEW';
  subjectType: 'ACTION' | 'RISK' | 'ESCALATION' | 'PATTERN';
  subjectId: string;
  dueAt: Date | string;
  reason: string;
  actionId?: string | null;
  riskId?: string | null;
  escalationId?: string | null;
  clusterId?: string | null;
  ownerId?: string | null;
  ownerRole?: string | null;
};

export const reviewObligationsService = {
  async open(input: Obligation) {
    return (await query(
      `INSERT INTO governance_review_obligations
         (company_id, obligation_type, subject_type, subject_id, source_action_id, source_risk_id,
          source_escalation_id, source_cluster_id, owner_id, owner_role, due_at, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (company_id, obligation_type, subject_type, subject_id) WHERE status='OPEN'
       DO UPDATE SET due_at=EXCLUDED.due_at, reason=EXCLUDED.reason,
                     owner_id=COALESCE(EXCLUDED.owner_id, governance_review_obligations.owner_id),
                     owner_role=COALESCE(EXCLUDED.owner_role, governance_review_obligations.owner_role),
                     updated_at=NOW()
       RETURNING *`,
      [input.companyId, input.type, input.subjectType, input.subjectId, input.actionId || null,
       input.riskId || null, input.escalationId || null, input.clusterId || null,
       input.ownerId || null, input.ownerRole || null, input.dueAt, input.reason]
    )).rows[0];
  },

  async complete(companyId: string, type: Obligation['type'], subjectId: string, userId: string, note: string) {
    return (await query(
      `UPDATE governance_review_obligations
          SET status='COMPLETED', completed_at=NOW(), completed_by=$1,
              completion_note=$2, updated_at=NOW()
        WHERE company_id=$3 AND obligation_type=$4 AND subject_id=$5 AND status='OPEN'
        RETURNING *`, [userId, note, companyId, type, subjectId]
    )).rows;
  },

  async list(companyId: string, options: { ownerId?: string; roles?: string[]; status?: string } = {}) {
    const params: any[] = [companyId, options.status || 'OPEN'];
    let scope = '';
    if (options.ownerId || options.roles?.length) {
      params.push(options.ownerId || null, options.roles || []);
      scope = ` AND (owner_id=$3 OR owner_id IS NULL AND (owner_role IS NULL OR owner_role=ANY($4::text[])))`;
    }
    return (await query(
      `SELECT gro.*,
              ra.title AS action_title, r.title AS risk_title,
              sc.cluster_label AS pattern_title, e.reason AS escalation_reason,
              (gro.due_at < NOW()) AS overdue
         FROM governance_review_obligations gro
         LEFT JOIN risk_actions ra ON ra.id=gro.source_action_id
         LEFT JOIN risks r ON r.id=gro.source_risk_id
         LEFT JOIN signal_clusters sc ON sc.id=gro.source_cluster_id
         LEFT JOIN escalations e ON e.id=gro.source_escalation_id
        WHERE gro.company_id=$1 AND gro.status=$2${scope}
        ORDER BY overdue DESC, gro.due_at ASC`, params)).rows;
  },
};
