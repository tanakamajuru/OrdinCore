import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireMinRole } from '../middleware/role.middleware';

const router = Router();

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
router.get('/dashboard', requireAuth, requireTenant, requireMinRole('REGISTERED_MANAGER'), analyticsController.dashboard.bind(analyticsController));
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
router.get('/risk-trends', requireAuth, requireTenant, requireMinRole('REGISTERED_MANAGER'), analyticsController.riskTrends.bind(analyticsController));

/**
 * @openapi
 * /api/v1/analytics/risk-trends/multi-house:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: GET /api/v1/analytics/risk-trends/multi-house
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/risk-trends/multi-house', requireAuth, requireTenant, requireMinRole('RESPONSIBLE_INDIVIDUAL'), analyticsController.multiHouseRiskTrends.bind(analyticsController));
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
router.get('/site-performance', requireAuth, requireTenant, requireMinRole('RESPONSIBLE_INDIVIDUAL'), analyticsController.sitePerformance.bind(analyticsController));
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
router.get('/governance-compliance', requireAuth, requireTenant, requireMinRole('RESPONSIBLE_INDIVIDUAL'), analyticsController.governanceCompliance.bind(analyticsController));

/**
 * @openapi
 * /api/v1/analytics/trends:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: GET /api/v1/analytics/trends
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/trends', requireAuth, requireTenant, requireMinRole('REGISTERED_MANAGER'), analyticsController.trends.bind(analyticsController));
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
router.get('/escalation-rate', requireAuth, requireTenant, analyticsController.escalationRate.bind(analyticsController));

export default router;
