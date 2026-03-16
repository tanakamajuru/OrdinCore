"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notifications_controller_1 = require("../controllers/notifications.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
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
router.get('/', auth_middleware_1.requireAuth, notifications_controller_1.notificationsController.findAll.bind(notifications_controller_1.notificationsController));
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
router.patch('/read-all', auth_middleware_1.requireAuth, notifications_controller_1.notificationsController.markAllRead.bind(notifications_controller_1.notificationsController));
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
router.patch('/:id/read', auth_middleware_1.requireAuth, notifications_controller_1.notificationsController.markRead.bind(notifications_controller_1.notificationsController));
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
router.get('/preferences', auth_middleware_1.requireAuth, notifications_controller_1.notificationsController.getPreferences.bind(notifications_controller_1.notificationsController));
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
router.put('/preferences', auth_middleware_1.requireAuth, notifications_controller_1.notificationsController.updatePreferences.bind(notifications_controller_1.notificationsController));
exports.default = router;
//# sourceMappingURL=notifications.routes.js.map