import { Router } from 'express';
import { governanceController } from '../controllers/governance.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

// Templates
router.post('/templates', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), governanceController.createTemplate.bind(governanceController));
router.get('/templates', requireAuth, requireTenant, governanceController.getTemplates.bind(governanceController));

// Pulses
router.post('/pulse', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), governanceController.createPulse.bind(governanceController));
router.get('/pulses', requireAuth, requireTenant, governanceController.getPulses.bind(governanceController));
router.get('/pulses/:id', requireAuth, requireTenant, governanceController.getPulseById.bind(governanceController));
router.post('/pulses/:id/submit', requireAuth, requireTenant, governanceController.submitAnswers.bind(governanceController));

export default router;
