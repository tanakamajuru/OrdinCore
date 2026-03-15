import { Router } from 'express';
import { risksController } from '../controllers/risks.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

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
router.post('/', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER', 'RESPONSIBLE_INDIVIDUAL'), risksController.create.bind(risksController));
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
router.get('/', requireAuth, requireTenant, risksController.findAll.bind(risksController));
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
router.get('/:id', requireAuth, requireTenant, risksController.findById.bind(risksController));
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
router.patch('/:id', requireAuth, requireTenant, risksController.update.bind(risksController));
/**
 * @openapi
 * /api/v1/risks/{id}:
 *   delete:
 *     tags:
 *       - Risks
 *     summary: DELETE /api/v1/risks/{id}
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
router.delete('/:id', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), risksController.delete.bind(risksController));

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
 * /api/v1/risks/{id}/attachments/{attachmentId}:
 *   delete:
 *     tags:
 *       - Risks
 *     summary: DELETE /api/v1/risks/{id}/attachments/{attachmentId}
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.delete('/:id/attachments/:attachmentId', requireAuth, requireTenant, risksController.removeAttachment.bind(risksController));
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
router.patch('/:id/status', requireAuth, requireTenant, risksController.updateStatus.bind(risksController));

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
router.post('/:id/escalate', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), risksController.escalate.bind(risksController));
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

export default router;
