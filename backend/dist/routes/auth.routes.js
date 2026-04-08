"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login with email and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: superadmin@caresignal.com
 *               password:
 *                 type: string
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', auth_controller_1.authController.login.bind(auth_controller_1.authController));
/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: POST /api/v1/auth/logout
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/logout', auth_middleware_1.requireAuth, auth_controller_1.authController.logout.bind(auth_controller_1.authController));
/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     tags:
 *       - Auth
 *     summary: POST /api/v1/auth/refresh
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/refresh', auth_controller_1.authController.refresh.bind(auth_controller_1.authController));
/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: GET /api/v1/auth/me
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/me', auth_middleware_1.requireAuth, auth_controller_1.authController.me.bind(auth_controller_1.authController));
/**
 * @openapi
 * /api/v1/auth/change-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: POST /api/v1/auth/change-password
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/change-password', auth_middleware_1.requireAuth, auth_controller_1.authController.changePassword.bind(auth_controller_1.authController));
router.patch('/profile', auth_middleware_1.requireAuth, auth_controller_1.authController.updateProfile.bind(auth_controller_1.authController));
router.post('/forgot-password', auth_controller_1.authController.forgotPassword.bind(auth_controller_1.authController));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map