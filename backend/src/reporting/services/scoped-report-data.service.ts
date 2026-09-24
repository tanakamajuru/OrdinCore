// Extracts the structured governance data for a resolved scope, assessing each site separately
// then aggregating — preserving site identity and material exceptions (a critical site is never
// averaged away).
import { query } from '../../config/database';
import { ResolvedScope, SiteStatus } from '../domain/reporting.types';
import { confidenceService, SiteMetrics } from './confidence.service';
import { trajectoryForRisk } from '../../services/trajectory.service';

const done = `('Complete','Completed','Cancelled')`;

async function metricsForSite(companyId: string, siteId: string, start: string, end: string, personId?: string | null): Promise<SiteMetrics> {
  const personPulse = personId ? `AND gp.service_user_id = '${personId}'` : '';
  const personRisk = personId ? `AND r.service_user_id = '${personId}'` : '';
  const personEsc = personId ? `AND e.service_user_id = '${personId}'` : '';
  const personAct = personId ? `AND ra.service_user_id = '${personId}'` : '';

  const sig = (await query(
    `SELECT COUNT(*)::int AS signals,
            COUNT(*) FILTER (WHERE gp.severity IN ('High','Critical'))::int AS high_critical,
            COUNT(*) FILTER (WHERE COALESCE(gp.review_status::text,'New') <> 'New')::int AS reviewed_signals,
            COUNT(DISTINCT COALESCE(gp.created_at, gp.entry_date::timestamptz)::date)::int AS distinct_days
       FROM governance_pulses gp
      WHERE gp.company_id = $1 AND gp.house_id = $2
        AND COALESCE(gp.created_at, gp.entry_date::timestamptz) BETWEEN $3 AND $4 ${personPulse}`,
    [companyId, siteId, start, end]
  )).rows[0];

  // All lifecycle metrics are evaluated AS AT the report end, never NOW(). A record
  // created before the period but still open at the cut-off remains material to the report.
  const risk = (await query(
    `SELECT COUNT(*) FILTER (WHERE r.created_at <= $3::timestamptz
                              AND ((COALESCE(r.closed_at, r.resolved_at) IS NULL AND LOWER(r.status::text) NOT IN ('closed','resolved')) OR COALESCE(r.closed_at, r.resolved_at) > $3::timestamptz))::int AS open_risks,
            COUNT(*) FILTER (WHERE r.created_at <= $3::timestamptz
                              AND ((COALESCE(r.closed_at, r.resolved_at) IS NULL AND LOWER(r.status::text) NOT IN ('closed','resolved')) OR COALESCE(r.closed_at, r.resolved_at) > $3::timestamptz)
                              AND LOWER(r.severity::text)='critical')::int AS critical_risks
       FROM canonical_risk_state_v r WHERE r.company_id = $1 AND r.house_id = $2 ${personRisk}`,
    [companyId, siteId, end]
  )).rows[0];

  const esc = (await query(
    `SELECT COUNT(*) FILTER (WHERE e.created_at <= $3::timestamptz
                              AND ((COALESCE(e.closed_at, e.resolved_at) IS NULL AND COALESCE(e.lifecycle_status::text,e.status::text) NOT IN ('Closed','Resolved','closed','resolved')) OR COALESCE(e.closed_at, e.resolved_at) > $3::timestamptz))::int AS open_escalations,
            COUNT(*) FILTER (WHERE e.created_at <= $3::timestamptz
                              AND ((COALESCE(e.closed_at, e.resolved_at) IS NULL AND COALESCE(e.lifecycle_status::text,e.status::text) NOT IN ('Closed','Resolved','closed','resolved')) OR COALESCE(e.closed_at, e.resolved_at) > $3::timestamptz)
                              AND e.due_by < $3::timestamptz)::int AS overdue_escalations
       FROM canonical_escalation_state_v e WHERE e.company_id = $1 AND e.house_id = $2 ${personEsc}`,
    [companyId, siteId, end]
  )).rows[0];

  const act = (await query(
    `SELECT COUNT(*) FILTER (WHERE ra.created_at <= $3::timestamptz
                              AND ((ra.completed_at IS NULL AND ra.status NOT IN ${done}) OR ra.completed_at > $3::timestamptz))::int AS open_actions,
            COUNT(*) FILTER (WHERE ra.created_at <= $3::timestamptz
                              AND ((ra.completed_at IS NULL AND ra.status NOT IN ${done}) OR ra.completed_at > $3::timestamptz)
                              AND ra.due_date < $3::timestamptz)::int AS overdue_actions,
            COUNT(*) FILTER (WHERE ra.status IN ('Complete','Completed')
                              AND ra.completed_at BETWEEN $4::timestamptz AND $3::timestamptz)::int AS completed_actions,
            COUNT(*) FILTER (WHERE ra.status IN ('Complete','Completed')
                              AND ra.completed_at BETWEEN $4::timestamptz AND $3::timestamptz
                              AND (ra.due_date IS NULL OR ra.completed_at <= ra.due_date))::int AS completed_on_time
       FROM canonical_action_state_v ra LEFT JOIN risks r ON r.id = ra.risk_id AND r.company_id=ra.company_id
      WHERE ra.company_id = $1 AND COALESCE(ra.house_id,r.house_id) = $2 ${personAct}`,
    [companyId, siteId, end, start]
  )).rows[0];

  return {
    signals: sig.signals, high_critical: sig.high_critical, reviewed_signals: sig.reviewed_signals, distinct_days: sig.distinct_days,
    open_risks: risk.open_risks, critical_risks: risk.critical_risks,
    open_escalations: esc.open_escalations, overdue_escalations: esc.overdue_escalations,
    open_actions: act.open_actions, overdue_actions: act.overdue_actions,
    completed_actions: act.completed_actions, completed_on_time: act.completed_on_time,
  };
}

