import { Router } from 'express';
import { serviceUsersController } from '../controllers/serviceUsers.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

// List all patients for the company (search + site filter). All authenticated roles.
router.get('/', requireAuth, requireTenant, serviceUsersController.list.bind(serviceUsersController));

router.patch('/:id', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER', 'DIRECTOR'), serviceUsersController.update.bind(serviceUsersController));

export default router;
