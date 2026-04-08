"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const incidents_controller_1 = require("../controllers/incidents.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const tenant_middleware_1 = require("../middleware/tenant.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const scope_middleware_1 = require("../middleware/scope.middleware");
const router = (0, express_1.Router)();
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
router.get('/categories', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, incidents_controller_1.incidentsController.getCategories.bind(incidents_controller_1.incidentsController));
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
router.post('/categories', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), incidents_controller_1.incidentsController.createCategory.bind(incidents_controller_1.incidentsController));
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
router.post('/', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, scope_middleware_1.requireScope, (0, role_middleware_1.requireRole)('REGISTERED_MANAGER', 'TEAM_LEADER'), incidents_controller_1.incidentsController.create.bind(incidents_controller_1.incidentsController));
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
router.get('/', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, scope_middleware_1.requireScope, incidents_controller_1.incidentsController.findAll.bind(incidents_controller_1.incidentsController));
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
router.get('/:id', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, scope_middleware_1.requireScope, incidents_controller_1.incidentsController.findById.bind(incidents_controller_1.incidentsController));
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
router.patch('/:id', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, scope_middleware_1.requireScope, (0, role_middleware_1.requireRole)('REGISTERED_MANAGER', 'TEAM_LEADER'), incidents_controller_1.incidentsController.update.bind(incidents_controller_1.incidentsController));
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
router.get('/:id/attachments', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, incidents_controller_1.incidentsController.getAttachments.bind(incidents_controller_1.incidentsController));
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
router.post('/:id/attachments', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, incidents_controller_1.incidentsController.addAttachment.bind(incidents_controller_1.incidentsController));
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
router.post('/:id/assign', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), incidents_controller_1.incidentsController.assignIncident.bind(incidents_controller_1.incidentsController));
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
router.patch('/:id/resolve', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), incidents_controller_1.incidentsController.resolveIncident.bind(incidents_controller_1.incidentsController));
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
router.get('/:id/timeline', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, incidents_controller_1.incidentsController.getTimeline.bind(incidents_controller_1.incidentsController));
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
router.get('/:id/governance-timeline', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, incidents_controller_1.incidentsController.getGovernanceTimeline.bind(incidents_controller_1.incidentsController));
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
router.post('/bulk/resolve', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), incidents_controller_1.incidentsController.bulkResolve.bind(incidents_controller_1.incidentsController));
exports.default = router;
//# sourceMappingURL=incidents.routes.js.map