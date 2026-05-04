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
         FROM risks
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
      const result = await query(
        `SELECT 
          r.created_at::date AS date,
          h.name AS house_name,
          COUNT(*) AS count
         FROM risks r
         JOIN houses h ON h.id = r.house_id
         WHERE r.company_id = $1 AND r.created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY r.created_at::date, h.name
         ORDER BY date, house_name`,
        [company_id]
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
        dateObj[row.house_name] = parseInt(row.count);
      });

      const houseNames = Array.from(new Set(result.rows.map((row: any) => row.house_name)));
      return { trends: pivotedData, houses: houseNames };
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
         LEFT JOIN escalations e ON e.service_unit_id = h.id AND e.company_id = $1
         WHERE h.company_id = $1 AND h.is_active = true
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
         FROM escalations
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
          ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600), 2) AS avg_resolution_hours
         FROM escalations
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
        query(`SELECT COUNT(*) AS total FROM houses WHERE company_id = $1 AND is_active = true`, [company_id]),
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
      const result = await query(
        `SELECT 
          i.created_at::date AS date,
          h.name AS house_name,
          COUNT(*) AS count
         FROM incidents i
         JOIN houses h ON h.id = i.house_id
         WHERE i.company_id = $1 AND i.created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY i.created_at::date, h.name
         ORDER BY date, house_name`,
        [company_id]
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
        dateObj[row.house_name] = parseInt(row.count);
      });

      const houseNames = Array.from(new Set(result.rows.map((row: any) => row.house_name)));
      return { trends: pivotedData, houses: houseNames };
    } catch (err) {
      logger.error('AnalyticsService.getMultiHouseIncidentTrends failed:', err);
      throw err;
    }
  }

  async getTrends(company_id: string) {
    try {
      const multiHouseTrends = await this.getMultiHouseRiskTrends(company_id, 42);
      const multiHouseIncidents = await this.getMultiHouseIncidentTrends(company_id, 42);

      const incidentsResult = await query(
        `SELECT created_at FROM incidents WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '42 days'`,
        [company_id]
      );
      const escalationsResult = await query(
        `SELECT created_at FROM escalations WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '42 days'`,
        [company_id]
      );

      const now = new Date();
      const weeks = Array.from({ length: 6 }, (_, i) => {
        const end = new Date(now);
        end.setDate(end.getDate() - (5 - i) * 7);
        const start = new Date(end);
        start.setDate(start.getDate() - 7);
        return { start, end, label: `Week ${i + 1}`, incidents: 0, escalations: 0 };
      });

      incidentsResult.rows.forEach((row: any) => {
        const d = new Date(row.created_at);
        const week = weeks.find(w => d >= w.start && d <= w.end);
        if (week) week.incidents++;
      });

      escalationsResult.rows.forEach((row: any) => {
        const d = new Date(row.created_at);
        const week = weeks.find(w => d >= w.start && d <= w.end);
        if (week) week.escalations++;
      });

      const incidentTrends = weeks.map(w => ({ week: w.label, incidents: w.incidents }));
      const escalationTrends = weeks.map(w => ({ week: w.label, count: w.escalations }));

      return {
        crossHouseRisk: multiHouseTrends,
        crossHouseIncidents: multiHouseIncidents,
        safeGuarding: {
          trends: incidentTrends,
          currentWeek: incidentTrends[5] ? incidentTrends[5].incidents : 0,
          total: incidentTrends.reduce((sum, w) => sum + w.incidents, 0),
          average: parseFloat((incidentTrends.reduce((sum, w) => sum + w.incidents, 0) / 6).toFixed(1))
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
          COUNT(DISTINCT r.id) FILTER (WHERE LOWER(r.status::text) NOT IN ('closed', 'resolved')) as open_risks,
          (100 - (COUNT(DISTINCT sc.id) * 5) - (COUNT(DISTINCT r.id) FILTER (WHERE LOWER(r.status::text) NOT IN ('closed', 'resolved')) * 10)) as stability_score
         FROM houses h
         LEFT JOIN governance_pulses gp ON gp.house_id = h.id AND gp.review_status != 'New'
         LEFT JOIN signal_clusters sc ON sc.house_id = h.id AND LOWER(sc.cluster_status::text) != 'closed'
         LEFT JOIN risks r ON r.house_id = h.id
         WHERE h.company_id = $1 AND h.is_active = true
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
