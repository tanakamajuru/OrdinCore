import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Stats summary routes for Admin Dashboard
router.get('/users/stats/summary', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), adminController.getUserStatsSummary.bind(adminController));
router.get('/houses/stats/summary', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), adminController.getHouseStatsSummary.bind(adminController));
router.get('/pulses/stats/summary', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), adminController.getPulseStatsSummary.bind(adminController));
router.get('/risks/stats/summary', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), adminController.getRiskStatsSummary.bind(adminController));

export default router;
