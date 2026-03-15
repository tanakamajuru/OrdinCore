import { Router } from 'express';
import { notificationsController } from '../controllers/notifications.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * @openapi
 * /api/v1/notifications:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: GET /api/v1/notifications
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', requireAuth, notificationsController.findAll.bind(notificationsController));
/**
 * @openapi
 * /api/v1/notifications/read-all:
 *   patch:
 *     tags:
 *       - Notifications
 *     summary: PATCH /api/v1/notifications/read-all
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.patch('/read-all', requireAuth, notificationsController.markAllRead.bind(notificationsController));
/**
 * @openapi
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     tags:
 *       - Notifications
 *     summary: PATCH /api/v1/notifications/{id}/read
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
router.patch('/:id/read', requireAuth, notificationsController.markRead.bind(notificationsController));
/**
 * @openapi
 * /api/v1/notifications/preferences:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: GET /api/v1/notifications/preferences
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/preferences', requireAuth, notificationsController.getPreferences.bind(notificationsController));
/**
 * @openapi
 * /api/v1/notifications/preferences:
 *   put:
 *     tags:
 *       - Notifications
 *     summary: PUT /api/v1/notifications/preferences
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.put('/preferences', requireAuth, notificationsController.updatePreferences.bind(notificationsController));

export default router;
