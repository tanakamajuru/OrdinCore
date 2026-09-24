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
// Same-day addendum to a signed daily log — RM operational action (oversight guard applies);
// listing is read-only for any authorised tenant user.
router.post('/:id/addenda', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER'), blockOversightRole, dailyGovernanceController.addAddendum.bind(dailyGovernanceController));
router.get('/:id/addenda', requireAuth, requireTenant, dailyGovernanceController.listAddenda.bind(dailyGovernanceController));

router.get('/coverage', requireAuth, requireTenant, requireRole('DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'), dailyGovernanceController.getCoverage.bind(dailyGovernanceController));

export default router;
