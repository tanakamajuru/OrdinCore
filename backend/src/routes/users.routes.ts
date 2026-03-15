import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.post('/', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), usersController.create.bind(usersController));
router.get('/', requireAuth, requireTenant, usersController.findAll.bind(usersController));
router.get('/:id', requireAuth, requireTenant, usersController.findById.bind(usersController));
router.patch('/:id', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), usersController.update.bind(usersController));
router.delete('/:id', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), usersController.delete.bind(usersController));
router.post('/:id/assign-house', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), usersController.assignHouse.bind(usersController));

export default router;
