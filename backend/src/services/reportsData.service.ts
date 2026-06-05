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
              r.trend, r.trajectory, r.severity, r.status,
              EXTRACT(DAY FROM NOW() - r.created_at)::int AS days_open,
              r.last_governance_review_at,
              (SELECT COUNT(*) FROM risk_actions ra WHERE ra.risk_id = r.id
                 AND ra.status NOT IN ('Complete','Completed','Cancelled')) AS open_actions,
              h.name AS service_name
       FROM risks r
       LEFT JOIN houses h ON h.id = r.house_id
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
}

export const reportsDataService = new ReportsDataService();
