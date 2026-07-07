import { query } from '../config/database';
import { trajectoryForRisk } from './trajectory.service';

// Director/RI cross-site insight endpoints (spec section 9: API changes).
export class DirectorInsightsService {
  // Long-format heat map: one row per service × theme with the worst trend.
  // Finding N: reads the SAME computed trajectory the RM sees (Finding K), aggregating
  // the worst per service × theme — so leadership never quotes a stale trend. The
  // heat-map vocabulary keeps "Rising" for a deteriorating direction (frontend contract).
  async crossSiteHeatmap(companyId: string) {
    const rows = (await query(
      `SELECT h.id AS service_id, h.name AS service_name,
              COALESCE(r.strategic_theme, r.risk_domain, r.title) AS theme,
              r.id AS risk_id, r.source_cluster_id
         FROM houses h
         JOIN risks r ON r.house_id = h.id AND LOWER(r.status) <> 'closed'
        WHERE h.company_id = $1
        ORDER BY h.name`,
      [companyId]
    )).rows;

    const rank: Record<string, number> = { Rising: 2, Stable: 1, Improving: 0 };
    const cells = new Map<string, any>();
    for (const row of rows) {
      const tr = await trajectoryForRisk(row.risk_id, row.source_cluster_id);
      const trend = tr.direction === 'Deteriorating' ? 'Rising' : tr.direction; // vocab map
      const key = `${row.service_id}|||${row.theme}`;
      const cur = cells.get(key) || { service_id: row.service_id, service_name: row.service_name, theme: row.theme, trend: 'Improving', risk_count: 0 };
      cur.risk_count += 1;
      if ((rank[trend] ?? 1) > (rank[cur.trend] ?? 1)) cur.trend = trend;
      cells.set(key, cur);
    }
    return [...cells.values()];
    // NB: computes trajectory per open risk (N+1). Fine at current scale; batch by
    // cluster if a company grows past a few hundred open risks.
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

    // Finding B/N: Resolution Effectiveness Rate — of risks closed as Resolved, how many
    // stayed resolved (no reopen). The RI reads the same closure KPI the RM/Director do.
    const rer = await query(
      `SELECT COUNT(*) FILTER (WHERE resolution_outcome LIKE 'Resolved%')::int AS resolved,
              COUNT(*) FILTER (WHERE resolution_outcome LIKE 'Resolved%' AND reopened_at IS NULL)::int AS stayed
         FROM risks WHERE company_id = $1 AND resolution_outcome IS NOT NULL`,
      [companyId]
    );
    const rerResolved = Number(rer.rows[0]?.resolved || 0);
    const rerStayed = Number(rer.rows[0]?.stayed || 0);

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
      resolution_effectiveness_rate: rerResolved ? Math.round((rerStayed / rerResolved) * 100) : null,
      resolved_total: rerResolved,
    };
  }
}

export const directorInsightsService = new DirectorInsightsService();
