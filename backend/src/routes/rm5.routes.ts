import { Router } from 'express';
import { rm5Controller } from '../controllers/rm5.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
// The RM 5-screen read BFF. Oversight roles may read it (Director/RI use it read-only).
const rm = [requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN')];

router.get('/today', ...rm, rm5Controller.today);
router.get('/counts', ...rm, rm5Controller.counts);
router.get('/patterns', ...rm, rm5Controller.patterns);
router.get('/register', ...rm, rm5Controller.register);         // ?type=active|strategic|closed
router.get('/actions', ...rm, rm5Controller.actions);
router.get('/effectiveness', ...rm, rm5Controller.effectiveness);

export default router;
