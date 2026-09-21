import { query } from '../config/database';
import logger from '../utils/logger';

export class AnalyticsService {
  async getRiskTrends(company_id: string, days = 30) {
    try {
      const result = await query(
        `SELECT 
          created_at::date AS date,
          COUNT(*) FILTER (WHERE LOWER(severity::text) = 'critical') AS critical,
          COUNT(*) FILTER (WHERE LOWER(severity::text) = 'high') AS high,
          COUNT(*) FILTER (WHERE LOWER(severity::text) = 'medium') AS medium,
          COUNT(*) FILTER (WHERE LOWER(severity::text) = 'low') AS low,
          COUNT(*) AS total
         FROM canonical_risk_state_v
         WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY created_at::date
         ORDER BY date`,
        [company_id]
      );

      const statusResult = await query(
        `SELECT 
          status,
          COUNT(*) AS count
         FROM risks WHERE company_id = $1
         GROUP BY status`,
        [company_id]
      );

      return { trends: result.rows, by_status: statusResult.rows };
    } catch (err) {
      logger.error('AnalyticsService.getRiskTrends failed:', err);
      throw err;
    }
  }

  async getMultiHouseRiskTrends(company_id: string, days = 42) {
    try {
      // Backwards-compatible endpoint name; the payload is now an honest, non-cumulative
      // six-week SIGNAL BURDEN series. A cumulative risk-created count could never improve
      // and was therefore not a trajectory. Fixed UK calendar weeks retain real zeroes.
      const weekCount = Math.max(1, Math.ceil(Math.min(Math.max(days, 7), 366) / 7));
      const result = await query(
        `WITH weeks AS (
           SELECT generate_series(
             date_trunc('week', NOW() AT TIME ZONE 'Europe/London') - (($2::int - 1) * INTERVAL '1 week'),
             date_trunc('week', NOW() AT TIME ZONE 'Europe/London'), INTERVAL '1 week'
           ) AS week_start
         ), services AS (
           SELECT id, name FROM canonical_house_state_v WHERE company_id=$1 AND is_active
         )
         SELECT w.week_start::date AS date, h.name AS house_name,
                COALESCE(SUM(CASE LOWER(gp.severity::text)
                  WHEN 'critical' THEN 4 WHEN 'high' THEN 3
                  WHEN 'medium' THEN 2 WHEN 'moderate' THEN 2 ELSE 1 END),0)::int AS burden
           FROM weeks w CROSS JOIN services h
           LEFT JOIN governance_pulses gp ON gp.company_id=$1 AND gp.house_id=h.id
            AND COALESCE((gp.entry_date::date + COALESCE(gp.entry_time,TIME '00:00')) AT TIME ZONE 'Europe/London',gp.created_at)
                >= w.week_start AT TIME ZONE 'Europe/London'
            AND COALESCE((gp.entry_date::date + COALESCE(gp.entry_time,TIME '00:00')) AT TIME ZONE 'Europe/London',gp.created_at)
                < (w.week_start + INTERVAL '1 week') AT TIME ZONE 'Europe/London'
          GROUP BY w.week_start,h.name ORDER BY w.week_start,h.name`,
        [company_id, weekCount]
      );
      const houseNames = Array.from(new Set(result.rows.map((r: any) => String(r.house_name))));
      const byDate = new Map<string, any>();
      for (const row of result.rows) {
        const date = new Date(row.date).toISOString().slice(0,10);
        if (!byDate.has(date)) byDate.set(date,{date});
        byDate.get(date)[row.house_name]=Number(row.burden)||0;
      }
      const trends=[...byDate.values()];

      return { trends, houses: houseNames, measure: 'severity_weighted_signal_burden', timezone: 'Europe/London' };
    } catch (err) {
      logger.error('AnalyticsService.getMultiHouseRiskTrends failed:', err);
      throw err;
    }
  }

