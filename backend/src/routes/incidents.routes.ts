import { Router } from 'express';
import { incidentsController } from '../controllers/incidents.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.post('/', requireAuth, requireTenant, incidentsController.create.bind(incidentsController));
router.get('/', requireAuth, requireTenant, incidentsController.findAll.bind(incidentsController));
router.get('/:id', requireAuth, requireTenant, incidentsController.findById.bind(incidentsController));
router.patch('/:id', requireAuth, requireTenant, incidentsController.update.bind(incidentsController));
router.delete('/:id', requireAuth, requireTenant, incidentsController.delete.bind(incidentsController));

export default router;
