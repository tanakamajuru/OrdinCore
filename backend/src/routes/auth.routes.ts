import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

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
router.post('/login', authController.login.bind(authController));
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
router.post('/logout', requireAuth, authController.logout.bind(authController));
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
router.post('/refresh', authController.refresh.bind(authController));
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
router.get('/me', requireAuth, authController.me.bind(authController));
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
router.post('/change-password', requireAuth, authController.changePassword.bind(authController));

export default router;
