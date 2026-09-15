import { query } from '../config/database';

export type RiskReviewState = 'NOT_DUE' | 'DUE' | 'OVERDUE' | 'UNDER_REVIEW' | 'COMPLETED';

export function deriveRiskReviewState(input: {
  closed?: boolean; underReview?: boolean; obligationStatus?: string | null;
  dueAt?: string | Date | null; now?: Date;
}): RiskReviewState {
  if (input.closed || input.obligationStatus === 'COMPLETED') return 'COMPLETED';
  if (input.underReview) return 'UNDER_REVIEW';
  if (input.obligationStatus !== 'OPEN' || !input.dueAt) return 'NOT_DUE';
  return new Date(input.dueAt).getTime() < (input.now || new Date()).getTime() ? 'OVERDUE' : 'DUE';
}

export const riskReviewObligationsService = {
  async syncDue(companyId: string) {
    // First retire stale scheduler rows, then materialise any explicit risk review dates now due.
    try { await query('SELECT * FROM reconcile_canonical_read_side($1::uuid)', [companyId]); } catch { /* migration-safe */ }
    const result = await query('SELECT sync_due_risk_review_obligations($1::uuid) AS inserted', [companyId]);
    return Number(result.rows[0]?.inserted || 0);
  },
  async complete(companyId: string, riskId: string, userId: string, note: string) {
    await query(
      `UPDATE governance_review_obligations
          SET status='COMPLETED', completed_at=NOW(), completed_by=$3,
              completion_note=$4, updated_at=NOW()
        WHERE company_id=$1 AND subject_type='RISK' AND subject_id=$2 AND status='OPEN'`,
      [companyId, riskId, userId, note]
    );
  },
};
