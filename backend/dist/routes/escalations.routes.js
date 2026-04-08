"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const escalations_controller_1 = require("../controllers/escalations.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const tenant_middleware_1 = require("../middleware/tenant.middleware");
const router = (0, express_1.Router)();
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
router.get('/', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, escalations_controller_1.escalationsController.findAll.bind(escalations_controller_1.escalationsController));
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
router.get('/stats', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, escalations_controller_1.escalationsController.getStats.bind(escalations_controller_1.escalationsController));
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
router.get('/:id', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, escalations_controller_1.escalationsController.findById.bind(escalations_controller_1.escalationsController));
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
router.post('/:id/actions', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, escalations_controller_1.escalationsController.addAction.bind(escalations_controller_1.escalationsController));
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
router.get('/:id/actions', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, escalations_controller_1.escalationsController.getActions.bind(escalations_controller_1.escalationsController));
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
router.post('/:id/assign', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, escalations_controller_1.escalationsController.assignEscalation.bind(escalations_controller_1.escalationsController));
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
router.patch('/:id/priority', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, escalations_controller_1.escalationsController.updatePriority.bind(escalations_controller_1.escalationsController));
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
router.post('/:id/resolve', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, escalations_controller_1.escalationsController.resolve.bind(escalations_controller_1.escalationsController));
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
router.post('/:id/acknowledge', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, escalations_controller_1.escalationsController.acknowledge.bind(escalations_controller_1.escalationsController));
exports.default = router;
//# sourceMappingURL=escalations.routes.js.map