  async getSitePerformance(company_id: string) {
    try {
      const result = await query(
        `SELECT 
          h.id AS house_id,
          h.name AS house_name,
          COUNT(DISTINCT r.id) FILTER (WHERE LOWER(r.status::text) != 'closed') AS open_risks,
          COUNT(DISTINCT r.id) FILTER (WHERE LOWER(r.severity::text) = 'critical') AS critical_risks,
          COUNT(DISTINCT i.id) FILTER (WHERE LOWER(i.status::text) NOT IN ('resolved','closed')) AS open_incidents,
          (
            SELECT COALESCE(COUNT(*) FILTER (WHERE gp.review_status != 'New') * 100.0 / NULLIF(COUNT(*), 0), 0)
            FROM governance_pulses gp
            WHERE gp.house_id = h.id AND gp.created_at >= NOW() - INTERVAL '30 days'
          ) AS avg_compliance_score,
          COUNT(DISTINCT e.id) FILTER (WHERE LOWER(e.status::text) = 'pending') AS pending_escalations
         FROM houses h
         LEFT JOIN risks r ON r.house_id = h.id AND r.company_id = $1
         LEFT JOIN incidents i ON i.house_id = h.id AND i.company_id = $1
         LEFT JOIN escalations e ON e.house_id = h.id AND e.company_id = $1
         WHERE h.company_id = $1 AND h.status != 'closed'
         GROUP BY h.id, h.name
         ORDER BY open_risks DESC`,
        [company_id]
      );
      return result.rows;
    } catch (err) {
      logger.error('AnalyticsService.getSitePerformance failed:', err);
      throw err;
    }
  }

  async getGovernanceCompliance(company_id: string, days = 90) {
    try {
      const result = await query(
        `SELECT 
          h.name AS house_name,
          h.id AS house_id,
          COUNT(gp.id) AS total_pulses,
          COUNT(gp.id) FILTER (WHERE gp.review_status != 'New') AS completed_pulses,
          0 AS overdue_pulses,
          100.0 AS avg_score,
          ROUND(
            100.0 * COUNT(gp.id) FILTER (WHERE gp.review_status != 'New') / NULLIF(COUNT(gp.id), 0), 2
          ) AS completion_rate
         FROM governance_pulses gp
         JOIN houses h ON h.id = gp.house_id
         WHERE gp.company_id = $1 AND gp.created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY h.id, h.name
         ORDER BY completion_rate DESC`,
        [company_id]
      );

      const overall = await query(
        `SELECT 
          100.0 AS avg_compliance,
          COUNT(*) FILTER (WHERE review_status != 'New') AS completed,
          0 AS overdue,
          COUNT(*) AS total
         FROM governance_pulses
         WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'`,
        [company_id]
      );

      return { by_house: result.rows, overall: overall.rows[0] };
    } catch (err) {
      logger.error('AnalyticsService.getGovernanceCompliance failed:', err);
      throw err;
    }
  }

  async getEscalationRate(company_id: string, days = 30) {
    try {
      const result = await query(
        `SELECT
          created_at::date AS date,
          COUNT(*) AS total_escalations,
          COUNT(*) FILTER (WHERE LOWER(status::text) = 'resolved') AS resolved,
          COUNT(*) FILTER (WHERE LOWER(priority::text) = 'critical') AS critical
         FROM canonical_escalation_state_v
         WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY created_at::date
         ORDER BY date`,
        [company_id]
      );

      const summary = await query(
        `SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE LOWER(status::text) = 'resolved') AS resolved,
          COUNT(*) FILTER (WHERE LOWER(status::text) = 'pending') AS pending,
          ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::numeric, 2) AS avg_resolution_hours
         FROM canonical_escalation_state_v
         WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'`,
        [company_id]
      );

      return { trend: result.rows, summary: summary.rows[0] };
    } catch (err) {
      logger.error('AnalyticsService.getEscalationRate failed:', err);
      throw err;
    }
  }

