"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const risks_controller_1 = require("../controllers/risks.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const tenant_middleware_1 = require("../middleware/tenant.middleware");
const scope_middleware_1 = require("../middleware/scope.middleware");
const router = (0, express_1.Router)();
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
router.get('/categories', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, risks_controller_1.risksController.getCategories.bind(risks_controller_1.risksController));
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
router.post('/categories', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), risks_controller_1.risksController.createCategory.bind(risks_controller_1.risksController));
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
router.get('/assigned-to-me', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, risks_controller_1.risksController.getAssignedToMe.bind(risks_controller_1.risksController));
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
router.post('/', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, scope_middleware_1.requireScope, (0, role_middleware_1.requireRole)('REGISTERED_MANAGER', 'TEAM_LEADER'), risks_controller_1.risksController.create.bind(risks_controller_1.risksController));
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
router.get('/', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, scope_middleware_1.requireScope, risks_controller_1.risksController.findAll.bind(risks_controller_1.risksController));
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
router.get('/:id', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, scope_middleware_1.requireScope, risks_controller_1.risksController.findById.bind(risks_controller_1.risksController));
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
router.patch('/:id', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, scope_middleware_1.requireScope, (0, role_middleware_1.requireRole)('REGISTERED_MANAGER', 'TEAM_LEADER'), risks_controller_1.risksController.update.bind(risks_controller_1.risksController));
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
router.get('/:id/attachments', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, risks_controller_1.risksController.getAttachments.bind(risks_controller_1.risksController));
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
router.post('/:id/attachments', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, risks_controller_1.risksController.addAttachment.bind(risks_controller_1.risksController));
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
router.post('/:id/assign', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), risks_controller_1.risksController.assignRisk.bind(risks_controller_1.risksController));
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
router.patch('/:id/status', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('REGISTERED_MANAGER', 'TEAM_LEADER'), risks_controller_1.risksController.updateStatus.bind(risks_controller_1.risksController));
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
router.post('/:id/event', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, risks_controller_1.risksController.addEvent.bind(risks_controller_1.risksController));
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
router.get('/:id/actions', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, risks_controller_1.risksController.getActions.bind(risks_controller_1.risksController));
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
router.post('/:id/action', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, risks_controller_1.risksController.addAction.bind(risks_controller_1.risksController));
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
router.post('/:id/escalate', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER', 'TEAM_LEADER'), risks_controller_1.risksController.escalate.bind(risks_controller_1.risksController));
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
router.get('/:id/timeline', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, risks_controller_1.risksController.getTimeline.bind(risks_controller_1.risksController));
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
router.get('/metrics/summary', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, risks_controller_1.risksController.getMetricsSummary.bind(risks_controller_1.risksController));
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
router.patch('/bulk/reassign', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), risks_controller_1.risksController.bulkReassign.bind(risks_controller_1.risksController));
exports.default = router;
//# sourceMappingURL=risks.routes.js.map