"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = exports.AnalyticsService = void 0;
const database_1 = require("../config/database");
class AnalyticsService {
    async getRiskTrends(company_id, days = 30) {
        const result = await (0, database_1.query)(`SELECT 
        DATE(created_at) AS date,
        COUNT(*) FILTER (WHERE severity = 'critical') AS critical,
        COUNT(*) FILTER (WHERE severity = 'high') AS high,
        COUNT(*) FILTER (WHERE severity = 'medium') AS medium,
        COUNT(*) FILTER (WHERE severity = 'low') AS low,
        COUNT(*) AS total
       FROM risks
       WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date`, [company_id]);
        const statusResult = await (0, database_1.query)(`SELECT 
        status,
        COUNT(*) AS count
       FROM risks WHERE company_id = $1
       GROUP BY status`, [company_id]);
        return { trends: result.rows, by_status: statusResult.rows };
    }
    async getSitePerformance(company_id) {
        const result = await (0, database_1.query)(`SELECT 
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
       ORDER BY open_risks DESC`, [company_id]);
        return result.rows;
    }
    async getGovernanceCompliance(company_id, days = 90) {
        const result = await (0, database_1.query)(`SELECT 
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
       ORDER BY completion_rate DESC`, [company_id]);
        const overall = await (0, database_1.query)(`SELECT 
        ROUND(AVG(compliance_score), 2) AS avg_compliance,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'overdue') AS overdue,
        COUNT(*) AS total
       FROM governance_pulses
       WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'`, [company_id]);
        return { by_house: result.rows, overall: overall.rows[0] };
    }
    async getEscalationRate(company_id, days = 30) {
        const result = await (0, database_1.query)(`SELECT
        DATE(created_at) AS date,
        COUNT(*) AS total_escalations,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
        COUNT(*) FILTER (WHERE priority = 'critical') AS critical
       FROM escalations
       WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date`, [company_id]);
        const summary = await (0, database_1.query)(`SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600), 2) AS avg_resolution_hours
       FROM escalations
       WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'`, [company_id]);
        return { trend: result.rows, summary: summary.rows[0] };
    }
    async getDashboardSummary(company_id) {
        const [risks, incidents, houses, governance, escalations] = await Promise.all([
            (0, database_1.query)(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'open') AS open, COUNT(*) FILTER (WHERE severity = 'critical') AS critical FROM risks WHERE company_id = $1`, [company_id]),
            (0, database_1.query)(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'open') AS open FROM incidents WHERE company_id = $1`, [company_id]),
            (0, database_1.query)(`SELECT COUNT(*) AS total FROM houses WHERE company_id = $1 AND status = 'active'`, [company_id]),
            (0, database_1.query)(`SELECT COALESCE(AVG(compliance_score),0) AS avg_compliance FROM governance_pulses WHERE company_id = $1 AND status = 'completed'`, [company_id]),
            (0, database_1.query)(`SELECT COUNT(*) FILTER (WHERE status = 'pending') AS pending FROM escalations WHERE company_id = $1`, [company_id]),
        ]);
        return {
            risks: risks.rows[0],
            incidents: incidents.rows[0],
            houses: houses.rows[0],
            governance: governance.rows[0],
            escalations: escalations.rows[0],
        };
    }
}
exports.AnalyticsService = AnalyticsService;
exports.analyticsService = new AnalyticsService();
//# sourceMappingURL=analytics.service.js.map