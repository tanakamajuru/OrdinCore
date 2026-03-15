import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.get('/dashboard', requireAuth, requireTenant, analyticsController.dashboard.bind(analyticsController));
router.get('/risk-trends', requireAuth, requireTenant, analyticsController.riskTrends.bind(analyticsController));
router.get('/site-performance', requireAuth, requireTenant, analyticsController.sitePerformance.bind(analyticsController));
router.get('/governance-compliance', requireAuth, requireTenant, analyticsController.governanceCompliance.bind(analyticsController));
router.get('/escalation-rate', requireAuth, requireTenant, analyticsController.escalationRate.bind(analyticsController));

export default router;
