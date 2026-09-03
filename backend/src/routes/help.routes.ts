import { Router } from 'express';
import { helpController } from '../controllers/help.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Reader — any authenticated user sees the Help & Guidelines targeted at their role.
router.get('/', requireAuth, requireTenant, helpController.listForMe.bind(helpController));

// Admin — author and manage Help & Guidelines content.
router.get('/manage', requireAuth, requireTenant, requireRole('ADMIN', 'SUPER_ADMIN'), helpController.listAll.bind(helpController));
router.post('/', requireAuth, requireTenant, requireRole('ADMIN', 'SUPER_ADMIN'), helpController.create.bind(helpController));
router.patch('/:id', requireAuth, requireTenant, requireRole('ADMIN', 'SUPER_ADMIN'), helpController.update.bind(helpController));
router.delete('/:id', requireAuth, requireTenant, requireRole('ADMIN', 'SUPER_ADMIN'), helpController.remove.bind(helpController));

export default router;
