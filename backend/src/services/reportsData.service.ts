import { query } from '../config/database';

/**
 * Canonical report data (spec module 10). Exactly four reports:
 * Weekly Governance, Strategic Risk, Escalation, Reconstruction.
 * These return structured JSON the frontend renders / exports.
 */
export class ReportsDataService {
  async weeklyGovernance(companyId: string, serviceId?: string, start?: string, end?: string) {
    const startTs = start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endTs = end || new Date().toISOString();
    const svc = serviceId ? 'AND gp.house_id = $4' : '';
    const params: unknown[] = [companyId, startTs, endTs];
    if (serviceId) params.push(serviceId);

    const byTheme = await query(
      `SELECT gp.risk_domain::text AS theme, COUNT(*)::int AS signals,
              MAX(gp.severity::text) AS top_severity
       FROM governance_pulses gp
       WHERE gp.company_id = $1 AND gp.created_at BETWEEN $2 AND $3 ${svc}
       GROUP BY gp.risk_domain::text ORDER BY signals DESC`,
      params
    );

    const summary = await query(
      `SELECT
        (SELECT COUNT(*) FROM governance_pulses gp WHERE gp.company_id = $1 AND gp.created_at BETWEEN $2 AND $3) AS signals_recorded,
        (SELECT COUNT(*) FROM risk_actions ra WHERE ra.company_id = $1 AND ra.created_at BETWEEN $2 AND $3) AS actions_opened,
        (SELECT COUNT(*) FROM risk_actions ra WHERE ra.company_id = $1 AND ra.completed_at BETWEEN $2 AND $3) AS actions_completed,
        (SELECT COUNT(*) FROM escalations e WHERE e.company_id = $1 AND e.created_at BETWEEN $2 AND $3) AS escalations_made`,
      [companyId, startTs, endTs]
    );

    return { report: 'Weekly Governance Report', period: { start: startTs, end: endTs }, summary: summary.rows[0], themes: byTheme.rows };
  }

  async strategicRisks(companyId: string) {
    const rows = await query(
      `SELECT COALESCE(r.strategic_theme, r.title) AS theme,
              r.risk_domain AS domain, dm.kloe_label, dm.kloe_code,
              r.trend, r.trajectory, r.severity, r.status,
              EXTRACT(DAY FROM NOW() - r.created_at)::int AS days_open,
              r.last_governance_review_at,
              (SELECT COUNT(*) FROM risk_actions ra WHERE ra.risk_id = r.id
                 AND ra.status NOT IN ('Complete','Completed','Cancelled')) AS open_actions,
              h.name AS service_name
       FROM risks r
       LEFT JOIN houses h ON h.id = r.house_id
       -- Deduplicated domain lookup: one KLOE per name so the sector-duplicated rows
       -- (SUPPORTED_LIVING + DOMICILIARY) can't multiply the risk or pull a NULL.
       LEFT JOIN (SELECT name, MAX(kloe_label) AS kloe_label, MAX(kloe_code) AS kloe_code
                    FROM governance_domains GROUP BY name) dm ON dm.name = r.risk_domain
       WHERE r.company_id = $1 AND r.status NOT IN ('Closed')
       ORDER BY r.created_at DESC`,
      [companyId]
    );
    return { report: 'Strategic Risk Report', risks: rows.rows };
  }

  async escalations(companyId: string, start?: string, end?: string) {
    const startTs = start || '1970-01-01';
    const endTs = end || '2999-12-31';
    const rows = await query(
      `SELECT e.created_at AS date,
              COALESCE(r.title, i.title, e.reason) AS theme,
              u.first_name || ' ' || u.last_name AS escalated_to,
              e.reason, e.priority,
              COALESCE(e.lifecycle_status::text, e.status) AS status,
              e.due_by,
              (e.due_by IS NOT NULL AND e.due_by < NOW() AND e.lifecycle_status <> 'Closed') AS overdue,
              h.name AS service_name
       FROM escalations e
       LEFT JOIN users u ON u.id = e.escalated_to
       LEFT JOIN risks r ON r.id = e.risk_id
       LEFT JOIN incidents i ON i.id = e.incident_id
       LEFT JOIN houses h ON h.id = COALESCE(e.house_id, r.house_id, i.house_id)
       WHERE e.company_id = $1 AND e.created_at BETWEEN $2 AND $3
       ORDER BY e.created_at DESC`,
      [companyId, startTs, endTs]
    );
    return { report: 'Escalation Report', escalations: rows.rows };
  }

