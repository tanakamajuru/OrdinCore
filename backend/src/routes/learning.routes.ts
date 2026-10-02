import { Router } from 'express';
import { learningController } from '../controllers/learning.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Learning is recorded by oversight roles against a governance source (effectiveness review,
// escalation/risk/pattern closure, weekly review, incident). AI suggestions are stored unapproved.
const learningWriters = requireRole('REGISTERED_MANAGER', 'TEAM_LEADER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN');

router.get('/', requireAuth, requireTenant, learningController.listBySource.bind(learningController));
router.post('/', requireAuth, requireTenant, learningWriters, learningController.create.bind(learningController));
router.post('/:id/approve', requireAuth, requireTenant, learningWriters, learningController.approve.bind(learningController));
router.post('/:id/progress', requireAuth, requireTenant, learningWriters, learningController.setProgress.bind(learningController));

export default router;
