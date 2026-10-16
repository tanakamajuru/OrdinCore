import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { eventBus, EVENTS } from '../events/eventBus';

const reportQueue = new Queue('report_generation', { connection: redisConnection });

export class ReportsService {
  async requestReport(company_id: string, user_id: string, data: { type: string; name: string; parameters?: Record<string, unknown> }) {
    const id = uuidv4();
    await query(
      `INSERT INTO reports (id, company_id, type, name, status, generated_by, parameters)
       VALUES ($1,$2,$3,$4,'pending',$5,$6) RETURNING *`,
      [id, company_id, data.type, data.name, user_id, JSON.stringify(data.parameters || {})]
    );

    const job = await reportQueue.add('generate', { report_id: id, company_id, user_id, type: data.type, parameters: data.parameters || {} });

    await query(
      `INSERT INTO report_requests (id, company_id, report_id, requested_by, report_type, parameters, status, job_id)
       VALUES ($1,$2,$3,$4,$5,$6,'queued',$7)`,
      [uuidv4(), company_id, id, user_id, data.type, JSON.stringify(data.parameters || {}), job.id]
    );

    await eventBus.emitEvent(EVENTS.REPORT_REQUESTED, { report_id: id, company_id, user_id });
    const result = await query('SELECT * FROM reports WHERE id = $1', [id]);
    return result.rows[0];
  }

