import { Router } from 'express';
import { companyController } from '../controllers/company.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// All company routes require SUPER_ADMIN
router.post('/', requireAuth, requireRole('SUPER_ADMIN'), companyController.create.bind(companyController));
router.get('/', requireAuth, requireRole('SUPER_ADMIN'), companyController.findAll.bind(companyController));
router.get('/:id', requireAuth, requireRole('SUPER_ADMIN'), companyController.findById.bind(companyController));
router.patch('/:id', requireAuth, requireRole('SUPER_ADMIN'), companyController.update.bind(companyController));
router.delete('/:id', requireAuth, requireRole('SUPER_ADMIN'), companyController.delete.bind(companyController));

export default router;
