import { Router } from 'express';
import { closureController } from '../controllers/closure.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireMinRole } from '../middleware/role.middleware';

const router = Router();

/**
 * @openapi
 * /api/v1/closure/escalations/{id}:
 *   post:
 *     tags: [Closure]
 *     summary: Evidence-based closure of an escalation (spec module 8)
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Success }
 */
router.post('/escalations/:id', requireAuth, requireTenant, requireMinRole('REGISTERED_MANAGER'), closureController.closeEscalation.bind(closureController));

/**
 * @openapi
 * /api/v1/closure/risks/{id}:
 *   post:
 *     tags: [Closure]
 *     summary: Evidence-based closure of a strategic risk (spec module 8)
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Success }
 */
router.post('/risks/:id', requireAuth, requireTenant, requireMinRole('REGISTERED_MANAGER'), closureController.closeRisk.bind(closureController));

export default router;
