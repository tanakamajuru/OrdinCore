import { Router } from 'express';
import { escalationsController } from '../controllers/escalations.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.get('/', requireAuth, requireTenant, escalationsController.findAll.bind(escalationsController));
router.get('/:id', requireAuth, requireTenant, escalationsController.findById.bind(escalationsController));
router.post('/:id/resolve', requireAuth, requireTenant, escalationsController.resolve.bind(escalationsController));
router.post('/:id/acknowledge', requireAuth, requireTenant, escalationsController.acknowledge.bind(escalationsController));

export default router;
