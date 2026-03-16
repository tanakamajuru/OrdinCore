"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsController = exports.AnalyticsController = void 0;
const analytics_service_1 = require("../services/analytics.service");
class AnalyticsController {
    async riskTrends(req, res) {
        try {
            const company_id = req.user.company_id;
            const days = parseInt(req.query.days) || 30;
            const data = await analytics_service_1.analyticsService.getRiskTrends(company_id, days);
            return res.json({ success: true, data, meta: { days } });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to get risk trends', errors: [] });
        }
    }
    async sitePerformance(req, res) {
        try {
            const company_id = req.user.company_id;
            const data = await analytics_service_1.analyticsService.getSitePerformance(company_id);
            return res.json({ success: true, data, meta: {} });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to get site performance', errors: [] });
        }
    }
    async governanceCompliance(req, res) {
        try {
            const company_id = req.user.company_id;
            const days = parseInt(req.query.days) || 90;
            const data = await analytics_service_1.analyticsService.getGovernanceCompliance(company_id, days);
            return res.json({ success: true, data, meta: { days } });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to get governance compliance', errors: [] });
        }
    }
    async escalationRate(req, res) {
        try {
            const company_id = req.user.company_id;
            const days = parseInt(req.query.days) || 30;
            const data = await analytics_service_1.analyticsService.getEscalationRate(company_id, days);
            return res.json({ success: true, data, meta: { days } });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to get escalation rate', errors: [] });
        }
    }
    async dashboard(req, res) {
        try {
            const company_id = req.user.company_id;
            const data = await analytics_service_1.analyticsService.getDashboardSummary(company_id);
            return res.json({ success: true, data, meta: {} });
        }
        catch (err) {
            return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to get dashboard', errors: [] });
        }
    }
}
exports.AnalyticsController = AnalyticsController;
exports.analyticsController = new AnalyticsController();
//# sourceMappingURL=analytics.controller.js.map