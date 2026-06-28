import { Router } from 'express';
import { escalationsController } from '../controllers/escalations.controller';
import { closureController } from '../controllers/closure.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

/**
 * @openapi
 * /api/v1/escalations:
 *   get:
 *     tags:
 *       - Escalations
 *     summary: GET /api/v1/escalations
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', requireAuth, requireTenant, escalationsController.findAll.bind(escalationsController));
/**
 * @openapi
 * /api/v1/escalations/stats:
 *   get:
 *     tags:
 *       - Escalations
 *     summary: GET /api/v1/escalations/stats
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/stats', requireAuth, requireTenant, escalationsController.getStats.bind(escalationsController));
/**
 * @openapi
 * /api/v1/escalations/{id}:
 *   get:
 *     tags:
 *       - Escalations
 *     summary: GET /api/v1/escalations/{id}
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/:id', requireAuth, requireTenant, escalationsController.findById.bind(escalationsController));

// Actions
/**
 * @openapi
 * /api/v1/escalations/{id}/actions:
 *   post:
 *     tags:
 *       - Escalations
 *     summary: POST /api/v1/escalations/{id}/actions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/:id/actions', requireAuth, requireTenant, escalationsController.addAction.bind(escalationsController));
/**
 * @openapi
 * /api/v1/escalations/{id}/actions:
 *   get:
 *     tags:
 *       - Escalations
 *     summary: GET /api/v1/escalations/{id}/actions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/:id/actions', requireAuth, requireTenant, escalationsController.getActions.bind(escalationsController));

// Assignment and State updates
/**
 * @openapi
 * /api/v1/escalations/{id}/assign:
 *   post:
 *     tags:
 *       - Escalations
 *     summary: POST /api/v1/escalations/{id}/assign
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/:id/assign', requireAuth, requireTenant, escalationsController.assignEscalation.bind(escalationsController));
/**
 * @openapi
 * /api/v1/escalations/{id}/priority:
 *   patch:
 *     tags:
 *       - Escalations
 *     summary: PATCH /api/v1/escalations/{id}/priority
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.patch('/:id/priority', requireAuth, requireTenant, escalationsController.updatePriority.bind(escalationsController));
/**
 * @openapi
 * /api/v1/escalations/{id}/resolve:
 *   post:
 *     tags:
 *       - Escalations
 *     summary: POST /api/v1/escalations/{id}/resolve
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/:id/resolve', requireAuth, requireTenant, escalationsController.resolve.bind(escalationsController));
router.post('/:id/escalate-further', requireAuth, requireTenant, escalationsController.escalateFurther.bind(escalationsController));
/**
 * @openapi
 * /api/v1/escalations/{id}/acknowledge:
 *   post:
 *     tags:
 *       - Escalations
 *     summary: POST /api/v1/escalations/{id}/acknowledge
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/:id/acknowledge', requireAuth, requireTenant, escalationsController.acknowledge.bind(escalationsController));

// Time-bound lifecycle transitions (spec module 4)
/**
 * @openapi
 * /api/v1/escalations/{id}/transition:
 *   post:
 *     tags: [Escalations]
 *     summary: Move an escalation through its lifecycle (Open -> Under Review -> Actions Implemented -> Monitoring Effectiveness)
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Success }
 */
router.post('/:id/transition', requireAuth, requireTenant, escalationsController.transition.bind(escalationsController));
/**
 * @openapi
 * /api/v1/escalations/{id}/reopen:
 *   post:
 *     tags: [Escalations]
 *     summary: Reopen a closed/monitoring escalation with a reason
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Success }
 */
router.post('/:id/reopen', requireAuth, requireTenant, escalationsController.reopen.bind(escalationsController));
/**
 * @openapi
 * /api/v1/escalations/{id}/closure-review:
 *   post:
 *     tags: [Escalations]
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
router.post('/:id/closure-review', requireAuth, requireTenant, closureController.closeEscalation.bind(closureController));

export default router;
