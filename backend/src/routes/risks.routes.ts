import { Router } from 'express';
import { risksController } from '../controllers/risks.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.post('/', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER', 'RESPONSIBLE_INDIVIDUAL'), risksController.create.bind(risksController));
router.get('/', requireAuth, requireTenant, risksController.findAll.bind(risksController));
router.get('/:id', requireAuth, requireTenant, risksController.findById.bind(risksController));
router.patch('/:id', requireAuth, requireTenant, risksController.update.bind(risksController));
router.delete('/:id', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), risksController.delete.bind(risksController));
router.post('/:id/event', requireAuth, requireTenant, risksController.addEvent.bind(risksController));
router.post('/:id/action', requireAuth, requireTenant, risksController.addAction.bind(risksController));
router.post('/:id/escalate', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), risksController.escalate.bind(risksController));
router.get('/:id/timeline', requireAuth, requireTenant, risksController.getTimeline.bind(risksController));

export default router;
