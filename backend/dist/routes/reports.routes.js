"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reports_controller_1 = require("../controllers/reports.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const tenant_middleware_1 = require("../middleware/tenant.middleware");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /api/v1/reports/request:
 *   post:
 *     tags:
 *       - Reports
 *     summary: POST /api/v1/reports/request
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/request', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, reports_controller_1.reportsController.request.bind(reports_controller_1.reportsController));
/**
 * @openapi
 * /api/v1/reports:
 *   get:
 *     tags:
 *       - Reports
 *     summary: GET /api/v1/reports
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, reports_controller_1.reportsController.findAll.bind(reports_controller_1.reportsController));
/**
 * @openapi
 * /api/v1/reports/{id}:
 *   get:
 *     tags:
 *       - Reports
 *     summary: GET /api/v1/reports/{id}
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
router.get('/:id', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, reports_controller_1.reportsController.findById.bind(reports_controller_1.reportsController));
/**
 * @openapi
 * /api/v1/reports/{id}/download:
 *   get:
 *     tags:
 *       - Reports
 *     summary: GET /api/v1/reports/{id}/download
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
router.get('/:id/download', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, reports_controller_1.reportsController.download.bind(reports_controller_1.reportsController));
exports.default = router;
//# sourceMappingURL=reports.routes.js.map