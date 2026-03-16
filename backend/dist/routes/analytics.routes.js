"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const tenant_middleware_1 = require("../middleware/tenant.middleware");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /api/v1/analytics/dashboard:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: GET /api/v1/analytics/dashboard
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/dashboard', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, analytics_controller_1.analyticsController.dashboard.bind(analytics_controller_1.analyticsController));
/**
 * @openapi
 * /api/v1/analytics/risk-trends:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: GET /api/v1/analytics/risk-trends
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/risk-trends', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, analytics_controller_1.analyticsController.riskTrends.bind(analytics_controller_1.analyticsController));
/**
 * @openapi
 * /api/v1/analytics/site-performance:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: GET /api/v1/analytics/site-performance
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/site-performance', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, analytics_controller_1.analyticsController.sitePerformance.bind(analytics_controller_1.analyticsController));
/**
 * @openapi
 * /api/v1/analytics/governance-compliance:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: GET /api/v1/analytics/governance-compliance
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/governance-compliance', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, analytics_controller_1.analyticsController.governanceCompliance.bind(analytics_controller_1.analyticsController));
/**
 * @openapi
 * /api/v1/analytics/escalation-rate:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: GET /api/v1/analytics/escalation-rate
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/escalation-rate', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, analytics_controller_1.analyticsController.escalationRate.bind(analytics_controller_1.analyticsController));
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map