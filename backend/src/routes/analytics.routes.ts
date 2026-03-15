import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

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
router.get('/dashboard', requireAuth, requireTenant, analyticsController.dashboard.bind(analyticsController));
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
router.get('/risk-trends', requireAuth, requireTenant, analyticsController.riskTrends.bind(analyticsController));
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
router.get('/site-performance', requireAuth, requireTenant, analyticsController.sitePerformance.bind(analyticsController));
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
router.get('/governance-compliance', requireAuth, requireTenant, analyticsController.governanceCompliance.bind(analyticsController));
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