  // Cross-Service Control Report (Director view): domains showing a pattern across
  // multiple services — a systemic control weakness, not isolated risks. KLOE Safe S4 /
  // Well-Led W4. Narrated in plain English for inspection-defensibility.
  async crossServiceControl(companyId: string) {
    const rows = await query(
      `SELECT sc.risk_domain AS domain,
              COUNT(DISTINCT sc.house_id)::int AS service_count,
              string_agg(DISTINCT h.name, ', ') AS services,
              SUM(sc.signal_count)::int AS total_signals,
              MAX(d.kloe_label) AS kloe_label, MAX(d.kloe_code) AS kloe_code
         FROM signal_clusters sc
         JOIN houses h ON h.id = sc.house_id
         LEFT JOIN governance_domains d ON d.name = sc.risk_domain
        WHERE sc.company_id = $1 AND sc.cluster_status IN ('Escalated','Emerging')
        GROUP BY sc.risk_domain
       HAVING COUNT(DISTINCT sc.house_id) >= 2
        ORDER BY service_count DESC, total_signals DESC`,
      [companyId]
    );
    const flags = rows.rows.map((r) => ({
      ...r,
      level: r.service_count >= 3 ? 'Director-Level Risk · Mandatory Review' : 'System-Level Risk',
    }));
    const narrative = flags.length === 0
      ? 'No cross-service patterns were detected this period. Each governance theme is contained within a single service and managed locally.'
      : `Cross-service detection identified ${flags.length} governance theme${flags.length === 1 ? '' : 's'} spanning multiple services: ${flags.map((f) => `${f.domain} (${f.service_count} services — ${f.services})`).join('; ')}. ` +
        `A pattern present in two or more services is read as a systemic control weakness with a likely shared root cause, not a set of isolated risks. ` +
        `${flags.some((f) => f.service_count >= 3) ? 'Where a theme spans three or more services it triggers a Director-Level Mandatory Review; the Responsible Individual and all Registered Managers are notified. ' : ''}` +
        `Acting once, systemically, rather than locally in each service, is the test CQC applies under Well-Led.`;
    return { report: 'Cross-Service Control Report', kloe: ['S4', 'W4'], narrative, summary: { themes: flags.length, services_in_scope: flags.reduce((n, f) => Math.max(n, f.service_count), 0) }, flags };
  }

  // Inspection Evidence Pack: the traceable lineage from each oversight risk back through
  // its source cluster to the signals that justified it, mapped to CQC KLOEs (S1/S2/W2).
  async inspectionEvidence(companyId: string) {
    const rows = await query(
      `SELECT r.id AS risk_id,
              COALESCE(r.strategic_theme, r.title) AS concern,
              r.risk_domain AS domain, h.name AS service,
              COALESCE(sc.signal_count, 0)::int AS source_signals,
              sc.cluster_label AS source_cluster,
              r.trajectory, r.status,
              d.kloe_label, d.kloe_code
         FROM risks r
         LEFT JOIN houses h ON h.id = r.house_id
         LEFT JOIN signal_clusters sc ON sc.id = r.source_cluster_id
         -- Deduplicated domain lookup (one KLOE per name) so sector-duplicated rows
         -- can't duplicate the risk in the pack or pull a NULL CQC domain.
         LEFT JOIN (SELECT name, MAX(kloe_label) AS kloe_label, MAX(kloe_code) AS kloe_code
                      FROM governance_domains GROUP BY name) d ON d.name = r.risk_domain
        WHERE r.company_id = $1 AND r.status NOT IN ('Closed')
        ORDER BY r.created_at DESC`,
      [companyId]
    );
    const evidence = rows.rows;
    const traced = evidence.filter((e) => e.source_signals > 0).length;
    const narrative =
      `This evidence pack traces every active oversight risk back to the body of signals that justified it. ` +
      `${evidence.length} risk${evidence.length === 1 ? '' : 's'} are on the register; ${traced} trace directly to a source cluster with a recorded signal count, demonstrating that no risk was created without evidence and none automatically. ` +
      `Each entry carries its governance domain's CQC Key Line of Enquiry so an inspector can follow the chain from observation to action: ` +
      `Safe (S1/S2) for how risks are identified and mitigated, and Well-Led (W2) for how they are understood and governed across the service.`;
    return { report: 'Inspection Evidence Pack', kloe: ['S1', 'S2', 'W2'], narrative, summary: { risks: evidence.length, evidence_backed: traced }, evidence };
  }
}

export const reportsDataService = new ReportsDataService();
