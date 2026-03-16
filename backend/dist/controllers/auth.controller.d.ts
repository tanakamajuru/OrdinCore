import { Request, Response } from 'express';
export declare class AuthController {
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
    login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
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
    logout(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
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
    refresh(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
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
    me(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
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
    changePassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const authController: AuthController;
//# sourceMappingURL=auth.controller.d.ts.map