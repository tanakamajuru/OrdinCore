import { Router } from 'express';
import { learningController } from '../controllers/learning.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Learning is recorded by oversight roles against a governance source (effectiveness review,
// escalation/risk/pattern closure, weekly review, incident). AI suggestions are stored unapproved.
const learningWriters = requireRole('REGISTERED_MANAGER', 'TEAM_LEADER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN');

router.get('/register', requireAuth, requireTenant, learningWriters, learningController.list.bind(learningController));
// Declared before '/' so 'summary/pdf' and ':id/pdf' are not swallowed by the source-type route.
router.get('/summary/pdf', requireAuth, requireTenant, learningWriters, learningController.downloadSummaryPdf.bind(learningController));
router.get('/:id/pdf', requireAuth, requireTenant, learningWriters, learningController.downloadPdf.bind(learningController));
router.get('/', requireAuth, requireTenant, learningController.listBySource.bind(learningController));
router.post('/', requireAuth, requireTenant, learningWriters, learningController.create.bind(learningController));
router.post('/:id/approve', requireAuth, requireTenant, learningWriters, learningController.approve.bind(learningController));
// Implementation and verification each require evidence — replaces the old direct
// progress-stage set, which could flip to "Implemented"/"Verified" with nothing behind it.
router.post('/:id/implement', requireAuth, requireTenant, learningWriters, learningController.recordImplementation.bind(learningController));
router.post('/:id/verify', requireAuth, requireTenant, learningWriters, learningController.verifyImprovement.bind(learningController));
router.post('/:id/duplicate', requireAuth, requireTenant, learningWriters, learningController.markDuplicate.bind(learningController));
// Complete a deferred ("Not yet assessed") learning when its review date is due.
router.post('/:id/assess', requireAuth, requireTenant, learningWriters, learningController.assess.bind(learningController));

export default router;
