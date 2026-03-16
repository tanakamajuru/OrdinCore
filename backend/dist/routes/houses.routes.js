"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const houses_controller_1 = require("../controllers/houses.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const tenant_middleware_1 = require("../middleware/tenant.middleware");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /api/v1/houses:
 *   post:
 *     tags:
 *       - Houses
 *     summary: POST /api/v1/houses
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), houses_controller_1.housesController.create.bind(houses_controller_1.housesController));
/**
 * @openapi
 * /api/v1/houses:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, houses_controller_1.housesController.findAll.bind(houses_controller_1.housesController));
/**
 * @openapi
 * /api/v1/houses/{id}:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses/{id}
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
router.get('/:id', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, houses_controller_1.housesController.findById.bind(houses_controller_1.housesController));
/**
 * @openapi
 * /api/v1/houses/{id}:
 *   patch:
 *     tags:
 *       - Houses
 *     summary: PATCH /api/v1/houses/{id}
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
router.patch('/:id', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), houses_controller_1.housesController.update.bind(houses_controller_1.housesController));
/**
 * @openapi
 * /api/v1/houses/{id}:
 *   delete:
 *     tags:
 *       - Houses
 *     summary: DELETE /api/v1/houses/{id}
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
router.delete('/:id', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), houses_controller_1.housesController.delete.bind(houses_controller_1.housesController));
/**
 * @openapi
 * /api/v1/houses/{id}/staff:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses/{id}/staff
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
router.get('/:id/staff', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, houses_controller_1.housesController.getStaff.bind(houses_controller_1.housesController));
/**
 * @openapi
 * /api/v1/houses/{id}/staff:
 *   post:
 *     tags:
 *       - Houses
 *     summary: POST /api/v1/houses/{id}/staff
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
router.post('/:id/staff', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), houses_controller_1.housesController.assignStaff.bind(houses_controller_1.housesController));
/**
 * @openapi
 * /api/v1/houses/{id}/staff/{userId}:
 *   delete:
 *     tags:
 *       - Houses
 *     summary: DELETE /api/v1/houses/{id}/staff/{userId}
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.delete('/:id/staff/:userId', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), houses_controller_1.housesController.removeStaff.bind(houses_controller_1.housesController));
/**
 * @openapi
 * /api/v1/houses/{id}/settings:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses/{id}/settings
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
router.get('/:id/settings', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, houses_controller_1.housesController.getSettings.bind(houses_controller_1.housesController));
/**
 * @openapi
 * /api/v1/houses/{id}/settings:
 *   patch:
 *     tags:
 *       - Houses
 *     summary: PATCH /api/v1/houses/{id}/settings
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
router.patch('/:id/settings', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), houses_controller_1.housesController.updateSettings.bind(houses_controller_1.housesController));
/**
 * @openapi
 * /api/v1/houses/{id}/risks:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses/{id}/risks
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
router.get('/:id/risks', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, houses_controller_1.housesController.getRisks.bind(houses_controller_1.housesController));
/**
 * @openapi
 * /api/v1/houses/{id}/incidents:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses/{id}/incidents
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
router.get('/:id/incidents', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, houses_controller_1.housesController.getIncidents.bind(houses_controller_1.housesController));
/**
 * @openapi
 * /api/v1/houses/{id}/governance-pulses:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses/{id}/governance-pulses
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
router.get('/:id/governance-pulses', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, houses_controller_1.housesController.getGovernancePulses.bind(houses_controller_1.housesController));
// Extra utility endpoints
/**
 * @openapi
 * /api/v1/houses/metrics/overview:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses/metrics/overview
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/metrics/overview', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, houses_controller_1.housesController.getMetricsOverview.bind(houses_controller_1.housesController));
/**
 * @openapi
 * /api/v1/houses/locations/map:
 *   get:
 *     tags:
 *       - Houses
 *     summary: GET /api/v1/houses/locations/map
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/locations/map', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, houses_controller_1.housesController.getMapLocations.bind(houses_controller_1.housesController));
exports.default = router;
//# sourceMappingURL=houses.routes.js.map