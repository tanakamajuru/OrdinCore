import { Router } from 'express';
import { governanceQueriesController } from '../controllers/governanceQueries.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Raising a query is the RI's "assurance and challenge" duty — Director/Admin can also raise one
// (e.g. on the RI's behalf, or their own challenge), but RM does not raise queries against itself.
router.get('/', requireAuth, requireTenant, governanceQueriesController.list.bind(governanceQueriesController));
router.post('/', requireAuth, requireTenant, requireRole('RESPONSIBLE_INDIVIDUAL', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), governanceQueriesController.create.bind(governanceQueriesController));
// Answering is the respondent's job — typically RM, but Director can also answer a query raised to them.
router.post('/:id/respond', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), governanceQueriesController.respond.bind(governanceQueriesController));
router.post('/:id/close', requireAuth, requireTenant, requireRole('RESPONSIBLE_INDIVIDUAL', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), governanceQueriesController.close.bind(governanceQueriesController));
router.post('/:id/reopen', requireAuth, requireTenant, requireRole('RESPONSIBLE_INDIVIDUAL', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), governanceQueriesController.reopen.bind(governanceQueriesController));

export default router;
