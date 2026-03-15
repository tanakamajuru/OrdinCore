import { Router } from 'express';
import { rolesController } from '../controllers/roles.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

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
router.get('/', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), rolesController.findAll.bind(rolesController));
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
router.post('/', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), rolesController.createRole.bind(rolesController));

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
router.get('/:id/permissions', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), rolesController.getRolePermissions.bind(rolesController));
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
router.post('/:id/permissions', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), rolesController.addRolePermission.bind(rolesController));
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
router.delete('/:id/permissions/:permissionId', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), rolesController.removeRolePermission.bind(rolesController));

export default router;
