import { Router } from 'express';
import { incidentsController } from '../controllers/incidents.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

/**
 * @openapi
 * /api/v1/incidents/categories:
 *   get:
 *     tags:
 *       - Incidents
 *     summary: GET /api/v1/incidents/categories
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/categories', requireAuth, requireTenant, incidentsController.getCategories.bind(incidentsController));
/**
 * @openapi
 * /api/v1/incidents/categories:
 *   post:
 *     tags:
 *       - Incidents
 *     summary: POST /api/v1/incidents/categories
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/categories', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), incidentsController.createCategory.bind(incidentsController));

/**
 * @openapi
 * /api/v1/incidents:
 *   post:
 *     tags:
 *       - Incidents
 *     summary: POST /api/v1/incidents
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/', requireAuth, requireTenant, incidentsController.create.bind(incidentsController));
/**
 * @openapi
 * /api/v1/incidents:
 *   get:
 *     tags:
 *       - Incidents
 *     summary: GET /api/v1/incidents
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', requireAuth, requireTenant, incidentsController.findAll.bind(incidentsController));
/**
 * @openapi
 * /api/v1/incidents/{id}:
 *   get:
 *     tags:
 *       - Incidents
 *     summary: GET /api/v1/incidents/{id}
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
router.get('/:id', requireAuth, requireTenant, incidentsController.findById.bind(incidentsController));
/**
 * @openapi
 * /api/v1/incidents/{id}:
 *   patch:
 *     tags:
 *       - Incidents
 *     summary: PATCH /api/v1/incidents/{id}
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
router.patch('/:id', requireAuth, requireTenant, incidentsController.update.bind(incidentsController));
/**
 * @openapi
 * /api/v1/incidents/{id}:
 *   delete:
 *     tags:
 *       - Incidents
 *     summary: DELETE /api/v1/incidents/{id}
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
router.delete('/:id', requireAuth, requireTenant, incidentsController.delete.bind(incidentsController));

/**
 * @openapi
 * /api/v1/incidents/{id}/attachments:
 *   get:
 *     tags:
 *       - Incidents
 *     summary: GET /api/v1/incidents/{id}/attachments
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
router.get('/:id/attachments', requireAuth, requireTenant, incidentsController.getAttachments.bind(incidentsController));
/**
 * @openapi
 * /api/v1/incidents/{id}/attachments:
 *   post:
 *     tags:
 *       - Incidents
 *     summary: POST /api/v1/incidents/{id}/attachments
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
router.post('/:id/attachments', requireAuth, requireTenant, incidentsController.addAttachment.bind(incidentsController));
/**
 * @openapi
 * /api/v1/incidents/{id}/attachments/{attachmentId}:
 *   delete:
 *     tags:
 *       - Incidents
 *     summary: DELETE /api/v1/incidents/{id}/attachments/{attachmentId}
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
router.delete('/:id/attachments/:attachmentId', requireAuth, requireTenant, incidentsController.removeAttachment.bind(incidentsController));

/**
 * @openapi
 * /api/v1/incidents/{id}/assign:
 *   post:
 *     tags:
 *       - Incidents
 *     summary: POST /api/v1/incidents/{id}/assign
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
router.post('/:id/assign', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), incidentsController.assignIncident.bind(incidentsController));
/**
 * @openapi
 * /api/v1/incidents/{id}/resolve:
 *   patch:
 *     tags:
 *       - Incidents
 *     summary: PATCH /api/v1/incidents/{id}/resolve
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
router.patch('/:id/resolve', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), incidentsController.resolveIncident.bind(incidentsController));
/**
 * @openapi
 * /api/v1/incidents/{id}/timeline:
 *   get:
 *     tags:
 *       - Incidents
 *     summary: GET /api/v1/incidents/{id}/timeline
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
router.get('/:id/timeline', requireAuth, requireTenant, incidentsController.getTimeline.bind(incidentsController));

/**
 * @openapi
 * /api/v1/incidents/{id}/governance-timeline:
 *   get:
 *     tags:
 *       - Incidents
 *     summary: GET /api/v1/incidents/{id}/governance-timeline
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
router.get('/:id/governance-timeline', requireAuth, requireTenant, incidentsController.getGovernanceTimeline.bind(incidentsController));

// Extra utility endpoints
/**
 * @openapi
 * /api/v1/incidents/bulk/resolve:
 *   post:
 *     tags:
 *       - Incidents
 *     summary: POST /api/v1/incidents/bulk/resolve
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/bulk/resolve', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), incidentsController.bulkResolve.bind(incidentsController));

export default router;