export const scopedReportDataService = {
  async build(resolved: ResolvedScope, start: string, end: string) {
    const { companyId, siteIds, personId } = resolved;
    const siteRows = (await query(`SELECT id, name FROM houses WHERE id = ANY($1::uuid[]) ORDER BY name`, [siteIds])).rows;

    const perSite = [] as any[];
    for (const s of siteRows) {
      const m = await metricsForSite(companyId, s.id, start, end, personId);
      const conf = confidenceService.confidenceObject(m);
      const status = confidenceService.status(m);
      perSite.push({ site_id: s.id, site_name: s.name, status, governance_confidence: conf.governance, evidence_confidence: conf.evidence, metrics: m });
    }

    // Cross-site themes (signal domains across the authorised sites in the period).
    const themes = (await query(
      `SELECT unnest(gp.risk_domain)::text AS theme, COUNT(*)::int AS n
         FROM governance_pulses gp
        WHERE gp.company_id = $1 AND gp.house_id = ANY($2::uuid[])
          AND COALESCE(gp.created_at, gp.entry_date::timestamptz) BETWEEN $3 AND $4
          ${personId ? `AND gp.service_user_id = '${personId}'` : ''}
        GROUP BY theme ORDER BY n DESC LIMIT 8`,
      [companyId, siteIds, start, end]
    )).rows;

    // Aggregate — sum the metrics, then classify with the exception override.
    const sum = (k: keyof SiteMetrics) => perSite.reduce((t, s) => t + (s.metrics[k] || 0), 0);
    const totals = {
      signals: sum('signals'), high_critical: sum('high_critical'),
      open_risks: sum('open_risks'), critical_risks: sum('critical_risks'),
      open_escalations: sum('open_escalations'), overdue_escalations: sum('overdue_escalations'),
      open_actions: sum('open_actions'), overdue_actions: sum('overdue_actions'),
    };
    const avgGov = perSite.length ? Math.round(perSite.reduce((t, s) => t + s.governance_confidence, 0) / perSite.length) : 100;
    const avgEvidence = perSite.length ? Math.round(perSite.reduce((t, s) => t + s.evidence_confidence, 0) / perSite.length) : 0;

    // EXCEPTION OVERRIDE — a critical site forces the organisation status to CRITICAL, however
    // high the average is. The report must never read "stable on average".
    const hasCritical = perSite.some((s) => s.status === 'CRITICAL');
    const hasAttention = perSite.some((s) => s.status === 'ATTENTION');
    const organisationStatus: SiteStatus = hasCritical ? 'CRITICAL' : hasAttention ? 'ATTENTION' : 'STABLE';
    // "Critical Governance Exception" (doctrine §13.2): a critical status must be named as an
    // exception and, below, tied to the specific supporting risk(s) — not shown as a bare label.
    const statusLabel = (st: string) => st === 'CRITICAL' ? 'Critical Governance Exception' : st === 'ATTENTION' ? 'Attention Required' : 'Stable';
    let materialExceptions = perSite.filter((s) => s.status !== 'STABLE')
      .map((s) => ({ site_name: s.site_name, status: s.status, status_label: statusLabel(s.status), governance_confidence: s.governance_confidence, supporting_risks: [] as any[] }));

    // Plain-language templates need the underlying evidence, not only aggregate counts. These rows
    // are frozen inside the immutable snapshot so the PDF never re-queries live data at download
    // time. Every query is company + authorised-site scoped; person scope uses the stable
    // service_user_id linkage and never free-text name matching.
    const detailParams: any[] = [companyId, siteIds, start, end, personId || null];
    const includeOrganisationWide = ['SERVICE', 'REGION', 'ORGANISATION'].includes(resolved.type);
    const broadParams: any[] = [...detailParams, includeOrganisationWide];

    const signals = (await query(
      `SELECT gp.id, h.name AS service, gp.entry_date AS date,
              gp.description AS concern, gp.risk_domain::text AS domain,
              gp.severity::text AS severity,
              COALESCE(gp.review_status::text, 'New') AS review_status,
              gp.immediate_action
         FROM governance_pulses gp
         JOIN houses h ON h.id = gp.house_id AND h.company_id = gp.company_id
        WHERE gp.company_id = $1 AND gp.house_id = ANY($2::uuid[])
          AND COALESCE(gp.created_at, gp.entry_date::timestamptz) BETWEEN $3 AND $4
          AND ($5::uuid IS NULL OR gp.service_user_id = $5)
        ORDER BY COALESCE(gp.created_at, gp.entry_date::timestamptz) DESC`, detailParams
    )).rows;

    const riskRows = (await query(
      `SELECT r.id, h.name AS service, COALESCE(r.strategic_theme, r.title) AS risk,
              r.description, r.severity::text AS severity,
              CASE WHEN COALESCE(r.closed_at,r.resolved_at) IS NOT NULL AND COALESCE(r.closed_at,r.resolved_at) <= $4::timestamptz THEN r.status::text ELSE CASE WHEN LOWER(r.status::text) IN ('closed','resolved') THEN 'Open' ELSE r.status::text END END AS status,
              r.source_cluster_id,
              COALESCE(r.trajectory::text, r.trend::text, 'Insufficient evidence') AS direction,
              r.review_due_date, r.resolution_reason
         FROM canonical_risk_state_v r
         LEFT JOIN houses h ON h.id = r.house_id AND h.company_id = r.company_id
        WHERE r.company_id = $1
          AND (r.house_id = ANY($2::uuid[]) OR ($6::boolean AND r.house_id IS NULL))
          AND r.created_at <= $4 AND COALESCE(r.closed_at, r.resolved_at, $4::timestamptz) >= $3
          AND ($5::uuid IS NULL OR r.service_user_id = $5)
        ORDER BY CASE r.severity::text WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 ELSE 3 END,
                 r.created_at DESC`, broadParams
    )).rows;
    const risks = await Promise.all(riskRows.map(async (r: any) => {
      const tr = await trajectoryForRisk(r.id, r.source_cluster_id).catch(() => null);
      return { ...r, direction: tr?.direction || r.direction, trajectory_basis: tr?.basis || null };
    }));

    // Tie each Critical Governance Exception to the specific open Critical risk(s) that support
    // the conclusion (id, service, evidence date). A Critical exception with no identifiable
    // supporting risk is a defect — flagged here and rejected at freeze time (frozen-report.service).
    for (const ex of materialExceptions) {
      if (ex.status !== 'CRITICAL') continue;
      ex.supporting_risks = risks
        .filter((r: any) => r.service === ex.site_name && String(r.severity) === 'Critical' && String(r.status) === 'Open')
        .map((r: any) => ({ id: r.id, risk: r.risk, service: r.service, direction: r.direction, review_due_date: r.review_due_date }));
    }

    const actions = (await query(
      `SELECT ra.id, COALESCE(h.name, 'Organisation-wide') AS service, ra.title AS action,
              CASE WHEN ra.completed_at IS NOT NULL AND ra.completed_at > $4::timestamptz THEN 'Open' ELSE ra.status::text END AS status, ra.created_at, ra.completed_at, ra.due_date,
              NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), '') AS owner,
              ra.completion_evidence, ra.intended_outcome,
              cev.effectiveness_evidence, cev.effectiveness_reviewer, cev.effectiveness_reviewed_at,
              COALESCE(cev.outcome, 'Not yet reviewed') AS effectiveness,
              COALESCE(cev.review_state, 'NOT_REVIEWED') AS effectiveness_review_state,
              ra.source_cluster_id, ra.risk_id, ra.escalation_id, ra.governance_review_id
         FROM canonical_action_state_v ra
         LEFT JOIN canonical_action_effectiveness_v cev ON cev.action_id=ra.id AND cev.company_id=ra.company_id
         LEFT JOIN risks r ON r.id = ra.risk_id AND r.company_id = ra.company_id
         LEFT JOIN houses h ON h.id = COALESCE(ra.house_id, r.house_id) AND h.company_id = ra.company_id
         LEFT JOIN users u ON u.id = ra.assigned_to AND u.company_id = ra.company_id
        WHERE ra.company_id = $1
          AND (COALESCE(ra.house_id, r.house_id) = ANY($2::uuid[])
               OR ($6::boolean AND COALESCE(ra.house_id, r.house_id) IS NULL))
          AND ra.created_at <= $4 AND COALESCE(ra.completed_at, $4::timestamptz) >= $3
          AND ($5::uuid IS NULL OR ra.service_user_id = $5)
        ORDER BY (ra.status::text NOT IN ('Complete','Completed','Cancelled')) DESC,
                 ra.due_date ASC NULLS LAST`, broadParams
    )).rows;

    const escalations = (await query(
      `SELECT e.id, COALESCE(h.name, 'Organisation-wide') AS service, e.created_at AS date,
              e.reason, e.priority::text AS priority,
              CASE WHEN COALESCE(e.closed_at,e.resolved_at) IS NOT NULL AND COALESCE(e.closed_at,e.resolved_at) <= $4::timestamptz
                   THEN 'Closed' ELSE COALESCE(e.lifecycle_status::text, e.status::text) END AS status,
              e.due_by, COALESCE(e.closure_evidence, e.resolution_notes) AS outcome,
              e.risk_id, e.source_cluster_id, e.source_governance_review_id,
              NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), '') AS escalated_to
         FROM canonical_escalation_state_v e
         LEFT JOIN risks r ON r.id = e.risk_id AND r.company_id = e.company_id
         LEFT JOIN houses h ON h.id = COALESCE(e.house_id, r.house_id) AND h.company_id = e.company_id
         LEFT JOIN users u ON u.id = e.escalated_to AND u.company_id = e.company_id
        WHERE e.company_id = $1
          AND (COALESCE(e.house_id, r.house_id) = ANY($2::uuid[])
               OR ($6::boolean AND COALESCE(e.house_id, r.house_id) IS NULL))
          AND e.created_at <= $4::timestamptz
          AND COALESCE(e.closed_at, e.resolved_at, $4::timestamptz) >= $3::timestamptz
          AND ($5::uuid IS NULL OR e.service_user_id = $5)
        ORDER BY e.created_at DESC`, broadParams
    )).rows;

    const decisions = (await query(
      `SELECT gr.id, COALESCE(h.name, 'Organisation-wide') AS service,
              gr.review_date AS date,
              COALESCE(NULLIF(TRIM(gr.what_is_happening), ''), gp.description,
                       COALESCE(r.strategic_theme, r.title), e.reason) AS concern,
              gr.decision, COALESCE(NULLIF(TRIM(gr.decision_rationale), ''), NULLIF(TRIM(gr.evidence), '')) AS reason,
              COALESCE(gr.decision_status::text, 'Open') AS status,
              gr.due_at,
              NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), '') AS reviewer
         FROM governance_reviews gr
         LEFT JOIN houses h ON h.id = gr.service_id AND h.company_id = gr.company_id
         LEFT JOIN users u ON u.id = gr.reviewed_by AND u.company_id = gr.company_id
         LEFT JOIN governance_pulses gp ON gp.id = gr.pulse_entry_id AND gp.company_id = gr.company_id
         LEFT JOIN risks r ON r.id = gr.risk_id AND r.company_id = gr.company_id
         LEFT JOIN escalations e ON e.id = gr.escalation_id AND e.company_id = gr.company_id
        WHERE gr.company_id = $1
          AND (gr.service_id = ANY($2::uuid[])
               OR ($6::boolean AND gr.service_id IS NULL))
          AND gr.review_date BETWEEN $3 AND $4
          AND ($5::uuid IS NULL OR gp.service_user_id = $5 OR r.service_user_id = $5 OR e.service_user_id = $5)
        ORDER BY gr.review_date DESC`, broadParams
    )).rows;

    // Patterns are cluster-level (never person-level), so PERSON scope returns none. This query
    // takes its own fully-typed param list — it does not use `start`, and passing an unreferenced
    // parameter makes Postgres unable to infer its type ("could not determine data type").
    const patterns = (await query(
      `SELECT sc.id, COALESCE(NULLIF(TRIM(sc.risk_domain), ''), 'Uncategorised') AS pattern,
              sc.risk_domain AS domain, sc.scope, sc.cluster_status::text AS status,
              COUNT(DISTINCT gp.id)::int AS signal_count, sc.review_outcome, sc.next_review_date,
              MIN(gp.entry_date) AS first_signal_date, MAX(gp.entry_date) AS last_signal_date,
              COUNT(DISTINCT gp.house_id)::int AS service_count,
              COALESCE(string_agg(DISTINCT h2.name, ', ' ORDER BY h2.name), 'Service not recorded') AS affected_scope
         FROM canonical_pattern_state_v sc
         JOIN risk_signal_links rsl ON rsl.cluster_id = sc.id
         JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id AND gp.company_id = sc.company_id
         LEFT JOIN houses h2 ON h2.id = gp.house_id AND h2.company_id = sc.company_id
        WHERE sc.company_id = $1
          AND gp.house_id = ANY($2::uuid[])
          AND COALESCE(gp.created_at, gp.entry_date::timestamptz) BETWEEN $3::timestamptz AND $4::timestamptz
          AND ($5::uuid IS NULL)
        GROUP BY sc.id, sc.risk_domain, sc.scope, sc.cluster_status, sc.review_outcome, sc.next_review_date
        ORDER BY MAX(gp.entry_date) DESC`, [companyId, siteIds, start, end, personId || null]
    )).rows;

    const weeklyReviews = (await query(
      `SELECT wr.id, h.name AS service, wr.week_ending, wr.status,
              wr.governance_narrative AS content, wr.lessons_learnt, wr.anticipated_risks, wr.published_at
         FROM weekly_reviews wr
         JOIN houses h ON h.id = wr.house_id AND h.company_id = wr.company_id
        WHERE wr.company_id = $1 AND wr.house_id = ANY($2::uuid[])
          AND wr.week_ending BETWEEN $3::date AND $4::date
        ORDER BY wr.week_ending DESC, h.name`, [companyId, siteIds, start, end]
    )).rows;

    // Audit rows are only included where they reference a record already inside the snapshot scope
    // (except organisation reports, which see all company audit rows) — never another provider's.
    const scopedIds = new Set<string>([
      ...signals, ...risks, ...actions, ...escalations, ...decisions, ...patterns, ...weeklyReviews,
    ].flatMap((row: any) => [row.id, row.risk_id, row.source_cluster_id, row.escalation_id, row.governance_review_id, row.source_governance_review_id])
      .filter(Boolean));
    const auditCandidates = (await query(
      `SELECT a.id, a.created_at AS date, a.action, a.resource,
              a.resource_id, COALESCE(a.new_values->>'reason', a.new_values->>'rationale', '') AS reason,
              COALESCE(NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''), 'System') AS actor
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.user_id AND (u.company_id = a.company_id OR u.company_id IS NULL)
        WHERE a.company_id = $1 AND a.created_at BETWEEN $2 AND $3
        ORDER BY a.created_at DESC`,
      [companyId, start, end]
    )).rows;
    const audit = resolved.type === 'ORGANISATION'
      ? auditCandidates
      : auditCandidates.filter((row: any) => row.resource_id && scopedIds.has(row.resource_id));

    const effectiveness = {
      effective: actions.filter((a: any) => a.effectiveness === 'Effective').length,
      partially_effective: actions.filter((a: any) => a.effectiveness === 'Partially Effective').length,
      not_effective: actions.filter((a: any) => a.effectiveness === 'Not Effective').length,
      too_early: actions.filter((a: any) => a.effectiveness === 'Too Early To Assess').length,
      finalised: actions.filter((a: any) => a.effectiveness_review_state === 'FINAL').length,
      interim: actions.filter((a: any) => a.effectiveness_review_state === 'INTERIM').length,
      not_reviewed: actions.filter((a: any) => a.effectiveness_review_state === 'NOT_REVIEWED').length,
    };
    Object.assign(totals, { effectiveness });
    const evidence = { signals, risks, actions, escalations, decisions, patterns, weekly_reviews: weeklyReviews, audit };
    const narrative_facts = {
      position: organisationStatus,
      governance_confidence: avgGov, evidence_confidence: avgEvidence,
      signals: totals.signals, high_critical_signals: totals.high_critical,
      open_risks: totals.open_risks, critical_risks: totals.critical_risks,
      open_escalations: totals.open_escalations, overdue_escalations: totals.overdue_escalations,
      open_actions: totals.open_actions, overdue_actions: totals.overdue_actions,
      effectiveness,
      themes: themes.map((t: any) => ({ theme: t.theme, signals: t.n })),
      material_exceptions: materialExceptions,
    };

    return {
      scope_label: resolved.label,
      period: { start, end },
      site_count: perSite.length,
      per_site: perSite.map(({ metrics, ...rest }) => ({ ...rest, ...metrics })),
      totals,
      cross_site_themes: themes,
      organisation: { status: organisationStatus, governance_confidence: avgGov, evidence_confidence: avgEvidence },
      material_exceptions: materialExceptions,
      evidence,
      narrative_facts,
      limitations: [] as string[],
    };
  },
};
