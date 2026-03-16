"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const exports_controller_1 = require("../controllers/exports.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const tenant_middleware_1 = require("../middleware/tenant.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
// Require users to have at least MANAGER role to export raw data
const requireExportAccess = (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER');
/**
 * @openapi
 * /api/v1/exports/risks:
 *   get:
 *     tags:
 *       - Exports
 *     summary: GET /api/v1/exports/risks
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/risks', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, requireExportAccess, exports_controller_1.exportsController.exportRisks.bind(exports_controller_1.exportsController));
/**
 * @openapi
 * /api/v1/exports/incidents:
 *   get:
 *     tags:
 *       - Exports
 *     summary: GET /api/v1/exports/incidents
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/incidents', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, requireExportAccess, exports_controller_1.exportsController.exportIncidents.bind(exports_controller_1.exportsController));
/**
 * @openapi
 * /api/v1/exports/governance:
 *   get:
 *     tags:
 *       - Exports
 *     summary: GET /api/v1/exports/governance
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/governance', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, requireExportAccess, exports_controller_1.exportsController.exportGovernance.bind(exports_controller_1.exportsController));
/**
 * @openapi
 * /api/v1/exports/users:
 *   get:
 *     tags:
 *       - Exports
 *     summary: GET /api/v1/exports/users
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/users', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, requireExportAccess, exports_controller_1.exportsController.exportUsers.bind(exports_controller_1.exportsController));
/**
 * @openapi
 * /api/v1/exports/houses:
 *   get:
 *     tags:
 *       - Exports
 *     summary: GET /api/v1/exports/houses
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/houses', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, requireExportAccess, exports_controller_1.exportsController.exportHouses.bind(exports_controller_1.exportsController));
exports.default = router;
//# sourceMappingURL=exports.routes.js.map