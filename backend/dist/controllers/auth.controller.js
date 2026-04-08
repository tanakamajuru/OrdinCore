"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const logger_1 = __importDefault(require("../utils/logger"));
class AuthController {
    /**
     * @swagger
     * /auth/login:
     *   post:
     *     tags: [Auth]
     *     summary: Login with email and password
     *     security: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [email, password]
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *               password:
     *                 type: string
     *     responses:
     *       200:
     *         description: Login successful
     *       401:
     *         description: Invalid credentials
     */
    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ success: false, message: 'Email and password are required', errors: [] });
            }
            const result = await auth_service_1.authService.login(email, password);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed';
            return res.status(401).json({ success: false, message, errors: [] });
        }
    }
    /**
     * @swagger
     * /auth/logout:
     *   post:
     *     tags: [Auth]
     *     summary: Logout current user
     *     responses:
     *       200:
     *         description: Logged out successfully
     */
    async logout(req, res) {
        // In a stateless JWT system, logout is handled client-side by deleting the token
        // Optionally persist a token blacklist in Redis
        logger_1.default.info(`User ${req.user?.user_id} logged out`);
        return res.json({ success: true, data: { message: 'Logged out successfully' }, meta: {} });
    }
    /**
     * @swagger
     * /auth/refresh:
     *   post:
     *     tags: [Auth]
     *     summary: Refresh JWT token
     *     security: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [refreshToken]
     *             properties:
     *               refreshToken:
     *                 type: string
     *     responses:
     *       200:
     *         description: New token issued
     */
    async refresh(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken)
                return res.status(400).json({ success: false, message: 'Refresh token required', errors: [] });
            const result = await auth_service_1.authService.refreshToken(refreshToken);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Token refresh failed';
            return res.status(401).json({ success: false, message, errors: [] });
        }
    }
    /**
     * @swagger
     * /auth/me:
     *   get:
     *     tags: [Auth]
     *     summary: Get current authenticated user
     *     responses:
     *       200:
     *         description: Current user data
     */
    async me(req, res) {
        try {
            const result = await auth_service_1.authService.me(req.user.user_id);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get user';
            return res.status(404).json({ success: false, message, errors: [] });
        }
    }
    /**
     * @swagger
     * /auth/change-password:
     *   post:
     *     tags: [Auth]
     *     summary: Change current user password
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [currentPassword, newPassword]
     *             properties:
     *               currentPassword:
     *                 type: string
     *               newPassword:
     *                 type: string
     *     responses:
     *       200:
     *         description: Password changed
     */
    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword)
                return res.status(400).json({ success: false, message: 'Both passwords required', errors: [] });
            const result = await auth_service_1.authService.changePassword(req.user.user_id, currentPassword, newPassword);
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Password change failed';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    /**
     * @swagger
     * /auth/forgot-password:
     *   post:
     *     tags: [Auth]
     *     summary: Reset password to "default"
     */
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            if (!email)
                return res.status(400).json({ success: false, message: 'Email required', errors: [] });
            await auth_service_1.authService.resetToDefault(email);
            return res.json({ success: true, message: 'Password reset to default successfully', meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Password reset failed';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
    async updateProfile(req, res) {
        try {
            const { first_name, last_name, avatar_url } = req.body;
            const userId = req.user.user_id;
            const result = await auth_service_1.authService.updateProfile(userId, { first_name, last_name, avatar_url });
            return res.json({ success: true, data: result, meta: {} });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update profile';
            return res.status(400).json({ success: false, message, errors: [] });
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
//# sourceMappingURL=auth.controller.js.map