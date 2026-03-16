"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roles_controller_1 = require("../controllers/roles.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const tenant_middleware_1 = require("../middleware/tenant.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
// Only SUPER_ADMIN and ADMIN can manage roles
/**
 * @openapi
 * /api/v1/roles:
 *   get:
 *     tags:
 *       - Roles
 *     summary: GET /api/v1/roles
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), roles_controller_1.rolesController.findAll.bind(roles_controller_1.rolesController));
/**
 * @openapi
 * /api/v1/roles:
 *   post:
 *     tags:
 *       - Roles
 *     summary: POST /api/v1/roles
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), roles_controller_1.rolesController.createRole.bind(roles_controller_1.rolesController));
/**
 * @openapi
 * /api/v1/roles/{id}/permissions:
 *   get:
 *     tags:
 *       - Roles
 *     summary: GET /api/v1/roles/{id}/permissions
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
router.get('/:id/permissions', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), roles_controller_1.rolesController.getRolePermissions.bind(roles_controller_1.rolesController));
/**
 * @openapi
 * /api/v1/roles/{id}/permissions:
 *   post:
 *     tags:
 *       - Roles
 *     summary: POST /api/v1/roles/{id}/permissions
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
router.post('/:id/permissions', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), roles_controller_1.rolesController.addRolePermission.bind(roles_controller_1.rolesController));
/**
 * @openapi
 * /api/v1/roles/{id}/permissions/{permissionId}:
 *   delete:
 *     tags:
 *       - Roles
 *     summary: DELETE /api/v1/roles/{id}/permissions/{permissionId}
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: permissionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.delete('/:id/permissions/:permissionId', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), roles_controller_1.rolesController.removeRolePermission.bind(roles_controller_1.rolesController));
exports.default = router;
//# sourceMappingURL=roles.routes.js.map