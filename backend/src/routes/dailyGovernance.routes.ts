import { Router } from 'express';
import { dailyGovernanceController } from '../controllers/dailyGovernance.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.post('/open', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER'), dailyGovernanceController.openLog.bind(dailyGovernanceController));
router.patch('/:id/complete', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'RESPONSIBLE_INDIVIDUAL'), dailyGovernanceController.completeLog.bind(dailyGovernanceController));
router.get('/coverage', requireAuth, requireTenant, requireRole('DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'), dailyGovernanceController.getCoverage.bind(dailyGovernanceController));

export default router;