  async findAll(company_id: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [reports, countResult] = await Promise.all([
      query(
        `SELECT r.*, u.first_name || ' ' || u.last_name AS generated_by_name
         FROM reports r
         JOIN users u ON u.id = r.generated_by
         WHERE r.company_id = $1
         ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        [company_id]
      ),
      query('SELECT COUNT(*) FROM reports WHERE company_id = $1', [company_id]),
    ]);
    return { reports: reports.rows, total: parseInt(countResult.rows[0].count), page, limit };
  }

  async findById(id: string, company_id: string) {
    const result = await query('SELECT * FROM reports WHERE id = $1 AND company_id = $2', [id, company_id]);
    if (!result.rows[0]) throw new Error('Report not found');
    return result.rows[0];
  }

  async getDownloadUrl(id: string, company_id: string) {
    const report = await this.findById(id, company_id);
    if (report.status !== 'completed') throw new Error('Report is not ready for download');
    if (!report.file_url) throw new Error('Report file not available');
    return { file_url: report.file_url };
  }

  /**
   * Authoritative live summary: headline metrics computed server-side over the FULL authorised
   * dataset (never a capped download). Scope is company + optional house list; rolling windows are
   * last 24h / 7d / 30d. Action metrics are separated (total/open/completed/overdue/awaiting
   * effectiveness) so an open-only count is never presented as a historical total.
   */
  async summary(company_id: string, houseIds: string[] | null) {
    const p: unknown[] = [company_id, houseIds && houseIds.length ? houseIds : null];
    // $2 null → all houses in the company; otherwise restrict to the listed houses.
    const hp = `($2::uuid[] IS NULL OR house_id = ANY($2))`;

    const metricsQ = query(
      `SELECT
         (SELECT COUNT(*)::int FROM governance_pulses WHERE company_id=$1 AND ${hp}) AS signals_total,
         (SELECT COUNT(*)::int FROM governance_pulses WHERE company_id=$1 AND ${hp} AND created_at >= NOW()-INTERVAL '1 day') AS signals_24h,
         (SELECT COUNT(*)::int FROM governance_pulses WHERE company_id=$1 AND ${hp} AND created_at >= NOW()-INTERVAL '7 days') AS signals_7d,
         (SELECT COUNT(*)::int FROM governance_pulses WHERE company_id=$1 AND ${hp} AND created_at >= NOW()-INTERVAL '30 days') AS signals_30d,
         (SELECT COUNT(*)::int FROM canonical_action_state_v WHERE company_id=$1 AND ${hp}) AS actions_total,
         (SELECT COUNT(*)::int FROM canonical_action_state_v WHERE company_id=$1 AND ${hp} AND is_open) AS actions_open,
         (SELECT COUNT(*)::int FROM canonical_action_state_v WHERE company_id=$1 AND ${hp} AND is_completed AND completed_at >= NOW()-INTERVAL '7 days') AS actions_completed_7d,
         (SELECT COUNT(*)::int FROM canonical_action_state_v WHERE company_id=$1 AND ${hp} AND is_completed AND completed_at >= NOW()-INTERVAL '30 days') AS actions_completed_30d,
         (SELECT COUNT(*)::int FROM canonical_action_state_v WHERE company_id=$1 AND ${hp} AND is_open AND due_date < NOW()) AS actions_overdue,
         (SELECT COUNT(*)::int FROM canonical_action_state_v WHERE company_id=$1 AND ${hp} AND is_completed AND effectiveness_outcome IS NULL AND effectiveness_due_at IS NOT NULL) AS actions_awaiting_effectiveness,
         (SELECT COUNT(*)::int FROM canonical_escalation_state_v WHERE company_id=$1 AND ${hp}) AS escalations_total,
         (SELECT COUNT(*)::int FROM canonical_escalation_state_v WHERE company_id=$1 AND ${hp} AND is_open) AS escalations_open,
         (SELECT COUNT(*)::int FROM canonical_escalation_state_v WHERE company_id=$1 AND ${hp} AND is_overdue) AS escalations_overdue,
         (SELECT COUNT(*)::int FROM canonical_escalation_state_v WHERE company_id=$1 AND ${hp} AND NOT is_open) AS escalations_closed,
         (SELECT COUNT(*)::int FROM canonical_escalation_state_v WHERE company_id=$1 AND ${hp} AND created_at >= NOW()-INTERVAL '7 days') AS escalations_new_7d,
         (SELECT COUNT(*)::int FROM canonical_escalation_state_v WHERE company_id=$1 AND ${hp} AND created_at >= NOW()-INTERVAL '30 days') AS escalations_new_30d,
         (SELECT COUNT(*)::int FROM canonical_risk_state_v WHERE company_id=$1 AND ${hp} AND is_active) AS risks_open,
         (SELECT COUNT(*)::int FROM canonical_risk_state_v WHERE company_id=$1 AND ${hp} AND NOT is_active AND COALESCE(closed_at, resolved_at) >= NOW()-INTERVAL '7 days') AS risks_closed_7d,
         (SELECT COUNT(*)::int FROM canonical_risk_state_v WHERE company_id=$1 AND ${hp} AND NOT is_active AND COALESCE(closed_at, resolved_at) >= NOW()-INTERVAL '30 days') AS risks_closed_30d`,
      p
    );

    // Signals-by-domain over the full dataset (a signal may carry several domains, so category
    // totals can exceed the distinct signal total — this is expected, not inflation).
    const domainQ = (interval: string | null) => query(
      `SELECT COALESCE(NULLIF(TRIM(d.dom), ''), 'Uncategorised') AS label, COUNT(*)::int AS count
         FROM governance_pulses p
         LEFT JOIN LATERAL unnest(
           CASE WHEN COALESCE(array_length(p.risk_domain, 1), 0) > 0 THEN p.risk_domain ELSE ARRAY['Uncategorised'] END
         ) AS d(dom) ON TRUE
        WHERE p.company_id=$1 AND ($2::uuid[] IS NULL OR p.house_id = ANY($2))
          ${interval ? `AND p.created_at >= NOW()-INTERVAL '${interval}'` : ''}
        GROUP BY 1 ORDER BY count DESC, label`,
      p
    );
    const actionsByStatusQ = query(
      `SELECT COALESCE(NULLIF(status::text, ''), 'Pending') AS label, COUNT(*)::int AS count
         FROM canonical_action_state_v WHERE company_id=$1 AND ${hp}
        GROUP BY 1 ORDER BY count DESC, label`,
      p
    );

    const [m, dAll, d7, d30, aStatus] = await Promise.all([
      metricsQ, domainQ(null), domainQ('7 days'), domainQ('30 days'), actionsByStatusQ,
    ]);

    return {
      scope: { company_id, house_ids: houseIds && houseIds.length ? houseIds : null },
      timezone: 'Europe/London',
      generated_at: new Date().toISOString(),
      data_status: 'COMPLETE' as const,
      metrics: m.rows[0],
      breakdowns: {
        signals_by_domain: dAll.rows,
        signals_by_domain_7d: d7.rows,
        signals_by_domain_30d: d30.rows,
        actions_by_status: aStatus.rows,
      },
    };
  }
}

export const reportsService = new ReportsService();
