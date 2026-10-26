import { query } from '../config/database';
import { trajectoryForRisk } from './trajectory.service';

// Director/RI cross-site insight endpoints (spec section 9: API changes).
export class DirectorInsightsService {
  // Long-format heat map: one row per service × theme with the worst trend.
  // Finding N: reads the SAME computed trajectory the RM sees (Finding K), aggregating
  // the worst per service × theme — so leadership never quotes a stale trend. The
  // heat-map vocabulary keeps "Rising" for a deteriorating direction (frontend contract).
  async crossSiteHeatmap(companyId: string) {
    // A strategic/systemic risk is promoted WITHOUT a house_id (it spans services), so a plain
    // `risks.house_id = houses.id` join dropped every such risk and left the heat map blank. Map a
    // null-house risk to the service(s) where its linked signals were actually raised, so a
    // cross-service theme shows up in each service column it manifests in.
    const rows = (await query(
      `WITH open_risks AS (
         SELECT r.id AS risk_id, r.source_cluster_id, r.house_id,
                COALESCE(r.strategic_theme, r.risk_domain, r.title) AS theme
           FROM risks r
          WHERE r.company_id = $1 AND LOWER(r.status) <> 'closed'
       ), expanded AS (
         SELECT risk_id, source_cluster_id, theme, house_id AS service_id
           FROM open_risks WHERE house_id IS NOT NULL
         UNION
         SELECT o.risk_id, o.source_cluster_id, o.theme, p.house_id AS service_id
           FROM open_risks o
           JOIN risk_signal_links rsl
             ON (rsl.risk_id = o.risk_id OR (o.source_cluster_id IS NOT NULL AND rsl.cluster_id = o.source_cluster_id))
           JOIN governance_pulses p ON p.id = rsl.pulse_entry_id AND p.house_id IS NOT NULL
          WHERE o.house_id IS NULL
       )
       SELECT h.id AS service_id, h.name AS service_name, e.theme, e.risk_id, e.source_cluster_id
         FROM expanded e
         JOIN houses h ON h.id = e.service_id AND h.company_id = $1
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

  // Risks by Trend (Director dashboard donut): full-dataset breakdown using the
  // SAME authoritative trajectoryForRisk engine the heat map reads, so the donut
  // and heat map can never disagree and a capped risk list can never hide a theme.
  async risksByTrend(companyId: string) {
    const rows = (await query(
      `SELECT id AS risk_id, source_cluster_id
         FROM risks
        WHERE company_id = $1 AND LOWER(status) <> 'closed'`,
      [companyId]
    )).rows;

    let deteriorating = 0, stable = 0, improving = 0;
    for (const row of rows) {
      const tr = await trajectoryForRisk(row.risk_id, row.source_cluster_id);
      if (tr.direction === 'Deteriorating') deteriorating++;
      else if (tr.direction === 'Improving') improving++;
      else stable++;
    }
    return { deteriorating, stable, improving, total: rows.length };
  }

  // 26 Oct developer requirements, "Services Overview — Accuracy and presentation". Replaces the
  // old client-side High/Medium/Low formula (2+ deteriorating or 5+ open risks = High; 1+/2+ =
  // Medium; else Low), which measured record counts and deterioration, not overall service risk
  // -- a service with zero risks or with one serious non-deteriorating risk both read "Low",
  // implying safety neither state actually supports. This computes complete, server-side totals
  // using the SAME canonical definitions used elsewhere (no /risks?limit=200 truncation), keeps
  // risks/decisions/actions/reviews as separate counts (never summed into one risk score), counts
  // a cross-service risk once per explicitly affected service (the same house-expansion the heat
  // map uses, not a bare house_id match), and reports organisation-wide risks with no specific
  // service allocation separately rather than assigning them to every house.
  async servicesOverview(companyId: string) {
    const IMPACT_RANK: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

    const houses = (await query(`SELECT id, name FROM houses WHERE company_id = $1 ORDER BY name`, [companyId])).rows;

    // Every open risk, expanded to each service it explicitly affects. A risk with no house_id and
    // no linked signal in any house is organisation-wide with no specific allocation -- it is
    // never assigned to every house to fill that gap.
    const riskRows = (await query(
      `WITH open_risks AS (
         SELECT r.id AS risk_id, r.source_cluster_id, r.house_id, r.impact_rating
           FROM risks r
          WHERE r.company_id = $1 AND LOWER(r.status) <> 'closed'
       ), expanded AS (
         SELECT risk_id, source_cluster_id, impact_rating, house_id AS service_id
           FROM open_risks WHERE house_id IS NOT NULL
         UNION
         SELECT o.risk_id, o.source_cluster_id, o.impact_rating, p.house_id AS service_id
           FROM open_risks o
           JOIN risk_signal_links rsl
             ON (rsl.risk_id = o.risk_id OR (o.source_cluster_id IS NOT NULL AND rsl.cluster_id = o.source_cluster_id))
           JOIN governance_pulses p ON p.id = rsl.pulse_entry_id AND p.house_id IS NOT NULL
          WHERE o.house_id IS NULL
       )
       SELECT DISTINCT risk_id, source_cluster_id, impact_rating, service_id FROM expanded`,
      [companyId]
    )).rows;

    // Risks with no house_id and no derivable service via linked signals -- genuinely
    // organisation-wide, shown in their own bucket rather than guessed into every house.
    const unallocated = (await query(
      `SELECT r.id AS risk_id, r.impact_rating
         FROM risks r
        WHERE r.company_id = $1 AND LOWER(r.status) <> 'closed' AND r.house_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM risk_signal_links rsl
              JOIN governance_pulses p ON p.id = rsl.pulse_entry_id AND p.house_id IS NOT NULL
             WHERE rsl.risk_id = r.id OR (r.source_cluster_id IS NOT NULL AND rsl.cluster_id = r.source_cluster_id)
          )`,
      [companyId]
    )).rows;

    // Trajectory for every distinct open risk, once each (not once per service it's expanded into).
    const distinctRiskIds = Array.from(new Set([...riskRows.map((r: any) => r.risk_id), ...unallocated.map((r: any) => r.risk_id)]));
    const clusterByRisk = new Map<string, string | null>();
    for (const r of riskRows) clusterByRisk.set(r.risk_id, r.source_cluster_id || null);
    const deteriorating = new Set<string>();
    for (const riskId of distinctRiskIds) {
      try {
        const tr = await trajectoryForRisk(riskId, clusterByRisk.get(riskId) || null);
        if (tr.direction === 'Deteriorating') deteriorating.add(riskId);
      } catch { /* a failed trajectory read is never treated as "not deteriorating" with confidence -- omit from the count */ }
    }

    // Pending promotion decisions: unresolved signal clusters and new risk candidates, by house.
    // "Overdue" has no existing stored SLA for a promotion decision, so this uses the same 7-day
    // RM-review expectation the rest of the governance surface treats as a working week -- stated
    // explicitly here so it is auditable, not implied as some other canonical threshold.
    const pending = (await query(
      `SELECT house_id, id, created_at FROM signal_clusters
        WHERE company_id = $1 AND linked_risk_id IS NULL AND cluster_status NOT IN ('Resolved', 'Dismissed')
        UNION ALL
       SELECT house_id, id, created_at FROM risk_candidates
        WHERE company_id = $1 AND status = 'New'`,
      [companyId]
    )).rows;

    // Overdue actions: canonical open actions past their due date, scoped by the risk's house --
    // deliberately NOT filtered to active risks, so work still owed after a risk closes stays
    // counted as outstanding rather than disappearing with the risk.
    const overdueActions = (await query(
      `SELECT COALESCE(ra.house_id, r.house_id) AS house_id, ra.id
         FROM canonical_action_state_v ra
         LEFT JOIN risks r ON r.id = ra.risk_id
        WHERE ra.company_id = $1 AND ra.is_open AND ra.due_date IS NOT NULL AND ra.due_date < NOW()`,
      [companyId]
    )).rows;

    // Overdue reviews: the existing canonical review-obligation view (same SSOT /actions/pending-
    // effectiveness already reads), scoped by the underlying risk's house.
    const overdueReviews = (await query(
      `SELECT r.house_id, gro.id
         FROM canonical_review_obligation_state_v gro
         LEFT JOIN risks r ON r.id = gro.source_risk_id
        WHERE gro.company_id = $1 AND gro.status = 'OPEN' AND gro.is_overdue`,
      [companyId]
    )).rows;

    const byService = new Map<string, any>();
    for (const h of houses) byService.set(h.id, {
      id: h.id, name: h.name, open_risks: new Set<string>(), highest_rank: 0, highest_rating: null as string | null,
      deteriorating: 0, pending_decisions: 0, pending_overdue: 0, overdue_actions: 0, overdue_reviews: 0,
    });

    for (const row of riskRows) {
      const s = byService.get(row.service_id);
      if (!s) continue; // a service outside this company's current house list (shouldn't happen; defensive)
      s.open_risks.add(row.risk_id);
      const rank = IMPACT_RANK[row.impact_rating] || 0;
      if (rank > s.highest_rank) { s.highest_rank = rank; s.highest_rating = row.impact_rating || null; }
      if (deteriorating.has(row.risk_id)) s.deteriorating += 1;
    }
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const p of pending) {
      const s = p.house_id ? byService.get(p.house_id) : null;
      if (!s) continue;
      s.pending_decisions += 1;
      if (new Date(p.created_at).getTime() < sevenDaysAgo) s.pending_overdue += 1;
    }
    for (const a of overdueActions) { const s = a.house_id ? byService.get(a.house_id) : null; if (s) s.overdue_actions += 1; }
    for (const rv of overdueReviews) { const s = rv.house_id ? byService.get(rv.house_id) : null; if (s) s.overdue_reviews += 1; }

    const services = Array.from(byService.values()).map((s) => ({
      id: s.id, name: s.name,
      open_risks: s.open_risks.size,
      highest_rating: s.highest_rating || 'Unrated',
      deteriorating: s.deteriorating,
      pending_decisions: s.pending_decisions,
      pending_overdue: s.pending_overdue,
      overdue_actions: s.overdue_actions,
      overdue_reviews: s.overdue_reviews,
    }));

    const orgWideRank = unallocated.reduce((max, r) => Math.max(max, IMPACT_RANK[r.impact_rating] || 0), 0);
    const orgWideRating = unallocated.length
      ? (Object.entries(IMPACT_RANK).find(([, v]) => v === orgWideRank)?.[0] || 'Unrated')
      : null;

    return {
      generated_at: new Date().toISOString(),
      services,
      organisation_wide: {
        open_risks: unallocated.length,
        highest_rating: unallocated.length ? orgWideRating : null,
        deteriorating: unallocated.filter((r: any) => deteriorating.has(r.risk_id)).length,
      },
    };
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
         COUNT(*) FILTER (WHERE is_open) AS open,
         COUNT(*) FILTER (WHERE is_overdue) AS overdue,
         COUNT(*) FILTER (WHERE lifecycle_status = 'Reopened') AS reopened
       FROM canonical_escalation_state_v WHERE company_id = $1`,
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

    // Four-state assurance (doctrine §11.2): the system supplies evidence, it does not tick.
    // Crucially, when there is NO evidence to judge (empty denominator), the answer is
    // "Insufficient evidence" — never a green tick. Every answer carries its basis.
    const openEsc = Number(e.open);
    type AssuranceState = 'Assured' | 'Partially assured' | 'Not assured' | 'Insufficient evidence';
    const assess = (opts: { denominator: number; assured: boolean; partial: boolean; basis: string; noEvidence: string }): { state: AssuranceState; basis: string } => {
      if (opts.denominator <= 0) return { state: 'Insufficient evidence', basis: opts.noEvidence };
      const state: AssuranceState = opts.assured ? 'Assured' : opts.partial ? 'Partially assured' : 'Not assured';
      return { state, basis: opts.basis };
    };

    const dims = {
      risks_identified_early: assess({
        denominator: openRisks, assured: evidenceBased === openRisks, partial: evidenceBased >= openRisks / 2,
        basis: `${evidenceBased} of ${openRisks} open risk(s) are evidence-linked to a source pattern.`,
        noEvidence: 'No open risks in scope — identification cannot be assured or refuted.',
      }),
      escalations_timely: assess({
        denominator: openEsc, assured: overdue === 0, partial: overdue <= 2,
        basis: `${overdue} of ${openEsc} open escalation(s) are overdue.`,
        noEvidence: 'No open escalations in scope — timeliness cannot be assessed.',
      }),
      actions_effective: assess({
        denominator: effective + notEffective, assured: notEffective === 0 && effective > 0, partial: effective >= notEffective,
        basis: `${effective} effective, ${notEffective} not effective (reviewed controls only).`,
        noEvidence: 'No effectiveness reviews recorded — control effectiveness cannot be assured.',
      }),
      closures_evidenced: assess({
        denominator: Number(c.closure_reviews) + rerResolved, assured: Number(c.closure_reviews) > 0, partial: false,
        basis: `${Number(c.closure_reviews)} evidenced closure review(s) against ${rerResolved} resolved risk(s).`,
        noEvidence: 'No closures in scope — closure evidence cannot be assessed.',
      }),
    };

    // RI Assurance Interface correction (14 Oct 2026): one defensible overall state, derived by the
    // worst dimension — never "Assured" merely because no dimension is explicitly adverse. A pillar
    // with no evidence (Insufficient evidence) caps the overall conclusion below Assured; a pillar
    // that actively fails (Not assured) caps it there regardless of how the others score.
    const order: AssuranceState[] = ['Not assured', 'Partially assured', 'Insufficient evidence', 'Assured'];
    const states = Object.values(dims).map(d => d.state);
    const overallState = order.find(s => states.includes(s)) || 'Insufficient evidence';
    const overallBasis = overallState === 'Assured'
      ? 'All assurance questions are evidenced and assured for the current scope and period.'
      : overallState === 'Not assured'
      ? 'At least one assurance question indicates a material governance weakness.'
      : overallState === 'Partially assured'
      ? 'Governance is operating but at least one assurance question has a material gap or overdue matter.'
      : 'At least one assurance question has no reliable evidence to form a defensible conclusion.';

    return {
      ...dims,
      overall: { state: overallState, basis: overallBasis },
      reopened_risks: reopened,
      overdue_reviews: overdue,
      resolution_effectiveness_rate: rerResolved ? Math.round((rerStayed / rerResolved) * 100) : null,
      resolved_total: rerResolved,
      scope: 'Company-wide',
      period: 'All records to date',
    };
  }
}

export const directorInsightsService = new DirectorInsightsService();