  async getDashboardSummary(company_id: string) {
    try {
      const [risks, incidents, houses, governance, escalations] = await Promise.all([
        query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE LOWER(status::text) = 'open') AS open, COUNT(*) FILTER (WHERE LOWER(severity::text) = 'critical') AS critical FROM risks WHERE company_id = $1`, [company_id]),
        query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE LOWER(status::text) = 'open') AS open FROM incidents WHERE company_id = $1`, [company_id]),
        query(`SELECT COUNT(*) AS total FROM houses WHERE company_id = $1 AND status != 'closed'`, [company_id]),
        query(`
          SELECT ROUND(COALESCE(
            100.0 * COUNT(*) FILTER (WHERE completed = true) / NULLIF(COUNT(*), 0), 
            0
          ), 1) AS avg_compliance 
          FROM daily_governance_log 
          WHERE review_date >= NOW() - INTERVAL '30 days'
        `, []),
        query(`SELECT COUNT(*) FILTER (WHERE LOWER(status::text) = 'pending') AS pending FROM escalations WHERE company_id = $1`, [company_id]),
      ]);

      return {
        risks: risks.rows[0],
        incidents: incidents.rows[0],
        houses: houses.rows[0],
        governance: governance.rows[0],
        escalations: escalations.rows[0],
      };
    } catch (err) {
      logger.error('AnalyticsService.getDashboardSummary failed:', err);
      throw err;
    }
  }

  async getMultiHouseIncidentTrends(company_id: string, days = 42) {
    try {
      const weekCount = Math.max(1, Math.ceil(Math.min(Math.max(days, 7), 366) / 7));
      const result = await query(
        `WITH weeks AS (
           SELECT generate_series(
             date_trunc('week',NOW() AT TIME ZONE 'Europe/London')-(($2::int-1)*INTERVAL '1 week'),
             date_trunc('week',NOW() AT TIME ZONE 'Europe/London'),INTERVAL '1 week') week_start
         ), services AS (
           SELECT id,name FROM canonical_house_state_v WHERE company_id=$1 AND is_active
         )
         SELECT w.week_start::date AS date,h.name AS house_name,
                COALESCE(SUM(CASE LOWER(i.severity::text)
                  WHEN 'critical' THEN 4 WHEN 'serious' THEN 3 WHEN 'moderate' THEN 2 ELSE 1 END),0)::int AS burden
           FROM weeks w CROSS JOIN services h
           LEFT JOIN incidents i ON i.company_id=$1 AND i.house_id=h.id
            AND i.occurred_at >= w.week_start AT TIME ZONE 'Europe/London'
            AND i.occurred_at < (w.week_start+INTERVAL '1 week') AT TIME ZONE 'Europe/London'
          GROUP BY w.week_start,h.name ORDER BY w.week_start,h.name`,
        [company_id, weekCount]
      );

      const pivotedData: any[] = [];
      const dateMap = new Map<string, any>();

      result.rows.forEach((row: any) => {
        const dateStr = (row.date instanceof Date ? row.date : new Date(row.date)).toISOString().split('T')[0];
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, { date: dateStr });
          pivotedData.push(dateMap.get(dateStr));
        }
        const dateObj = dateMap.get(dateStr);
        dateObj[row.house_name] = Number(row.burden) || 0;
      });

      const houseNames = Array.from(new Set(result.rows.map((row: any) => row.house_name)));
      return { trends: pivotedData, houses: houseNames, measure: 'severity_weighted_incident_burden', timezone: 'Europe/London' };
    } catch (err) {
      logger.error('AnalyticsService.getMultiHouseIncidentTrends failed:', err);
      throw err;
    }
  }

  async getTrends(company_id: string) {
    try {
      const multiHouseTrends = await this.getMultiHouseRiskTrends(company_id, 42);
      const multiHouseIncidents = await this.getMultiHouseIncidentTrends(company_id, 42);

      // Fixed UK calendar weeks: inclusive Monday start, exclusive next-Monday end.
      const weeklyVolumes = (await query(
        `WITH weeks AS (
           SELECT generate_series(
             date_trunc('week',NOW() AT TIME ZONE 'Europe/London')-INTERVAL '5 weeks',
             date_trunc('week',NOW() AT TIME ZONE 'Europe/London'),INTERVAL '1 week') week_start
         )
         SELECT w.week_start::date AS week,
                (SELECT COUNT(*)::int FROM escalations e WHERE e.company_id=$1
                  AND e.created_at >= w.week_start AT TIME ZONE 'Europe/London'
                  AND e.created_at < (w.week_start+INTERVAL '1 week') AT TIME ZONE 'Europe/London') AS escalations,
                (SELECT COUNT(*)::int FROM governance_pulses gp WHERE gp.company_id=$1
                  AND gp.risk_domain::text ILIKE '%Safeguarding%'
                  AND COALESCE((gp.entry_date::date+COALESCE(gp.entry_time,TIME '00:00')) AT TIME ZONE 'Europe/London',gp.created_at)
                      >= w.week_start AT TIME ZONE 'Europe/London'
                  AND COALESCE((gp.entry_date::date+COALESCE(gp.entry_time,TIME '00:00')) AT TIME ZONE 'Europe/London',gp.created_at)
                      < (w.week_start+INTERVAL '1 week') AT TIME ZONE 'Europe/London') AS safeguarding
           FROM weeks w ORDER BY w.week_start`, [company_id]
      )).rows;

      const escalationTrends = weeklyVolumes.map((w:any,i:number) => ({ week: `Week ${i+1}`, weekStart: w.week, count: Number(w.escalations)||0 }));
      const safeguardingTrends = weeklyVolumes.map((w:any,i:number) => ({ week: `Week ${i+1}`, weekStart: w.week, incidents: Number(w.safeguarding)||0 }));

      // Daily signal burden (volume × severity) using the recorded occurrence date.
      // A zero is shown only where a completed governance log confirms oversight; otherwise
      // a missing day remains null rather than being presented as evidence of improvement.
      const dailyRows = (await query(
        `SELECT gp.entry_date::date AS d,
                SUM(CASE LOWER(gp.severity::text) WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'moderate' THEN 2 ELSE 1 END)::float AS burden,
                COUNT(*)::int AS signal_count
           FROM governance_pulses gp
          WHERE gp.company_id = $1 AND gp.entry_date >= (NOW() AT TIME ZONE 'Europe/London')::date - 29
          GROUP BY d ORDER BY d ASC`,
        [company_id]
      )).rows;
      const reviewedDays = new Set<string>((await query(
        `SELECT DISTINCT dgl.review_date::text AS d FROM daily_governance_log dgl
          JOIN houses h ON h.id=dgl.house_id
         WHERE h.company_id=$1 AND dgl.completed=true
           AND dgl.review_date >= (NOW() AT TIME ZONE 'Europe/London')::date-29`, [company_id]
      )).rows.map((r:any)=>String(r.d).slice(0,10)));
      const dayMap = new Map<string, {burden:number;count:number}>();
      for (const r of dailyRows) dayMap.set(new Date(r.d).toISOString().slice(0, 10), {burden:Number(r.burden)||0,count:Number(r.signal_count)||0});
      const dailyRisk: any[] = [];
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const series: Array<number|null> = [];
      for (let i = 29; i >= 0; i--) {
        const day = new Date(today); day.setDate(today.getDate() - i);
        const key = day.toISOString().slice(0, 10);
        const recorded = dayMap.get(key);
        const val:number|null = recorded ? recorded.burden : reviewedDays.has(key) ? 0 : null;
        series.push(val);
        const window = series.slice(Math.max(0, series.length - 7)).filter((v):v is number=>v!==null);
        const movingAvg = window.length ? Math.round((window.reduce((a,b)=>a+b,0)/window.length)*10)/10 : null;
        dailyRisk.push({ date: key.slice(5), dateISO:key, dailyBurden:val, movingAvg,
          signalCount:recorded?.count||0, recordingState:recorded?'signals_recorded':reviewedDays.has(key)?'confirmed_zero':'no_submission' });
      }

      return {
        dailyRisk,
        crossHouseRisk: multiHouseTrends,
        crossHouseIncidents: multiHouseIncidents,
        safeGuarding: {
          trends: safeguardingTrends,
          currentWeek: safeguardingTrends[5] ? safeguardingTrends[5].incidents : 0,
          total: safeguardingTrends.reduce((sum, w) => sum + w.incidents, 0),
          average: parseFloat((safeguardingTrends.reduce((sum, w) => sum + w.incidents, 0) / 6).toFixed(1))
        },
        escalation: {
          trends: escalationTrends,
          currentWeek: escalationTrends[5] ? escalationTrends[5].count : 0,
          total: escalationTrends.reduce((sum, w) => sum + w.count, 0),
          average: parseFloat((escalationTrends.reduce((sum, w) => sum + w.count, 0) / 6).toFixed(1))
        }
      };
    } catch (err) {
      logger.error('AnalyticsService.getTrends failed:', err);
      throw err;
    }
  }

  async getDirectorIntelligence(company_id: string) {
    try {
      // 1. Control Failure Rate (signals recurring after risk closure)
      const failureRes = await query(
        `SELECT 
          COUNT(*) FILTER (WHERE rule_number = 5) as failure_count,
          COUNT(*) as total_events
         FROM threshold_events te
         JOIN signal_clusters sc ON sc.id = te.cluster_id
         WHERE sc.company_id = $1 AND te.created_at >= NOW() - INTERVAL '30 days'`,
        [company_id]
      );

      // 2. Domain Weakness (Cluster density by domain)
      const domainWeakness = await query(
        `SELECT 
          risk_domain, 
          COUNT(*) as cluster_count,
          COUNT(*) FILTER (WHERE LOWER(cluster_status::text) = 'escalated') as escalated_count
         FROM signal_clusters
         WHERE company_id = $1 AND LOWER(cluster_status::text) != 'closed'
         GROUP BY risk_domain
         ORDER BY escalated_count DESC, cluster_count DESC`,
        [company_id]
      );

      // 3. House Stability Ranking
      const stabilityRanking = await query(
        `SELECT 
          h.name as house_name,
          100 as avg_compliance,
          COUNT(DISTINCT sc.id) as open_signal_clusters,
          COUNT(DISTINCT r.id) FILTER (WHERE r.is_active) as open_risks,
          (100 - (COUNT(DISTINCT sc.id) * 5) - (COUNT(DISTINCT r.id) FILTER (WHERE r.is_active) * 10)) as stability_score
         FROM houses h
         LEFT JOIN governance_pulses gp ON gp.house_id = h.id AND gp.review_status != 'New'
         LEFT JOIN signal_clusters sc ON sc.house_id = h.id AND LOWER(sc.cluster_status::text) != 'closed'
         LEFT JOIN risks r ON r.house_id = h.id
         WHERE h.company_id = $1 AND h.status != 'closed'
         GROUP BY h.id, h.name
         ORDER BY stability_score DESC`,
        [company_id]
      );

      const fData = failureRes.rows[0];
      const failureRate = fData.total_events > 0 ? (fData.failure_count / fData.total_events) * 100 : 0;

      return {
        control_failure: {
          rate: parseFloat(failureRate.toFixed(2)),
          count: parseInt(fData.failure_count)
        },
        domain_weakness: domainWeakness.rows,
        house_stability: {
          top_performers: stabilityRanking.rows.slice(0, 5),
          concern_areas: stabilityRanking.rows.slice(-5).reverse()
        }
      };
    } catch (err) {
      logger.error('AnalyticsService.getDirectorIntelligence failed:', err);
      throw err;
    }
  }
}

export const analyticsService = new AnalyticsService();
