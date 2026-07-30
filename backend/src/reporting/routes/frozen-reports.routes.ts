import { Router } from 'express';
import { frozenReportsController } from '../controllers/frozen-reports.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireTenant } from '../../middleware/tenant.middleware';

// Scoped ("frozen") reporting. Authorisation is enforced per-request inside report-scope.service
// (role + tenant + assigned sites), so these routes just require an authenticated tenant user.
const router = Router();

router.get('/catalog', requireAuth, requireTenant, frozenReportsController.catalog);
router.get('/', requireAuth, requireTenant, frozenReportsController.list);
router.post('/:reportKey/generate', requireAuth, requireTenant, frozenReportsController.generate.bind(frozenReportsController));
router.get('/:id', requireAuth, requireTenant, frozenReportsController.get);
router.post('/:id/approve', requireAuth, requireTenant, frozenReportsController.approve.bind(frozenReportsController));
router.get('/:id/download', requireAuth, requireTenant, frozenReportsController.download.bind(frozenReportsController));

export default router;
