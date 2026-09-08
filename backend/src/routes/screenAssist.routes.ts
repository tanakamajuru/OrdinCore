import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { screenAssistController } from '../controllers/screenAssist.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();
const assistLimit = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false });

router.post('/query', requireAuth, requireTenant,
  requireRole('TEAM_LEADER', 'REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'),
  assistLimit, screenAssistController.answer.bind(screenAssistController));
router.get('/doctrine/versions', requireAuth, requireRole('SUPER_ADMIN'),
  screenAssistController.listVersions.bind(screenAssistController));
router.post('/doctrine/versions/:version/publish', requireAuth, requireRole('SUPER_ADMIN'),
  screenAssistController.publishVersion.bind(screenAssistController));
router.post('/doctrine/versions/:version/retire', requireAuth, requireRole('SUPER_ADMIN'),
  screenAssistController.retireVersion.bind(screenAssistController));
export default router;
