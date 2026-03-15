import { Router } from 'express';
import { housesController } from '../controllers/houses.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.post('/', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), housesController.create.bind(housesController));
router.get('/', requireAuth, requireTenant, housesController.findAll.bind(housesController));
router.get('/:id', requireAuth, requireTenant, housesController.findById.bind(housesController));
router.patch('/:id', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), housesController.update.bind(housesController));
router.delete('/:id', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), housesController.delete.bind(housesController));

export default router;
