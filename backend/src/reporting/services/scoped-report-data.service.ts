// Extracts the structured governance data for a resolved scope, assessing each site separately
// then aggregating — preserving site identity and material exceptions (a critical site is never
// averaged away).
import { query } from '../../config/database';
import { ResolvedScope, SiteStatus } from '../domain/reporting.types';
import { confidenceService, SiteMetrics } from './confidence.service';
import { trajectoryForRisk } from '../../services/trajectory.service';
import { isDemonstratedEffective, hasWeakEvidence } from '../domain/effectiveness-evidence';

const done = `('Complete','Completed','Cancelled')`;

// 28 Oct developer instructions (Revision 3, "One eligible original-signal population"): the
// frozen headline metric query and the cross-site themes query had no exclusion at all, and
// even the detail signals query excluded only the 'Scheduled Governance Pulse' placeholder, not
// the DUPLICATE/ENTERED_IN_ERROR/DISPROVED validity states already excluded in
// weeklyReviews.service.ts (QUALIFYING_WEEKLY_PULSE). Confirmed live against 1 Grafton Road,
// 12-18 Oct 2026: 73 raw rows vs 10 with this exclusion applied — exactly the gap the brief
// names. One shared definition, applied everywhere an "original signal" is counted.
const ELIGIBLE_PULSE = `COALESCE(gp.description,'') <> 'Scheduled Governance Pulse'
  AND COALESCE(gp.validity_status::text, 'VALID') NOT IN ('DUPLICATE', 'ENTERED_IN_ERROR', 'DISPROVED')`;

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
        AND COALESCE(gp.created_at, gp.entry_date::timestamptz) >= $3 AND COALESCE(gp.created_at, gp.entry_date::timestamptz) < $4
        AND ${ELIGIBLE_PULSE} ${personPulse}`,
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
                              AND ra.completed_at >= $4::timestamptz AND ra.completed_at < $3::timestamptz)::int AS completed_actions,
            COUNT(*) FILTER (WHERE ra.status IN ('Complete','Completed')
                              AND ra.completed_at >= $4::timestamptz AND ra.completed_at < $3::timestamptz
                              AND (ra.due_date IS NULL OR ra.completed_at <= ra.due_date))::int AS completed_on_time,
            -- Controls = effectiveness-bearing actions completed by the cut-off. Control Assurance
            -- counts only those with a FINAL Effective judgement; existence/completion alone, and
            -- unreviewed effectiveness, do NOT count as assured (doctrine §7.9).
            COUNT(*) FILTER (WHERE ra.requires_effectiveness_review AND ra.completed_at IS NOT NULL
                              AND ra.completed_at <= $3::timestamptz)::int AS controls_total,
            COUNT(*) FILTER (WHERE ra.requires_effectiveness_review AND ra.completed_at IS NOT NULL
                              AND ra.completed_at <= $3::timestamptz
                              AND COALESCE(ra.effectiveness_outcome, ra.effectiveness::text) ILIKE 'Effective%')::int AS controls_effective,
            COUNT(*) FILTER (WHERE ra.requires_effectiveness_review AND ra.completed_at IS NOT NULL
                              AND ra.completed_at <= $3::timestamptz
                              AND COALESCE(ra.effectiveness_outcome, ra.effectiveness::text) IS NULL)::int AS controls_unreviewed,
            -- B2 correction: a final Partially Effective / Not Effective judgement is distinct
            -- from "unreviewed" -- it is a KNOWN ineffective control, not an absence of evidence.
            COUNT(*) FILTER (WHERE ra.requires_effectiveness_review AND ra.completed_at IS NOT NULL
                              AND ra.completed_at <= $3::timestamptz
                              AND COALESCE(ra.effectiveness_outcome, ra.effectiveness::text) IS NOT NULL
                              AND COALESCE(ra.effectiveness_outcome, ra.effectiveness::text) NOT ILIKE 'Effective%')::int AS controls_ineffective
       FROM canonical_action_state_v ra LEFT JOIN risks r ON r.id = ra.risk_id AND r.company_id=ra.company_id
      WHERE ra.company_id = $1 AND COALESCE(ra.house_id,r.house_id) = $2 ${personAct}`,
    [companyId, siteId, end, start]
  )).rows[0];

  // B2 correction: unresolved monitoring and urgent unpromoted concerns, neither of which the
  // site status previously considered at all.
  const mon = (await query(
    `SELECT COUNT(*)::int AS overdue_monitoring FROM governance_reviews gr
      WHERE gr.company_id = $1 AND gr.service_id = $2
        AND gr.decision = 'Monitor' AND gr.decision_status = 'Monitoring' AND gr.due_at < $3::timestamptz`,
    [companyId, siteId, end]
  )).rows[0];
  const unpromoted = (await query(
    `SELECT COUNT(DISTINCT sc.id)::int AS urgent_unpromoted
       FROM canonical_pattern_state_v sc JOIN risk_signal_links rsl ON rsl.cluster_id = sc.id
       JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id AND gp.company_id = sc.company_id
      WHERE sc.company_id = $1 AND gp.house_id = $2 AND sc.linked_risk_id IS NULL
        AND sc.cluster_status IN ('Escalated', 'Confirmed')`,
    [companyId, siteId]
  )).rows[0];

  return {
    signals: sig.signals, high_critical: sig.high_critical, reviewed_signals: sig.reviewed_signals, distinct_days: sig.distinct_days,
    open_risks: risk.open_risks, critical_risks: risk.critical_risks,
    open_escalations: esc.open_escalations, overdue_escalations: esc.overdue_escalations,
    open_actions: act.open_actions, overdue_actions: act.overdue_actions,
    completed_actions: act.completed_actions, completed_on_time: act.completed_on_time,
    controls_total: act.controls_total, controls_effective: act.controls_effective, controls_unreviewed: act.controls_unreviewed,
    controls_ineffective: act.controls_ineffective, overdue_monitoring: mon.overdue_monitoring, urgent_unpromoted: unpromoted.urgent_unpromoted,
  };
}

