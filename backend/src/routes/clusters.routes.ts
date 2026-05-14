import { Router } from 'express';
import { clustersController } from '../controllers/clusters.controller';
import { risksController } from '../controllers/risks.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.get('/', requireAuth, requireTenant, clustersController.findAll.bind(clustersController));
router.get('/:id', requireAuth, requireTenant, clustersController.findById.bind(clustersController));

// Support for promotion via cluster ID in URL
router.post('/:id/promote', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER'), risksController.promote.bind(risksController));

export default router;
