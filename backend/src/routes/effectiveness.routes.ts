import { Router } from 'express';
import { actionEffectivenessController } from '../controllers/actionEffectiveness.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

/**
 * @openapi
 * /api/v1/effectiveness/pending:
 *   get:
 *     tags: [Effectiveness]
 *     summary: Completed actions awaiting an effectiveness review (spec section 9 path)
 *     security: [{ BearerAuth: [] }]
 */
router.get('/pending', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), actionEffectivenessController.getPending.bind(actionEffectivenessController));

export default router;
