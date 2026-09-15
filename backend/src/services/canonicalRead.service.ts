import { query } from '../config/database';

/**
 * Canonical read-side gateway.
 * Screens/services must consume these database projections instead of re-deriving
 * open/closed/review-due/completed state from free-text status values.
 * This service never makes governance decisions and never changes canonical lifecycle state.
 */
export const canonicalReadService = {
  async reconcile(companyId: string) {
    const r = await query(
      `SELECT * FROM reconcile_canonical_read_side($1::uuid)`,
      [companyId],
    );
    return r.rows[0] || { cancelled_count: 0, completed_count: 0 };
  },

  async activeHouseIds(companyId: string): Promise<string[]> {
    const r = await query(
      `SELECT id FROM canonical_house_state_v WHERE company_id=$1 AND is_active ORDER BY name`,
      [companyId],
    );
    return r.rows.map((x: any) => x.id);
  },

  async riskReviewCounts(companyId: string, houseIds?: string[]) {
    const scoped = Array.isArray(houseIds) && houseIds.length > 0;
    const r = await query(
      `SELECT COUNT(*) FILTER (WHERE needs_review)::int AS due,
              COUNT(*) FILTER (WHERE review_overdue)::int AS overdue,
              COUNT(*) FILTER (WHERE is_active)::int AS active,
              COUNT(*) FILTER (WHERE is_closed)::int AS closed
         FROM canonical_risk_state_v
        WHERE company_id=$1${scoped ? ' AND (house_id=ANY($2::uuid[]) OR house_id IS NULL)' : ''}`,
      scoped ? [companyId, houseIds] : [companyId],
    );
    return r.rows[0] || { due: 0, overdue: 0, active: 0, closed: 0 };
  },
};
