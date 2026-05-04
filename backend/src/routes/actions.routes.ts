import { Router } from 'express';
import { actionsController } from '../controllers/actions.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

/**
 * @openapi
 * /api/v1/actions/{id}/complete:
 *   patch:
 *     tags:
 *       - Actions
 *     summary: TL completes an action with outcome and rationale
 *     security:
 *       - BearerAuth: []
 */
router.patch('/:id/complete', requireAuth, requireTenant, requireRole('TEAM_LEADER', 'REGISTERED_MANAGER'), actionsController.complete.bind(actionsController));

router.get('/my', requireAuth, requireTenant, requireRole('TEAM_LEADER', 'REGISTERED_MANAGER', 'DIRECTOR', 'ADMIN'), actionsController.getMyActions.bind(actionsController));

/**
 * @openapi
 * /api/v1/actions/{id}/rm-review:
 *   post:
 *     tags:
 *       - Actions
 *     summary: RM reviews a completed action
 *     security:
 *       - BearerAuth: []
 */
router.post('/:id/rm-review', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'ADMIN'), actionsController.rmReview.bind(actionsController));

export default router;
