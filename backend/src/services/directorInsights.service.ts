import { query } from '../config/database';

// Director/RI cross-site insight endpoints (spec section 9: API changes).
export class DirectorInsightsService {
  // Long-format heat map: one row per service × theme with the worst trend.
  async crossSiteHeatmap(companyId: string) {
    const res = await query(
      `SELECT h.id AS service_id, h.name AS service_name,
              COALESCE(r.strategic_theme, r.risk_domain, r.title) AS theme,
              CASE
                WHEN bool_or(COALESCE(r.trend, r.trajectory::text) IN ('Rising','Deteriorating','Critical')) THEN 'Rising'
                WHEN bool_or(COALESCE(r.trend, r.trajectory::text) = 'Improving') THEN 'Improving'
                ELSE 'Stable'
              END AS trend,
              COUNT(*)::int AS risk_count
       FROM houses h
       JOIN risks r ON r.house_id = h.id AND LOWER(r.status) <> 'closed'
       WHERE h.company_id = $1
       GROUP BY h.id, h.name, theme
       ORDER BY h.name`,
      [companyId]
    );
    return res.rows;
  }

  async effectivenessByService(companyId: string) {
    const res = await query(
      `SELECT h.id AS service_id, h.name AS service_name,
              COUNT(*) FILTER (WHERE ra.effectiveness_outcome = 'Effective' OR ra.effectiveness = 'Effective')::int AS effective,
              COUNT(*) FILTER (WHERE ra.effectiveness_outcome = 'Partially Effective' OR ra.effectiveness = 'Neutral')::int AS partially_effective,
              COUNT(*) FILTER (WHERE ra.effectiveness_outcome = 'Not Effective' OR ra.effectiveness = 'Ineffective')::int AS not_effective,
              COUNT(*)::int AS total_rated
       FROM houses h
       JOIN risks r ON r.house_id = h.id
       JOIN risk_actions ra ON ra.risk_id = r.id
       WHERE h.company_id = $1 AND (ra.effectiveness_outcome IS NOT NULL OR ra.effectiveness IS NOT NULL)
       GROUP BY h.id, h.name
       ORDER BY h.name`,
      [companyId]
    );
    return res.rows;
  }

  async riAssuranceSummary(companyId: string) {
    const esc = await query(
      `SELECT
         COUNT(*) FILTER (WHERE lifecycle_status <> 'Closed') AS open,
         COUNT(*) FILTER (WHERE lifecycle_status <> 'Closed' AND due_by IS NOT NULL AND due_by < NOW()) AS overdue,
         COUNT(*) FILTER (WHERE lifecycle_status = 'Reopened') AS reopened
       FROM escalations WHERE company_id = $1`,
      [companyId]
    );
    const risks = await query(
      `SELECT
         COUNT(*) FILTER (WHERE LOWER(status) <> 'closed') AS open,
         COUNT(*) FILTER (WHERE LOWER(status) <> 'closed' AND source_cluster_id IS NOT NULL) AS evidence_based,
         COUNT(*) FILTER (WHERE COALESCE(reopened_count,0) > 0) AS reopened
       FROM risks WHERE company_id = $1`,
      [companyId]
    );
    const acts = await query(
      `SELECT
         COUNT(*) FILTER (WHERE effectiveness_outcome = 'Effective' OR effectiveness = 'Effective') AS effective,
         COUNT(*) FILTER (WHERE effectiveness_outcome = 'Not Effective' OR effectiveness = 'Ineffective') AS not_effective
       FROM risk_actions WHERE company_id = $1`,
      [companyId]
    );
    const closures = await query(
      `SELECT COUNT(*) AS closure_reviews FROM closure_reviews WHERE company_id = $1`,
      [companyId]
    );

    const e = esc.rows[0], r = risks.rows[0], a = acts.rows[0], c = closures.rows[0];
    const overdue = Number(e.overdue), openRisks = Number(r.open), evidenceBased = Number(r.evidence_based);
    const reopened = Number(r.reopened) + Number(e.reopened);
    const effective = Number(a.effective), notEffective = Number(a.not_effective);

    const rag = (good: boolean, warn: boolean): 'Good' | 'Warning' | 'Concern' => good ? 'Good' : warn ? 'Warning' : 'Concern';

    return {
      risks_identified_early: rag(openRisks === 0 || evidenceBased === openRisks, evidenceBased >= openRisks / 2),
      escalations_timely: rag(overdue === 0, overdue <= 2),
      actions_effective: rag(effective >= notEffective, notEffective <= effective + 2),
      closures_evidenced: rag(Number(c.closure_reviews) > 0 || openRisks > 0, true),
      reopened_risks: reopened,
      overdue_reviews: overdue,
    };
  }
}

export const directorInsightsService = new DirectorInsightsService();
