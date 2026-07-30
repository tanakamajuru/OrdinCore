// Extracts the structured governance data for a resolved scope, assessing each site separately
// then aggregating — preserving site identity and material exceptions (a critical site is never
// averaged away).
import { query } from '../../config/database';
import { ResolvedScope, SiteStatus } from '../domain/reporting.types';
import { confidenceService, SiteMetrics } from './confidence.service';

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

  const risk = (await query(
    `SELECT COUNT(*) FILTER (WHERE r.status NOT IN ('Closed','Resolved'))::int AS open_risks,
            COUNT(*) FILTER (WHERE r.status NOT IN ('Closed','Resolved') AND LOWER(r.severity::text)='critical')::int AS critical_risks
       FROM risks r WHERE r.company_id = $1 AND r.house_id = $2 ${personRisk}`,
    [companyId, siteId]
  )).rows[0];

  const esc = (await query(
    `SELECT COUNT(*) FILTER (WHERE COALESCE(e.lifecycle_status::text, e.status) NOT IN ('Closed','Resolved','closed','resolved'))::int AS open_escalations,
            COUNT(*) FILTER (WHERE COALESCE(e.lifecycle_status::text, e.status) NOT IN ('Closed','Resolved','closed','resolved') AND e.due_by < NOW())::int AS overdue_escalations
       FROM escalations e WHERE e.company_id = $1 AND e.house_id = $2 ${personEsc}`,
    [companyId, siteId]
  )).rows[0];

  const act = (await query(
    `SELECT COUNT(*) FILTER (WHERE ra.status NOT IN ${done})::int AS open_actions,
            COUNT(*) FILTER (WHERE ra.status NOT IN ${done} AND ra.due_date < NOW())::int AS overdue_actions,
            COUNT(*) FILTER (WHERE ra.status IN ('Complete','Completed'))::int AS completed_actions,
            COUNT(*) FILTER (WHERE ra.status IN ('Complete','Completed') AND ra.completed_at IS NOT NULL AND (ra.due_date IS NULL OR ra.completed_at <= ra.due_date))::int AS completed_on_time
       FROM risk_actions ra JOIN risks r ON r.id = ra.risk_id
      WHERE ra.company_id = $1 AND r.house_id = $2 ${personAct}`,
    [companyId, siteId]
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
    const materialExceptions = perSite.filter((s) => s.status !== 'STABLE')
      .map((s) => ({ site_name: s.site_name, status: s.status, governance_confidence: s.governance_confidence }));

    return {
      scope_label: resolved.label,
      period: { start, end },
      site_count: perSite.length,
      per_site: perSite.map(({ metrics, ...rest }) => ({ ...rest, ...metrics })),
      totals,
      cross_site_themes: themes,
      organisation: { status: organisationStatus, governance_confidence: avgGov, evidence_confidence: avgEvidence },
      material_exceptions: materialExceptions,
    };
  },
};
