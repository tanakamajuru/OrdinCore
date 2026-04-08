"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_controller_1 = require("../controllers/users.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const tenant_middleware_1 = require("../middleware/tenant.middleware");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /api/v1/users/search:
 *   get:
 *     tags:
 *       - Users
 *     summary: GET /api/v1/users/search
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/search', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, users_controller_1.usersController.search.bind(users_controller_1.usersController));
/**
 * @openapi
 * /api/v1/users:
 *   post:
 *     tags:
 *       - Users
 *     summary: POST /api/v1/users
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), users_controller_1.usersController.create.bind(users_controller_1.usersController));
/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: GET /api/v1/users
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, users_controller_1.usersController.findAll.bind(users_controller_1.usersController));
/**
 * @openapi
 * /api/v1/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: GET /api/v1/users/{id}
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
router.get('/:id', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, users_controller_1.usersController.findById.bind(users_controller_1.usersController));
/**
 * @openapi
 * /api/v1/users/{id}:
 *   patch:
 *     tags:
 *       - Users
 *     summary: PATCH /api/v1/users/{id}
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
router.patch('/:id', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), users_controller_1.usersController.update.bind(users_controller_1.usersController));
router.patch('/:id/password', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), users_controller_1.usersController.resetPassword.bind(users_controller_1.usersController));
/**
 * @openapi
 * /api/v1/users/{id}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: DELETE /api/v1/users/{id}
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
router.delete('/:id', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), users_controller_1.usersController.delete.bind(users_controller_1.usersController));
/**
 * @openapi
 * /api/v1/users/{id}/assign-house:
 *   post:
 *     tags:
 *       - Users
 *     summary: POST /api/v1/users/{id}/assign-house
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
router.post('/:id/assign-house', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), users_controller_1.usersController.assignHouse.bind(users_controller_1.usersController));
/**
 * @openapi
 * /api/v1/users/{id}/houses:
 *   get:
 *     tags:
 *       - Users
 *     summary: GET /api/v1/users/{id}/houses
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
router.get('/:id/houses', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, users_controller_1.usersController.getHouses.bind(users_controller_1.usersController));
/**
 * @openapi
 * /api/v1/users/{id}/permissions:
 *   get:
 *     tags:
 *       - Users
 *     summary: GET /api/v1/users/{id}/permissions
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
router.get('/:id/permissions', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, users_controller_1.usersController.getPermissions.bind(users_controller_1.usersController));
/**
 * @openapi
 * /api/v1/users/{id}/roles:
 *   get:
 *     tags:
 *       - Users
 *     summary: GET /api/v1/users/{id}/roles
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
router.get('/:id/roles', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, users_controller_1.usersController.getRoles.bind(users_controller_1.usersController));
/**
 * @openapi
 * /api/v1/users/{id}/roles:
 *   post:
 *     tags:
 *       - Users
 *     summary: POST /api/v1/users/{id}/roles
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
router.post('/:id/roles', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), users_controller_1.usersController.assignRole.bind(users_controller_1.usersController));
/**
 * @openapi
 * /api/v1/users/{id}/suspend:
 *   patch:
 *     tags:
 *       - Users
 *     summary: PATCH /api/v1/users/{id}/suspend
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
router.patch('/:id/suspend', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), users_controller_1.usersController.suspend.bind(users_controller_1.usersController));
/**
 * @openapi
 * /api/v1/users/{id}/activate:
 *   patch:
 *     tags:
 *       - Users
 *     summary: PATCH /api/v1/users/{id}/activate
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
router.patch('/:id/activate', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, (0, role_middleware_1.requireRole)('SUPER_ADMIN', 'ADMIN'), users_controller_1.usersController.activate.bind(users_controller_1.usersController));
// Extra utility endpoints
/**
 * @openapi
 * /api/v1/users/{id}/sessions:
 *   get:
 *     tags:
 *       - Users
 *     summary: GET /api/v1/users/{id}/sessions
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
router.get('/:id/sessions', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, users_controller_1.usersController.getSessions.bind(users_controller_1.usersController));
/**
 * @openapi
 * /api/v1/users/{id}/sessions:
 *   delete:
 *     tags:
 *       - Users
 *     summary: DELETE /api/v1/users/{id}/sessions
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
router.delete('/:id/sessions', auth_middleware_1.requireAuth, tenant_middleware_1.requireTenant, users_controller_1.usersController.revokeSessions.bind(users_controller_1.usersController));
exports.default = router;
//# sourceMappingURL=users.routes.js.map