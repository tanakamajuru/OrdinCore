import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import logger from '../utils/logger';

export class AuthController {
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
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required', errors: [] });
      }
      const result = await authService.login(email, password);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
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
  async logout(req: Request, res: Response) {
    // In a stateless JWT system, logout is handled client-side by deleting the token
    // Optionally persist a token blacklist in Redis
    logger.info(`User ${req.user?.user_id} logged out`);
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
  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required', errors: [] });
      const result = await authService.refreshToken(refreshToken);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
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
  async me(req: Request, res: Response) {
    try {
      const result = await authService.me(req.user!.user_id);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
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
  async changePassword(req: Request, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both passwords required', errors: [] });
      const result = await authService.changePassword(req.user!.user_id, currentPassword, newPassword);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
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
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Email required', errors: [] });
      await authService.resetToDefault(email);
      return res.json({ success: true, message: 'Password reset to default successfully', meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password reset failed';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }
}

export const authController = new AuthController();
