import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

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
router.get('/search', requireAuth, requireTenant, usersController.search.bind(usersController));

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
router.post('/', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), usersController.create.bind(usersController));
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
router.get('/', requireAuth, requireTenant, usersController.findAll.bind(usersController));
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
router.get('/:id', requireAuth, requireTenant, usersController.findById.bind(usersController));
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
router.patch('/:id', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), usersController.update.bind(usersController));

router.patch('/:id/password', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), usersController.resetPassword.bind(usersController));
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
router.delete('/:id', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), usersController.delete.bind(usersController));

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
router.post('/:id/assign-house', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'), usersController.assignHouse.bind(usersController));
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
router.get('/:id/houses', requireAuth, requireTenant, usersController.getHouses.bind(usersController));

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
router.get('/:id/permissions', requireAuth, requireTenant, usersController.getPermissions.bind(usersController));
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
router.get('/:id/roles', requireAuth, requireTenant, usersController.getRoles.bind(usersController));
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
router.post('/:id/roles', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), usersController.assignRole.bind(usersController));

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
router.patch('/:id/suspend', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), usersController.suspend.bind(usersController));
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
router.patch('/:id/activate', requireAuth, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), usersController.activate.bind(usersController));

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
router.get('/:id/sessions', requireAuth, requireTenant, usersController.getSessions.bind(usersController));
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
router.delete('/:id/sessions', requireAuth, requireTenant, usersController.revokeSessions.bind(usersController));

export default router;
