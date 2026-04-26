import { Router } from 'express';
import { clustersController } from '../controllers/clusters.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.get('/:id', requireAuth, requireTenant, clustersController.findById.bind(clustersController));

export default router;
