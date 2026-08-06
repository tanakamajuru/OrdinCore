import { Router } from 'express';
import { dailyGovernanceController } from '../controllers/dailyGovernance.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole, blockOversightRole } from '../middleware/role.middleware';

const router = Router();

// §7 — daily governance is an operational action; the Responsible Individual (oversight) must
// switch to an operational role to perform it. openLog/complete are RM-only + oversight guard.
router.post('/open', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER'), blockOversightRole, dailyGovernanceController.openLog.bind(dailyGovernanceController));
router.patch('/:id/complete', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER'), blockOversightRole, dailyGovernanceController.completeLog.bind(dailyGovernanceController));
router.get('/coverage', requireAuth, requireTenant, requireRole('DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'), dailyGovernanceController.getCoverage.bind(dailyGovernanceController));

export default router;
