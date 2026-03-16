"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const system_controller_1 = require("../controllers/system.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
// Only SUPER_ADMIN can access and manage general system settings and logs
/**
 * @openapi
 * /api/v1/system/settings:
 *   get:
 *     tags:
 *       - System
 *     summary: GET /api/v1/system/settings
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/settings', auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)('SUPER_ADMIN'), system_controller_1.systemController.getSettings.bind(system_controller_1.systemController));
/**
 * @openapi
 * /api/v1/system/settings:
 *   patch:
 *     tags:
 *       - System
 *     summary: PATCH /api/v1/system/settings
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.patch('/settings', auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)('SUPER_ADMIN'), system_controller_1.systemController.updateSettings.bind(system_controller_1.systemController));
/**
 * @openapi
 * /api/v1/system/audit-logs:
 *   get:
 *     tags:
 *       - System
 *     summary: GET /api/v1/system/audit-logs
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/audit-logs', auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)('SUPER_ADMIN'), system_controller_1.systemController.getAuditLogs.bind(system_controller_1.systemController));
/**
 * @openapi
 * /api/v1/system/job-logs:
 *   get:
 *     tags:
 *       - System
 *     summary: GET /api/v1/system/job-logs
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/job-logs', auth_middleware_1.requireAuth, (0, role_middleware_1.requireRole)('SUPER_ADMIN'), system_controller_1.systemController.getJobLogs.bind(system_controller_1.systemController));
exports.default = router;
//# sourceMappingURL=system.routes.js.map