export const scopedReportDataService = {
  // Boundaries are start-inclusive, end-EXCLUSIVE. `start`/`end` are UTC timestamps for timestamptz
  // columns; `startDate`/`endDateExcl` are the equivalent local calendar dates for DATE columns
  // (e.g. weekly_reviews.week_ending) — a timestamptz boundary must not be ::date-cast in UTC.
  async build(resolved: ResolvedScope, start: string, end: string, startDate?: string, endDateExcl?: string) {
    const { companyId, siteIds, personId } = resolved;
    const siteRows = (await query(`SELECT id, name FROM houses WHERE id = ANY($1::uuid[]) ORDER BY name`, [siteIds])).rows;

    const perSite = [] as any[];
    for (const s of siteRows) {
      const m = await metricsForSite(companyId, s.id, start, end, personId);
      const conf = confidenceService.confidenceObject(m);
      const status = confidenceService.status(m);
      perSite.push({ site_id: s.id, site_name: s.name, status, governance_confidence: conf.governance, evidence_confidence: conf.evidence, evidence_coverage: conf.evidence_coverage, control_assurance: conf.control_assurance, assurance_label: conf.assurance_label, basis: conf.basis, metrics: m });
    }

    // Cross-site themes (signal domains across the authorised sites in the period).
    const themes = (await query(
      `SELECT unnest(gp.risk_domain)::text AS theme, COUNT(*)::int AS n
         FROM governance_pulses gp
        WHERE gp.company_id = $1 AND gp.house_id = ANY($2::uuid[])
          AND COALESCE(gp.created_at, gp.entry_date::timestamptz) >= $3 AND COALESCE(gp.created_at, gp.entry_date::timestamptz) < $4
          AND ${ELIGIBLE_PULSE}
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

    // 28 Oct developer instructions (Revision 3, §5 "Organisation-wide reconciliation"): the
    // headline totals above sum only house-specific metrics (metricsForSite queries house_id =
    // one site), while the detail evidence lists below additionally include organisation-wide
    // records (house_id IS NULL) whenever the scope is SERVICE/REGION/ORGANISATION. A SERVICE/
    // ORGANISATION report could therefore list an org-wide risk in its evidence while the headline
    // "open risks" count never included it at all. Add org-wide counts once to the headline totals
    // for those scopes — counted here, not per-site, so a cross-service record is never summed
    // once per affected site and inflated.
    const includeOrgWideTotals = ['SERVICE', 'REGION', 'ORGANISATION'].includes(resolved.type);
    if (includeOrgWideTotals) {
      const orgRisk = (await query(
        `SELECT COUNT(*) FILTER (WHERE r.created_at <= $2::timestamptz
                                  AND ((COALESCE(r.closed_at, r.resolved_at) IS NULL AND LOWER(r.status::text) NOT IN ('closed','resolved')) OR COALESCE(r.closed_at, r.resolved_at) > $2::timestamptz))::int AS open_risks,
                COUNT(*) FILTER (WHERE r.created_at <= $2::timestamptz
                                  AND ((COALESCE(r.closed_at, r.resolved_at) IS NULL AND LOWER(r.status::text) NOT IN ('closed','resolved')) OR COALESCE(r.closed_at, r.resolved_at) > $2::timestamptz)
                                  AND LOWER(r.severity::text)='critical')::int AS critical_risks
           FROM canonical_risk_state_v r WHERE r.company_id = $1 AND r.house_id IS NULL`,
        [companyId, end]
      )).rows[0];
      const orgEsc = (await query(
        `SELECT COUNT(*) FILTER (WHERE e.created_at <= $2::timestamptz
                                  AND ((COALESCE(e.closed_at, e.resolved_at) IS NULL AND COALESCE(e.lifecycle_status::text,e.status::text) NOT IN ('Closed','Resolved','closed','resolved')) OR COALESCE(e.closed_at, e.resolved_at) > $2::timestamptz))::int AS open_escalations,
                COUNT(*) FILTER (WHERE e.created_at <= $2::timestamptz
                                  AND ((COALESCE(e.closed_at, e.resolved_at) IS NULL AND COALESCE(e.lifecycle_status::text,e.status::text) NOT IN ('Closed','Resolved','closed','resolved')) OR COALESCE(e.closed_at, e.resolved_at) > $2::timestamptz)
                                  AND e.due_by < $2::timestamptz)::int AS overdue_escalations
           FROM canonical_escalation_state_v e WHERE e.company_id = $1 AND e.house_id IS NULL`,
        [companyId, end]
      )).rows[0];
      const orgAct = (await query(
        `SELECT COUNT(*) FILTER (WHERE ra.created_at <= $2::timestamptz
                                  AND ((ra.completed_at IS NULL AND ra.status NOT IN ${done}) OR ra.completed_at > $2::timestamptz))::int AS open_actions,
                COUNT(*) FILTER (WHERE ra.created_at <= $2::timestamptz
                                  AND ((ra.completed_at IS NULL AND ra.status NOT IN ${done}) OR ra.completed_at > $2::timestamptz)
                                  AND ra.due_date < $2::timestamptz)::int AS overdue_actions
           FROM canonical_action_state_v ra LEFT JOIN risks r ON r.id = ra.risk_id AND r.company_id=ra.company_id
          WHERE ra.company_id = $1 AND COALESCE(ra.house_id,r.house_id) IS NULL`,
        [companyId, end]
      )).rows[0];
      totals.open_risks += orgRisk.open_risks; totals.critical_risks += orgRisk.critical_risks;
      totals.open_escalations += orgEsc.open_escalations; totals.overdue_escalations += orgEsc.overdue_escalations;
      totals.open_actions += orgAct.open_actions; totals.overdue_actions += orgAct.overdue_actions;
      Object.assign(totals, {
        organisation_wide: { open_risks: orgRisk.open_risks, critical_risks: orgRisk.critical_risks,
          open_escalations: orgEsc.open_escalations, overdue_escalations: orgEsc.overdue_escalations,
          open_actions: orgAct.open_actions, overdue_actions: orgAct.overdue_actions },
      });
    }
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
              gp.immediate_action,
              -- B8 correction (21 Oct 2026): "Replace generic 'Recorded source' with record
              -- reference, author and time" -- the signal's own reporter and precise time were
              -- never selected at all, so the reconstruction timeline had nothing real to show.
              gp.created_at, (gp.entry_date + gp.entry_time) AS recorded_at,
              NULLIF(TRIM(COALESCE(cu.first_name,'') || ' ' || COALESCE(cu.last_name,'')), '') AS reported_by
         FROM governance_pulses gp
         JOIN houses h ON h.id = gp.house_id AND h.company_id = gp.company_id
         LEFT JOIN users cu ON cu.id = gp.created_by AND cu.company_id = gp.company_id
        WHERE gp.company_id = $1 AND gp.house_id = ANY($2::uuid[])
          AND COALESCE(gp.created_at, gp.entry_date::timestamptz) >= $3 AND COALESCE(gp.created_at, gp.entry_date::timestamptz) < $4
          AND ($5::uuid IS NULL OR gp.service_user_id = $5)
          -- B7 correction (21 Oct 2026): "a reminder belongs under governance activity, with
          -- findings absent if none exist. Scheduled reminder entries are permitted by the query."
          -- Confirmed: no exclusion existed here at all, unlike every other evidence query in this
          -- service -- an auto-generated reminder placeholder could appear in "Recorded concerns"
          -- as if it were an actual observation.
          AND ${ELIGIBLE_PULSE}
        ORDER BY COALESCE(gp.created_at, gp.entry_date::timestamptz) DESC`, detailParams
    )).rows;

    const riskRows = (await query(
      `SELECT r.id, h.name AS service, COALESCE(r.strategic_theme, r.title) AS risk,
              r.risk_domain::text AS domain,
              r.description, r.severity::text AS severity,
              CASE WHEN COALESCE(r.closed_at,r.resolved_at) IS NOT NULL AND COALESCE(r.closed_at,r.resolved_at) <= $4::timestamptz THEN r.status::text ELSE CASE WHEN LOWER(r.status::text) IN ('closed','resolved') THEN 'Open' ELSE r.status::text END END AS status,
              r.source_cluster_id,
              COALESCE(r.trajectory::text, r.trend::text, 'Insufficient evidence') AS direction,
              r.review_due_date, r.resolution_reason,
              -- B3 correction (21 Oct 2026): "For in-period closures include date, decision-maker,
              -- reason and outcome evidence" -- none of these four were previously retrieved.
              r.closed_at, r.resolved_at, r.resolution_outcome,
              NULLIF(TRIM(COALESCE(ru.first_name,'') || ' ' || COALESCE(ru.last_name,'')), '') AS closed_by_name,
              -- "linked work" -- the actions/escalations actually tied to this risk, not just a count.
              (SELECT string_agg(DISTINCT a.title, '; ' ORDER BY a.title) FROM risk_actions a
                WHERE a.risk_id = r.id AND a.company_id = r.company_id AND a.status NOT IN ('Cancelled')) AS linked_actions,
              (SELECT COUNT(*)::int FROM escalations esc WHERE esc.risk_id = r.id AND esc.company_id = r.company_id) AS linked_escalation_count
         FROM canonical_risk_state_v r
         LEFT JOIN houses h ON h.id = r.house_id AND h.company_id = r.company_id
         LEFT JOIN users ru ON ru.id = r.resolved_by AND ru.company_id = r.company_id
        WHERE r.company_id = $1
          AND (r.house_id = ANY($2::uuid[]) OR ($6::boolean AND r.house_id IS NULL))
          AND r.created_at <= $4 AND COALESCE(r.closed_at, r.resolved_at, $4::timestamptz) >= $3
          AND ($5::uuid IS NULL OR r.service_user_id = $5)
        ORDER BY CASE r.severity::text WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 ELSE 3 END,
                 r.created_at DESC`, broadParams
    )).rows;
    // 28 Oct developer instructions (Revision 3, §7 "Honest empty and error states"): trajectoryForRisk
    // never throws for a genuine no-data case (it returns a well-formed "Insufficient evidence"
    // result) -- a throw here means the lookup itself failed (DB error, bug). Swallowing it with
    // .catch(() => null) made a retrieval failure fall back to the same "Insufficient evidence" the
    // SQL default already uses for a risk that truly has no trajectory evidence -- the two are not
    // the same state and must not render identically. A failure is now marked Unavailable and
    // surfaced in limitations, distinct from a genuine absence of evidence.
    const trajectoryFailures: string[] = [];
    const risks = await Promise.all(riskRows.map(async (r: any) => {
      try {
        const tr = await trajectoryForRisk(r.id, r.source_cluster_id);
        return { ...r, direction: tr?.direction || r.direction, trajectory_basis: tr?.basis || null };
      } catch {
        trajectoryFailures.push(r.risk || r.id);
        return { ...r, direction: 'Unavailable', trajectory_basis: null, trajectory_unavailable: true };
      }
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
              e.closed_at, e.resolved_at,
              e.risk_id, e.source_cluster_id, e.source_governance_review_id,
              NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), '') AS escalated_to,
              -- B5 correction: "Show ... controls/actions" -- the actions actually raised against
              -- this escalation, not just its own text fields.
              (SELECT string_agg(DISTINCT a.title, '; ' ORDER BY a.title) FROM risk_actions a
                WHERE a.escalation_id = e.id AND a.company_id = e.company_id AND a.status NOT IN ('Cancelled')) AS linked_actions
         FROM canonical_escalation_state_v e
         LEFT JOIN risks r ON r.id = e.risk_id AND r.company_id = e.company_id
         LEFT JOIN governance_pulses gp ON gp.id = e.source_pulse_id AND gp.company_id = e.company_id
         LEFT JOIN houses h ON h.id = COALESCE(e.house_id, r.house_id) AND h.company_id = e.company_id
         LEFT JOIN users u ON u.id = e.escalated_to AND u.company_id = e.company_id
        WHERE e.company_id = $1
          AND (COALESCE(e.house_id, r.house_id) = ANY($2::uuid[])
               OR ($6::boolean AND COALESCE(e.house_id, r.house_id) IS NULL))
          AND e.created_at <= $4::timestamptz
          AND COALESCE(e.closed_at, e.resolved_at, $4::timestamptz) >= $3::timestamptz
          -- B5 correction (21 Oct 2026): "Reconcile the theft escalation present in the service
          -- report but absent from Jonathan's person report." e.service_user_id is set directly on
          -- only ~30% of escalations -- confirmed against production that 63/97 trace to a real
          -- person only through the linked signal or risk. Inherit the link the same way, instead
          -- of requiring the escalation's own column to have been set at creation time.
          AND ($5::uuid IS NULL OR e.service_user_id = $5 OR gp.service_user_id = $5 OR r.service_user_id = $5)
        ORDER BY e.created_at DESC`, broadParams
    )).rows;

    const decisions = (await query(
      `SELECT gr.id, COALESCE(h.name, 'Organisation-wide') AS service,
              gr.review_date AS date,
              -- Report corrections (21 Oct 2026, B1): gr.what_is_happening is "the management
              -- decision and what must happen next" (a required field on every decision, e.g.
              -- "Attend the bank") -- a response instruction, not the concern. Putting it first
              -- meant the true original concern (the signal/risk/escalation this decision was
              -- ABOUT) never showed whenever one was linked, which is nearly always. The concern
              -- is now the linked record's own text; what_is_happening moves to its own field
              -- below, shown as the decision/instruction, never substituted for the concern.
              COALESCE(NULLIF(TRIM(gp.description), ''), COALESCE(r.strategic_theme, r.title), NULLIF(TRIM(e.reason), ''),
                       NULLIF(TRIM(gr.what_is_happening), '')) AS concern,
              NULLIF(TRIM(gr.what_is_happening), '') AS management_instruction,
              gr.decision, COALESCE(NULLIF(TRIM(gr.decision_rationale), ''), NULLIF(TRIM(gr.evidence), '')) AS reason,
              -- Report corrections (21 Oct 2026, B1): decision_status is stored 'Open' on every
              -- decision at creation except Monitor -- passing it straight through produced
              -- unexplained pairs like "Close ... Open". Derive a status that actually reflects
              -- this specific decision's own outcome, by decision type.
              CASE
                WHEN gr.decision IN ('Close', 'Close Signal') THEN 'Closed'
                WHEN gr.decision = 'Monitor' THEN COALESCE(gr.decision_status::text, 'Monitoring')
                WHEN gr.decision = 'Create Action' THEN COALESCE(ra.concern_status, 'Action allocated')
                WHEN gr.decision = 'Escalate' THEN COALESCE(e.lifecycle_status::text, e.status::text, 'Escalated')
                ELSE COALESCE(gr.decision_status::text, 'Recorded')
              END AS status,
              -- Separate field per the correction: the concern's status (above) must not be
              -- conflated with the linked action's own completion state.
              ra.id AS linked_action_id, ra.status AS linked_action_status,
              gr.due_at,
              NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), '') AS reviewer
         FROM governance_reviews gr
         LEFT JOIN houses h ON h.id = gr.service_id AND h.company_id = gr.company_id
         LEFT JOIN users u ON u.id = gr.reviewed_by AND u.company_id = gr.company_id
         LEFT JOIN governance_pulses gp ON gp.id = gr.pulse_entry_id AND gp.company_id = gr.company_id
         LEFT JOIN risks r ON r.id = gr.risk_id AND r.company_id = gr.company_id
         LEFT JOIN escalations e ON e.id = gr.escalation_id AND e.company_id = gr.company_id
         LEFT JOIN LATERAL (
           SELECT a.id, a.status::text,
                  CASE WHEN a.status::text IN ('Completed','Complete','Cancelled') THEN 'Action completed' ELSE 'Action open' END AS concern_status
             FROM risk_actions a WHERE a.governance_review_id = gr.id AND a.company_id = gr.company_id
            ORDER BY a.created_at DESC LIMIT 1
         ) ra ON TRUE
        WHERE gr.company_id = $1
          AND (gr.service_id = ANY($2::uuid[])
               OR ($6::boolean AND gr.service_id IS NULL))
          AND gr.review_date >= $3 AND gr.review_date < $4
          AND ($5::uuid IS NULL OR gp.service_user_id = $5 OR r.service_user_id = $5 OR e.service_user_id = $5)
        ORDER BY gr.review_date DESC`, broadParams
    )).rows;

    // B1 correction: "Next-week priorities must include due monitoring, actions, escalations and
    // effectiveness reviews" -- previously only open actions were shown. An active Monitor cycle
    // whose scheduled review point has arrived (or passed) is itself outstanding governance work.
    // Bug fix (confirmed live, 22 Oct 2026): this query was bound with the full 6-element
    // broadParams array but only ever referenced $1/$2/$4/$6 in its text -- $3 and $5 never
    // appear anywhere in the SQL. Postgres requires every parameter index up to the highest one
    // referenced to be resolvable from the query text, so a skipped index (here $3) makes the
    // whole statement fail to prepare with "could not determine data type of parameter $3" --
    // reproduced directly against production for a PERSON-scoped Governance Timeline and
    // Reconstruction report (Aug 2026 period), which is what surfaced this to the user as a raw,
    // unexplained error instead of a report. Fixed by giving this query its own tight, fully
    // self-consistent parameter list instead of reusing the shared broadParams positionally.
    const dueMonitoring = (await query(
      `SELECT gr.id, COALESCE(h.name, 'Organisation-wide') AS service,
              COALESCE(NULLIF(TRIM(gr.monitoring_trigger), ''), NULLIF(TRIM(gr.what_is_happening), '')) AS concern,
              gr.due_at, NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), '') AS owner
         FROM governance_reviews gr
         LEFT JOIN houses h ON h.id = gr.service_id AND h.company_id = gr.company_id
         LEFT JOIN users u ON u.id = gr.decision_owner_id AND u.company_id = gr.company_id
        WHERE gr.company_id = $1
          AND (gr.service_id = ANY($2::uuid[]) OR ($4::boolean AND gr.service_id IS NULL))
          AND gr.decision = 'Monitor' AND gr.decision_status = 'Monitoring'
          AND gr.due_at < $3::timestamptz
        ORDER BY gr.due_at ASC`,
      [companyId, siteIds, end, includeOrganisationWide]
    )).rows;

    // Patterns are cluster-level (never person-level), so PERSON scope returns none. This query
    // takes its own fully-typed param list — it does not use `start`, and passing an unreferenced
    // parameter makes Postgres unable to infer its type ("could not determine data type").
    const patterns = (await query(
      `SELECT sc.id, COALESCE(NULLIF(TRIM(sc.risk_domain), ''), 'Uncategorised') AS pattern,
              sc.risk_domain AS domain, sc.scope, sc.cluster_status::text AS status, sc.linked_risk_id,
              COUNT(DISTINCT gp.id)::int AS signal_count, sc.review_outcome, sc.next_review_date,
              MIN(gp.entry_date) AS first_signal_date, MAX(gp.entry_date) AS last_signal_date,
              COUNT(DISTINCT gp.house_id)::int AS service_count,
              COALESCE(string_agg(DISTINCT h2.name, ', ' ORDER BY h2.name), 'Service not recorded') AS affected_scope,
              -- B6 correction (21 Oct 2026): "Show ... dated examples" -- up to 3 specific
              -- contributing signals with their date/service/description, not just a signal count.
              (SELECT string_agg(DISTINCT (gp2.entry_date::text || ' ' || h3.name || ': ' || LEFT(gp2.description, 80)), ' | ' ORDER BY (gp2.entry_date::text || ' ' || h3.name || ': ' || LEFT(gp2.description, 80)))
                 FROM (SELECT gp2x.* FROM risk_signal_links rsl2 JOIN governance_pulses gp2x ON gp2x.id = rsl2.pulse_entry_id
                        WHERE rsl2.cluster_id = sc.id ORDER BY gp2x.entry_date DESC LIMIT 3) gp2
                 LEFT JOIN houses h3 ON h3.id = gp2.house_id) AS dated_examples
         FROM canonical_pattern_state_v sc
         JOIN risk_signal_links rsl ON rsl.cluster_id = sc.id
         JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id AND gp.company_id = sc.company_id
         LEFT JOIN houses h2 ON h2.id = gp.house_id AND h2.company_id = sc.company_id
        WHERE sc.company_id = $1
          AND gp.house_id = ANY($2::uuid[])
          AND COALESCE(gp.created_at, gp.entry_date::timestamptz) >= $3::timestamptz AND COALESCE(gp.created_at, gp.entry_date::timestamptz) < $4::timestamptz
          AND ${ELIGIBLE_PULSE}
          AND ($5::uuid IS NULL)
        GROUP BY sc.id, sc.risk_domain, sc.scope, sc.cluster_status, sc.linked_risk_id, sc.review_outcome, sc.next_review_date
        ORDER BY MAX(gp.entry_date) DESC`, [companyId, siteIds, start, end, personId || null]
    )).rows;

    // Dismissed concerns — selected by their dismissal EVENT date (not the underlying signal dates),
    // so an older concern dismissed inside the period appears here with its reason, actor and process.
    // Cluster-level, so PERSON scope returns none. Kept out of the active/unresolved totals.
    const dismissedConcerns = (await query(
      `SELECT sc.id, COALESCE(h.name, 'Organisation-wide') AS service,
              COALESCE(NULLIF(TRIM(sc.risk_domain), ''), 'Uncategorised') AS domain,
              sc.linked_person AS person, sc.dismiss_reason AS reason,
              COALESCE(sc.dismissed_at, sc.updated_at) AS date,
              (sc.dismissed_at IS NOT NULL) AS date_reliable,
              CASE WHEN sc.dismissed_by IS NULL THEN 'System lapse' ELSE 'Manual dismissal' END AS event_type,
              CASE WHEN sc.dismissed_by IS NULL THEN 'System'
                   ELSE NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), '') END AS actor,
              (SELECT COUNT(*)::int FROM risk_signal_links rsl WHERE rsl.cluster_id = sc.id) AS signal_count
         FROM signal_clusters sc
         LEFT JOIN houses h ON h.id = sc.house_id AND h.company_id = sc.company_id
         LEFT JOIN users u ON u.id = sc.dismissed_by AND u.company_id = sc.company_id
        WHERE sc.company_id = $1 AND sc.cluster_status = 'Dismissed'
          AND (sc.house_id = ANY($2::uuid[]) OR ($6::boolean AND sc.house_id IS NULL))
          AND COALESCE(sc.dismissed_at, sc.updated_at) >= $3::timestamptz AND COALESCE(sc.dismissed_at, sc.updated_at) < $4::timestamptz
          -- B7 correction (21 Oct 2026): "person-scope exclusion cannot justify 'none dismissed'."
          -- Confirmed: ($5::uuid IS NULL) unconditionally excluded every row whenever $5 (personId)
          -- was set, so a PERSON-scoped report always showed "No concern was dismissed" regardless
          -- of the truth. signal_clusters.service_user_id is populated for person-scoped clusters
          -- (uq_active_person_pattern enforces it) -- filter by it properly instead.
          AND ($5::uuid IS NULL OR sc.service_user_id = $5)
        ORDER BY COALESCE(sc.dismissed_at, sc.updated_at) DESC`, broadParams
    )).rows;

    // Effectiveness review EVENTS selected by reviewed_at (not the action's completion date), so an
    // action completed before the period but re-reviewed within it appears here — and every
    // assessment is preserved, never replaced by the latest outcome. Carries the early-review fields.
    const effectivenessReviews = (await query(
      `SELECT aer.id, ra.title AS action, ra.intended_outcome,
              aer.outcome::text AS outcome, aer.evidence, aer.reviewed_at AS date, aer.next_review_date,
              aer.scheduled_review_at_snapshot, aer.is_early_review, aer.early_review_reason, aer.evidence_still_needed,
              COALESCE(h.name, 'Organisation-wide') AS service,
              NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), '') AS reviewer,
              ra.risk_id, ra.escalation_id
         FROM action_effectiveness_reviews aer
         JOIN risk_actions ra ON ra.id = aer.action_id AND ra.company_id = aer.company_id
         LEFT JOIN risks r ON r.id = ra.risk_id AND r.company_id = ra.company_id
         LEFT JOIN houses h ON h.id = COALESCE(ra.house_id, r.house_id) AND h.company_id = ra.company_id
         LEFT JOIN users u ON u.id = aer.reviewed_by AND u.company_id = aer.company_id
        WHERE aer.company_id = $1
          AND (COALESCE(ra.house_id, r.house_id) = ANY($2::uuid[]) OR ($6::boolean AND COALESCE(ra.house_id, r.house_id) IS NULL))
          AND aer.reviewed_at >= $3::timestamptz AND aer.reviewed_at < $4::timestamptz
          AND ($5::uuid IS NULL OR ra.service_user_id = $5)
        ORDER BY aer.reviewed_at DESC`, broadParams
    )).rows;

    // 28 Oct developer instructions (Revision 3, P1 "Weekly learning and forward look"):
    // weeklyReviews.service.ts (save/finalise) writes lessons_learnt and anticipated_risks into
    // the content JSON blob, never into the same-named legacy columns this query used to select
    // on their own -- confirmed live, every published/LOCKED review has content->>'lessons_learnt'
    // populated and the legacy column NULL. Prefer the authoritative saved content, fall back to
    // the legacy column for any older row that might have used it.
    const weeklyReviews = (await query(
      `SELECT wr.id, h.name AS service, wr.week_ending, wr.status,
              wr.governance_narrative AS content,
              COALESCE(NULLIF(TRIM(wr.content->>'lessons_learnt'), ''), wr.lessons_learnt) AS lessons_learnt,
              COALESCE(wr.content->'anticipated_risks', wr.anticipated_risks) AS anticipated_risks,
              wr.published_at
         FROM weekly_reviews wr
         JOIN houses h ON h.id = wr.house_id AND h.company_id = wr.company_id
        WHERE wr.company_id = $1 AND wr.house_id = ANY($2::uuid[])
          AND wr.week_ending >= $3::date AND wr.week_ending < $4::date
          -- 28 Oct developer instructions (Revision 3, P1 "Complete house/week coverage and
          -- approval"): this had no approval-state filter at all, despite the Manager Summary
          -- claiming to reproduce the approved RM account. Confirmed live: 35 draft and 2
          -- pending_validation rows exist alongside published/LOCKED ones -- an unapproved draft
          -- could appear in a frozen report as if it were the authorised account. 'published' is
          -- the live approved account; 'LOCKED' is Director-validated and awaiting publish. Draft
          -- and pending_validation are excluded here; serviceCoverage (below) still shows every
          -- state per house so drafts/awaiting-validation/missing remain visible, not hidden.
          AND wr.status IN ('published', 'LOCKED')
        ORDER BY wr.week_ending DESC, h.name`, [companyId, siteIds, startDate ?? start, endDateExcl ?? end]
    )).rows;

    // B4 correction (21 Oct 2026): "An optional combined summary derives from approved reviews and
    // identifies included/missing services. Account for all three service review statuses." --
    // weeklyReviews above only lists services that HAVE a row; a service with none was invisible.
    // LEFT JOIN every site in scope so a missing review shows as missing, not silently absent.
    const serviceCoverage = (await query(
      `SELECT h.id AS site_id, h.name AS service, wr.status, wr.published_at, wr.week_ending,
              NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), '') AS reviewer
         FROM houses h
         LEFT JOIN LATERAL (
           SELECT * FROM weekly_reviews w WHERE w.company_id = h.company_id AND w.house_id = h.id
             AND w.week_ending >= $3::date AND w.week_ending < $4::date
           ORDER BY w.week_ending DESC LIMIT 1
         ) wr ON TRUE
         LEFT JOIN users u ON u.id = wr.created_by AND u.company_id = h.company_id
        WHERE h.company_id = $1 AND h.id = ANY($2::uuid[]) AND h.status = 'active'
        ORDER BY h.name`, [companyId, siteIds, startDate ?? start, endDateExcl ?? end]
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
        WHERE a.company_id = $1 AND a.created_at >= $2 AND a.created_at < $3
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

    // Human evidence narrative per material theme (doctrine §12): assemble the reasoning chain
    // — data -> interpretation -> decision -> action -> outcome -> recurrence -> assurance —
    // from canonical facts only, and declare what could not be linked (no invented learning).
    const isOpenSt = (s: any) => !['Complete', 'Completed', 'Cancelled', 'Closed', 'Resolved'].includes(String(s));
    const themeEvidence = (themes || []).slice(0, 6).map((t: any) => {
      const domain = String(t.theme || '');
      const dl = domain.toLowerCase();
      const tSignals = signals.filter((s: any) => String(s.domain || '').toLowerCase().includes(dl));
      const dates = tSignals.map((s: any) => s.date).filter(Boolean).sort();
      const services = [...new Set(tSignals.map((s: any) => s.service).filter(Boolean))];
      const reviewed = tSignals.filter((s: any) => String(s.review_status || 'New') !== 'New').length;
      const tRisks = risks.filter((r: any) => String(r.domain || '').toLowerCase().includes(dl));
      const riskIds = new Set(tRisks.map((r: any) => r.id));
      // B9 correction (21 Oct 2026): "retrieve controls through signals, reviews and escalations as
      // well as registered risks. The present theme query's risk-only linkage hides direct
      // responses." Confirmed: tActions matched only a.risk_id -- a control still responding
      // directly to a signal or an unpromoted pattern (no formal risk raised yet) was entirely
      // invisible here, undercounting controls and wrongly implying "no control action is linked"
      // even when a direct response existed. Broaden via source_cluster_id against this theme's own
      // patterns, and via escalation_id against escalations already tied to those risks/clusters.
      const tClusterIds = new Set((patterns || []).filter((p: any) => String(p.domain || '').toLowerCase().includes(dl)).map((p: any) => p.id));
      const tEscalations = escalations.filter((esc: any) => (esc.risk_id && riskIds.has(esc.risk_id)) || (esc.source_cluster_id && tClusterIds.has(esc.source_cluster_id)));
      const tEscalationIds = new Set(tEscalations.map((esc: any) => esc.id));
      const tActions = actions.filter((a: any) =>
        (a.risk_id && riskIds.has(a.risk_id))
        || (a.source_cluster_id && tClusterIds.has(a.source_cluster_id))
        || (a.escalation_id && tEscalationIds.has(a.escalation_id)));
      const controlsCompleted = tActions.filter((a: any) => /complete/i.test(String(a.status))).length;
      // 28 Oct developer instructions (Revision 3, P1 "Evidence-supported conclusions"): "effective"
      // here previously meant only that the stored effectiveness string started with "Effective" --
      // no check that the rating was final (not interim/early), reviewed, or backed by evidence
      // text, and no check for weak evidence (case closure, future intentions, mere attendance) the
      // way renderAssurance/renderWeekly already require via isDemonstratedEffective/hasWeakEvidence.
      // Applying the same shared definition here so facts, summaries, assurance and AI narration
      // never disagree about what "evidenced improvement" means for the same underlying action.
      const effActions = tActions.filter((a: any) => isDemonstratedEffective(a));
      const eff = effActions.length;
      const weakEff = effActions.filter((a: any) => hasWeakEvidence(a)).length;
      const notEff = tActions.filter((a: any) => String(a.effectiveness) === 'Not Effective').length;
      const unrev = tActions.filter((a: any) => ['Not yet reviewed', 'Too Early To Assess'].includes(String(a.effectiveness))).length;
      const openActions = tActions.filter((a: any) => isOpenSt(a.status)).length;
      const openEsc = tEscalations.filter((esc: any) => isOpenSt(esc.status)).length;
      const gaps: string[] = [];
      if (tRisks.length === 0 && tClusterIds.size === 0 && tSignals.length > 0) gaps.push('No registered risk or pattern is linked to this theme yet.');
      if (tActions.length === 0 && (tRisks.length > 0 || tClusterIds.size > 0)) gaps.push("No control action is linked to this theme's risks or patterns.");
      if (unrev > 0) gaps.push(`${unrev} completed control(s) await a final effectiveness judgement.`);
      if (weakEff > 0) gaps.push(`${weakEff} Effective rating(s) are backed by evidence that does not itself demonstrate control (e.g. case closure, stated intentions) — flagged for review, not counted as evidenced improvement.`);
      return {
        theme: domain,
        period: dates.length ? `${dates[0]} to ${dates[dates.length - 1]}` : 'No dated signals in period',
        scope: services.length > 1 ? `Cross-service (${services.length} services)` : services.length === 1 ? services[0] : 'Not recorded',
        signals: tSignals.length, signals_reviewed: reviewed,
        risks: tRisks.map((r: any) => ({ risk: r.risk, direction: r.direction, status: r.status })),
        controls: { completed: controlsCompleted, effective: eff - weakEff, not_effective: notEff, unreviewed: unrev },
        open_items: { actions: openActions, escalations: openEsc },
        outcome: notEff > 0 ? 'Not fully effective — at least one linked control was judged Not Effective.'
               : (eff > weakEff && unrev === 0) ? 'Improvement evidenced by final Effective control(s) with supporting evidence.'
               : 'Outcome not yet evidenced from the linked controls.',
        evidence_gaps: gaps,
      };
    });

    const evidence = { signals, risks, actions, escalations, decisions, due_monitoring: dueMonitoring, patterns, dismissed_concerns: dismissedConcerns, effectiveness_reviews: effectivenessReviews, weekly_reviews: weeklyReviews, service_coverage: serviceCoverage, audit, theme_evidence: themeEvidence };
    const narrative_facts = {
      position: organisationStatus,
      governance_confidence: avgGov, evidence_confidence: avgEvidence,
      signals: totals.signals, high_critical_signals: totals.high_critical,
      open_risks: totals.open_risks, critical_risks: totals.critical_risks,
      open_escalations: totals.open_escalations, overdue_escalations: totals.overdue_escalations,
      open_actions: totals.open_actions, overdue_actions: totals.overdue_actions,
      effectiveness,
      themes: themes.map((t: any) => ({ theme: t.theme, signals: t.n })),
      theme_evidence: themeEvidence,
      material_exceptions: materialExceptions,
    };

    // Learning recorded in the period, or still outstanding from an earlier period — each lesson
    // shown against its source (an effectiveness review, escalation closure, risk closure, pattern
    // closure, weekly review or incident) plus its implementation/verification evidence and any
    // separate improvement action. Titles/outcomes only (no identifiers), defensibility-safe.
    // 28 Oct developer instructions (Revision 3, P1 "Learning source coverage"): this previously
    // selected source_type = 'EFFECTIVENESS' only and a handful of fields. Confirmed live: 8 of 31
    // learning_records (7 ESCALATION_CLOSURE, 1 PATTERN_CLOSURE) were entirely invisible to every
    // frozen report regardless of scope or period. learning.service.ts's own broader queries
    // (list/findById) already scope every source type directly by lr.house_id — the same approach
    // is used here instead of joining person/house through the EFFECTIVENESS-only source action.
    // Also widened the period filter: a still-outstanding lesson (not yet IMPROVEMENT_VERIFIED)
    // created before the period remains due follow-through and must not disappear from view.
    // B8 correction (21 Oct 2026) preserved: PERSON scope still excludes unrelated people, now
    // checked via every source type that carries a person link (action/risk, escalation, risk).
    const effectivenessLearning = (await query(
      `SELECT lr.id, lr.source_type, lr.state, lr.what_happened, lr.what_learnt, lr.change_needed, lr.no_learning_reason,
              lr.progress, lr.owner_id, lr.review_date, lr.success_criteria, lr.plan_deadline,
              lr.implementation_evidence, lr.implemented_at, lr.verification_outcome, lr.verification_evidence, lr.verified_at,
              lr.duplicate_of_id, lr.created_at,
              NULLIF(TRIM(COALESCE(ow.first_name,'') || ' ' || COALESCE(ow.last_name,'')), '') AS owner_name,
              sa.title AS source_action_title,
              aer.outcome::text AS source_review_outcome,
              esc.reason AS source_escalation_reason,
              COALESCE(sc.cluster_label, sc.risk_domain::text) AS source_pattern_label,
              sr.strategic_theme AS source_risk_title,
              la.title AS improvement_action_title
         FROM learning_records lr
         LEFT JOIN users ow ON ow.id = lr.owner_id AND ow.company_id = lr.company_id
         LEFT JOIN risk_actions sa ON sa.id = lr.source_id AND lr.source_type = 'EFFECTIVENESS'
         LEFT JOIN risks sr ON sr.id = COALESCE(CASE WHEN lr.source_type = 'RISK_CLOSURE' THEN lr.source_id END, sa.risk_id) AND sr.company_id = lr.company_id
         LEFT JOIN escalations esc ON esc.id = lr.source_id AND lr.source_type = 'ESCALATION_CLOSURE'
         LEFT JOIN signal_clusters sc ON sc.id = lr.source_id AND lr.source_type = 'PATTERN_CLOSURE'
         LEFT JOIN action_effectiveness_reviews aer ON aer.id = lr.source_review_id
         LEFT JOIN risk_actions la ON la.id = lr.linked_action_id
        WHERE lr.company_id = $1
          AND (lr.house_id = ANY($2::uuid[]) OR ($6::boolean AND lr.house_id IS NULL))
          AND (lr.created_at < $4 AND (lr.created_at >= $3 OR lr.progress <> 'IMPROVEMENT_VERIFIED'))
          AND ($5::uuid IS NULL OR sa.service_user_id = $5 OR sr.service_user_id = $5 OR esc.service_user_id = $5)
        ORDER BY lr.created_at DESC`,
      broadParams,
    )).rows;

    return {
      scope_label: resolved.label,
      period: { start, end },
      effectiveness_learning: effectivenessLearning,
      site_count: perSite.length,
      per_site: perSite.map(({ metrics, ...rest }) => ({ ...rest, ...metrics })),
      totals,
      cross_site_themes: themes,
      organisation: { status: organisationStatus, governance_confidence: avgGov, evidence_confidence: avgEvidence },
      material_exceptions: materialExceptions,
      evidence,
      narrative_facts,
      limitations: trajectoryFailures.length
        ? [`Trajectory could not be retrieved for: ${trajectoryFailures.join(', ')}. Their direction is shown as Unavailable, not as insufficient evidence — this is a retrieval failure, not an absence of recorded data.`]
        : [] as string[],
    };
  },
};
