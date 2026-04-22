import { Router } from 'express';
import { risksController } from '../controllers/risks.controller';
import { actionEffectivenessController } from '../controllers/actionEffectiveness.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireScope } from '../middleware/scope.middleware';

const router = Router();

/**
 * @openapi
 * /api/v1/risks/categories:
 *   get:
 *     tags:
 *       - Risks
 *     summary: GET /api/v1/risks/categories
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/categories', requireAuth, requireTenant, risksController.getCategories.bind(risksController));
/**
 * @openapi
 * /api/v1/risks/categories:
 *   post:
 *     tags:
 *       - Risks
 *     summary: POST /api/v1/risks/categories
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/categories', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), risksController.createCategory.bind(risksController));

/**
 * @openapi
 * /api/v1/risks/assigned-to-me:
 *   get:
 *     tags:
 *       - Risks
 *     summary: GET /api/v1/risks/assigned-to-me
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/assigned-to-me', requireAuth, requireTenant, risksController.getAssignedToMe.bind(risksController));

/**
 * @openapi
 * /api/v1/risks:
 *   post:
 *     tags:
 *       - Risks
 *     summary: POST /api/v1/risks
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/', requireAuth, requireTenant, requireScope, requireRole('REGISTERED_MANAGER', 'TEAM_LEADER'), risksController.create.bind(risksController));
/**
 * @openapi
 * /api/v1/risks/promote:
 *   post:
 *     tags:
 *       - Risks
 *     summary: Promote a Signal Cluster to a formal Risk
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Success
 */
router.post('/promote', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER'), risksController.promote.bind(risksController));
/**
 * @openapi
 * /api/v1/risks:
 *   get:
 *     tags:
 *       - Risks
 *     summary: GET /api/v1/risks
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', requireAuth, requireTenant, requireScope, risksController.findAll.bind(risksController));
/**
 * @openapi
 * /api/v1/risks/{id}:
 *   get:
 *     tags:
 *       - Risks
 *     summary: GET /api/v1/risks/{id}
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
router.get('/:id', requireAuth, requireTenant, requireScope, risksController.findById.bind(risksController));
/**
 * @openapi
 * /api/v1/risks/{id}:
 *   patch:
 *     tags:
 *       - Risks
 *     summary: PATCH /api/v1/risks/{id}
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
router.patch('/:id', requireAuth, requireTenant, requireScope, requireRole('REGISTERED_MANAGER', 'TEAM_LEADER'), risksController.update.bind(risksController));


/**
 * @openapi
 * /api/v1/risks/{id}/attachments:
 *   get:
 *     tags:
 *       - Risks
 *     summary: GET /api/v1/risks/{id}/attachments
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
router.get('/:id/attachments', requireAuth, requireTenant, risksController.getAttachments.bind(risksController));
/**
 * @openapi
 * /api/v1/risks/{id}/attachments:
 *   post:
 *     tags:
 *       - Risks
 *     summary: POST /api/v1/risks/{id}/attachments
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
router.post('/:id/attachments', requireAuth, requireTenant, risksController.addAttachment.bind(risksController));

/**
 * @openapi
 * /api/v1/risks/{id}/assign:
 *   post:
 *     tags:
 *       - Risks
 *     summary: POST /api/v1/risks/{id}/assign
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
router.post('/:id/assign', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), risksController.assignRisk.bind(risksController));
/**
 * @openapi
 * /api/v1/risks/{id}/status:
 *   patch:
 *     tags:
 *       - Risks
 *     summary: PATCH /api/v1/risks/{id}/status
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
router.patch('/:id/status', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'TEAM_LEADER'), risksController.updateStatus.bind(risksController));

/**
 * @openapi
 * /api/v1/risks/{id}/event:
 *   post:
 *     tags:
 *       - Risks
 *     summary: POST /api/v1/risks/{id}/event
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
router.post('/:id/event', requireAuth, requireTenant, risksController.addEvent.bind(risksController));
/**
 * @openapi
 * /api/v1/risks/{id}/actions:
 *   get:
 *     tags:
 *       - Risks
 *     summary: GET /api/v1/risks/{id}/actions
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
router.get('/:id/actions', requireAuth, requireTenant, risksController.getActions.bind(risksController));
/**
 * @openapi
 * /api/v1/risks/{id}/action:
 *   post:
 *     tags:
 *       - Risks
 *     summary: POST /api/v1/risks/{id}/action
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
router.post('/:id/action', requireAuth, requireTenant, risksController.addAction.bind(risksController));
/**
 * @openapi
 * /api/v1/risks/{id}/actions/{actionId}/status:
 *   patch:
 *     tags:
 *       - Risks
 *     summary: Update action status
 *     security:
 *       - BearerAuth: []
 */
router.patch('/:id/actions/:actionId/status', requireAuth, requireTenant, risksController.updateActionStatus.bind(risksController));
/**
 * @openapi
 * /api/v1/risks/{id}/actions/{actionId}/verify:
 *   post:
 *     tags:
 *       - Risks
 *     summary: Verify a risk action (RM/RI only)
 *     security:
 *       - BearerAuth: []
 */
router.post('/:id/actions/:actionId/verify', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), risksController.verifyAction.bind(risksController));
/**
 * @openapi
 * /api/v1/risks/{id}/escalate:
 *   post:
 *     tags:
 *       - Risks
 *     summary: POST /api/v1/risks/{id}/escalate
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
router.post('/:id/escalate', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER', 'TEAM_LEADER'), risksController.escalate.bind(risksController));
/**
 * @openapi
 * /api/v1/risks/{id}/timeline:
 *   get:
 *     tags:
 *       - Risks
 *     summary: GET /api/v1/risks/{id}/timeline
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
router.get('/:id/timeline', requireAuth, requireTenant, risksController.getTimeline.bind(risksController));

// Extra utility endpoints
/**
 * @openapi
 * /api/v1/risks/metrics/summary:
 *   get:
 *     tags:
 *       - Risks
 *     summary: GET /api/v1/risks/metrics/summary
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/metrics/summary', requireAuth, requireTenant, risksController.getMetricsSummary.bind(risksController));
/**
 * @openapi
 * /api/v1/risks/bulk/reassign:
 *   patch:
 *     tags:
 *       - Risks
 *     summary: PATCH /api/v1/risks/bulk/reassign
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.patch('/bulk/reassign', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), risksController.bulkReassign.bind(risksController));

// Effectiveness tracking
router.patch('/:id/effectiveness', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER'), actionEffectivenessController.rateEffectiveness.bind(actionEffectivenessController));
router.get('/pending-effectiveness', requireAuth, requireTenant, requireRole('REGISTERED_MANAGER'), actionEffectivenessController.getPending.bind(actionEffectivenessController));

export default router;
