import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.post('/request', requireAuth, requireTenant, reportsController.request.bind(reportsController));
router.get('/', requireAuth, requireTenant, reportsController.findAll.bind(reportsController));
router.get('/:id', requireAuth, requireTenant, reportsController.findById.bind(reportsController));
router.get('/:id/download', requireAuth, requireTenant, reportsController.download.bind(reportsController));

export default router;
