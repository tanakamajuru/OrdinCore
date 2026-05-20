import { Router } from 'express';
import { serviceUsersController } from '../controllers/serviceUsers.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.patch('/:id', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), serviceUsersController.update.bind(serviceUsersController));

export default router;
