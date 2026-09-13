import { Router } from 'express';
import { governanceStateController } from '../controllers/governanceState.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

// Canonical read endpoint for web, mobile and every operational/oversight role.
router.get('/risks/:riskId', requireAuth, requireTenant, governanceStateController.getRiskState);

export default router;
