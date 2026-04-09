import { query } from '../config/database';

export class AnalyticsService {
  async getRiskTrends(company_id: string, days = 30) {
    const result = await query(
      `SELECT 
        DATE(created_at) AS date,
        COUNT(*) FILTER (WHERE severity = 'critical') AS critical,
        COUNT(*) FILTER (WHERE severity = 'high') AS high,
        COUNT(*) FILTER (WHERE severity = 'medium') AS medium,
        COUNT(*) FILTER (WHERE severity = 'low') AS low,
        COUNT(*) AS total
       FROM risks
       WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
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
  }

  async getMultiHouseRiskTrends(company_id: string, days = 42) { // 6 weeks = 42 days
    const result = await query(
      `SELECT 
        DATE(r.created_at) AS date,
        h.name AS house_name,
        COUNT(*) AS count
       FROM risks r
       JOIN houses h ON h.id = r.house_id
       WHERE r.company_id = $1 AND r.created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(r.created_at), h.name
       ORDER BY date, house_name`,
      [company_id]
    );

    // Pivot data for Recharts: { date: '...', 'House A': 5, 'House B': 3 }
    const pivotedData: any[] = [];
    const dateMap = new Map<string, any>();

    result.rows.forEach((row: any) => {
      const dateStr = row.date.toISOString().split('T')[0];
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { date: dateStr });
        pivotedData.push(dateMap.get(dateStr));
      }
      const dateObj = dateMap.get(dateStr);
      dateObj[row.house_name] = parseInt(row.count);
    });

    // Get list of unique house names for the frontend to know which lines to draw
    const houseNames = Array.from(new Set(result.rows.map((row: any) => row.house_name)));

    return { trends: pivotedData, houses: houseNames };
  }

  async getSitePerformance(company_id: string) {
    const result = await query(
      `SELECT 
        h.id AS house_id,
        h.name AS house_name,
        COUNT(DISTINCT r.id) FILTER (WHERE r.status != 'closed') AS open_risks,
        COUNT(DISTINCT r.id) FILTER (WHERE r.severity = 'critical') AS critical_risks,
        COUNT(DISTINCT i.id) FILTER (WHERE i.status NOT IN ('resolved','closed')) AS open_incidents,
        COALESCE(AVG(gp.compliance_score), 0) AS avg_compliance_score,
        COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'pending') AS pending_escalations
       FROM houses h
       LEFT JOIN risks r ON r.house_id = h.id AND r.company_id = $1
       LEFT JOIN incidents i ON i.house_id = h.id AND i.company_id = $1
       LEFT JOIN governance_pulses gp ON gp.house_id = h.id AND gp.company_id = $1 AND gp.status = 'completed'
       LEFT JOIN escalations e ON e.company_id = $1
       WHERE h.company_id = $1 AND h.status = 'active'
       GROUP BY h.id, h.name
       ORDER BY open_risks DESC`,
      [company_id]
    );
    return result.rows;
  }

  async getGovernanceCompliance(company_id: string, days = 90) {
    const result = await query(
      `SELECT 
        h.name AS house_name,
        h.id AS house_id,
        COUNT(gp.id) AS total_pulses,
        COUNT(gp.id) FILTER (WHERE gp.status = 'completed') AS completed_pulses,
        COUNT(gp.id) FILTER (WHERE gp.status = 'overdue') AS overdue_pulses,
        COALESCE(AVG(gp.compliance_score) FILTER (WHERE gp.status = 'completed'), 0) AS avg_score,
        ROUND(
          100.0 * COUNT(gp.id) FILTER (WHERE gp.status = 'completed') / NULLIF(COUNT(gp.id), 0), 2
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
        ROUND(AVG(compliance_score), 2) AS avg_compliance,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'overdue') AS overdue,
        COUNT(*) AS total
       FROM governance_pulses
       WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'`,
      [company_id]
    );

    return { by_house: result.rows, overall: overall.rows[0] };
  }

  async getEscalationRate(company_id: string, days = 30) {
    const result = await query(
      `SELECT
        DATE(created_at) AS date,
        COUNT(*) AS total_escalations,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
        COUNT(*) FILTER (WHERE priority = 'critical') AS critical
       FROM escalations
       WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [company_id]
    );

    const summary = await query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600), 2) AS avg_resolution_hours
       FROM escalations
       WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'`,
      [company_id]
    );

    return { trend: result.rows, summary: summary.rows[0] };
  }

  async getDashboardSummary(company_id: string) {
    const [risks, incidents, houses, governance, escalations] = await Promise.all([
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'open') AS open, COUNT(*) FILTER (WHERE severity = 'critical') AS critical FROM risks WHERE company_id = $1`, [company_id]),
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'open') AS open FROM incidents WHERE company_id = $1`, [company_id]),
      query(`SELECT COUNT(*) AS total FROM houses WHERE company_id = $1 AND status = 'active'`, [company_id]),
      query(`SELECT COALESCE(AVG(compliance_score),0) AS avg_compliance FROM governance_pulses WHERE company_id = $1 AND status = 'completed'`, [company_id]),
      query(`SELECT COUNT(*) FILTER (WHERE status = 'pending') AS pending FROM escalations WHERE company_id = $1`, [company_id]),
    ]);

    return {
      risks: risks.rows[0],
      incidents: incidents.rows[0],
      houses: houses.rows[0],
      governance: governance.rows[0],
      escalations: escalations.rows[0],
    };
  }

  async getMultiHouseIncidentTrends(company_id: string, days = 42) {
    const result = await query(
      `SELECT 
        DATE(i.created_at) AS date,
        h.name AS house_name,
        COUNT(*) AS count
       FROM incidents i
       JOIN houses h ON h.id = i.house_id
       WHERE i.company_id = $1 AND i.created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(i.created_at), h.name
       ORDER BY date, house_name`,
      [company_id]
    );

    const pivotedData: any[] = [];
    const dateMap = new Map<string, any>();

    result.rows.forEach((row: any) => {
      const dateStr = row.date.toISOString().split('T')[0];
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { date: dateStr });
        pivotedData.push(dateMap.get(dateStr));
      }
      const dateObj = dateMap.get(dateStr);
      dateObj[row.house_name] = parseInt(row.count);
    });

    const houseNames = Array.from(new Set(result.rows.map((row: any) => row.house_name)));
    return { trends: pivotedData, houses: houseNames };
  }

  async getTrends(company_id: string) {
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
  }
}

export const analyticsService = new AnalyticsService();
