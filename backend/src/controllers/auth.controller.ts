import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { mfaService } from '../services/mfa.service';
import { query } from '../config/database';
import logger from '../utils/logger';
import { logSecurityEvent, maskEmail } from '../middleware/rateLimit.middleware';

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
      logSecurityEvent('login.success', req, { email: maskEmail(email) });
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      logSecurityEvent('login.failure', req, { email: maskEmail(req.body?.email) });
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
    // M-05 — actually revoke the refresh token server-side so it can never mint a new access token.
    // Revoke the presented token if supplied; otherwise revoke all of the user's sessions.
    try {
      const { refreshToken } = req.body || {};
      if (refreshToken) await authService.revokeRefreshToken(refreshToken);
      else if (req.user?.user_id) await authService.revokeAllForUser(req.user.user_id);
    } catch { /* best-effort — client still clears its tokens */ }
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
      // Surface the active capacity + grants so the UI renders for the active role and
      // shows the "acting as" switcher only when the user holds more than one role.
      const withRoles = {
        ...(result as any),
        role: req.user!.role,                 // ACTIVE role drives the interface
        active_role: req.user!.role,
        primary_role: req.user!.primary_role,
        granted_roles: req.user!.granted_roles || [req.user!.role],
      };
      return res.json({ success: true, data: withRoles, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get user';
      return res.status(404).json({ success: false, message, errors: [] });
    }
  }

  // "Acting as" switch — change the role the session acts in (must be one of the
  // caller's granted roles). The middleware reads active_role from the DB each
  // request, so the change takes effect immediately on the next request.
  async setActiveRole(req: Request, res: Response) {
    try {
      const { role } = req.body || {};
      if (!role || !(req.user!.granted_roles || []).includes(role)) {
        return res.status(400).json({ success: false, message: 'You do not hold that role.', errors: [] });
      }
      const result = await authService.setActiveRole(req.user!.user_id, role);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to switch role';
      return res.status(400).json({ success: false, message, errors: [] });
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
   *     summary: Request a password reset link by email
   */
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Email required', errors: [] });
      await authService.requestPasswordReset(email);
      // Always respond the same way whether or not the email exists (no enumeration).
      return res.json({
        success: true,
        message: 'If an account exists for that email, a password reset link has been sent.',
        meta: {},
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password reset request failed';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  /**
   * @swagger
   * /auth/reset-password:
   *   post:
   *     tags: [Auth]
   *     summary: Set a new password using a one-time reset token
   */
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ success: false, message: 'Token and new password are required', errors: [] });
      }
      const result = await authService.resetPassword(token, password);
      return res.json({ success: true, data: result, message: result.message, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password reset failed';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const { first_name, last_name, avatar_url } = req.body;
      const userId = req.user!.user_id;
      const result = await authService.updateProfile(userId, { first_name, last_name, avatar_url });
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      return res.status(400).json({ success: false, message, errors: [] });
    }
  }

  // --- MFA (TOTP) ---

  // Second factor of login: exchange the challenge + code for a full session.
  async mfaVerifyLogin(req: Request, res: Response) {
    try {
      const { mfaChallenge, code } = req.body || {};
      if (!mfaChallenge || !code) return res.status(400).json({ success: false, message: 'MFA challenge and code are required.' });
      const result = await authService.verifyMfaLogin(mfaChallenge, code);
      return res.json({ success: true, data: result, meta: {} });
    } catch (err: unknown) {
      return res.status(401).json({ success: false, message: err instanceof Error ? err.message : 'MFA verification failed', errors: [] });
    }
  }

  // Start enrolment — returns the QR/otpauth to scan (does not enable MFA yet).
  async mfaBeginEnrolment(req: Request, res: Response) {
    try {
      const { user_id, company_id, email } = req.user!;
      const data = await mfaService.beginEnrolment(user_id, company_id!, email || '');
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Could not start MFA setup', errors: [] });
    }
  }

  // Confirm enrolment with a code — enables MFA and returns the one-time recovery codes.
  async mfaConfirmEnrolment(req: Request, res: Response) {
    try {
      const { user_id, company_id } = req.user!;
      const { code } = req.body || {};
      const data = await mfaService.confirmEnrolment(user_id, company_id!, code);
      await query(`INSERT INTO audit_logs (id, company_id, user_id, action, resource, resource_id) VALUES (uuid_generate_v4(), $1, $2, 'auth.mfa_enrolled', 'auth', $2)`, [company_id, user_id]).catch(() => {});
      return res.json({ success: true, data, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Could not confirm MFA', errors: [] });
    }
  }

  async mfaStatus(req: Request, res: Response) {
    try {
      const { user_id, company_id, role } = req.user!;
      const data = await mfaService.status(user_id, company_id!);
      return res.json({ success: true, data: { ...data, mandatory: mfaService.mandatoryForRole(role || '') }, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Could not read MFA status', errors: [] });
    }
  }

  // Self-disable — only permitted when MFA is not mandatory for the user's role.
  async mfaDisable(req: Request, res: Response) {
    try {
      const { user_id, company_id, role } = req.user!;
      if (mfaService.mandatoryForRole(role || '')) {
        return res.status(403).json({ success: false, message: 'MFA is mandatory for your role and cannot be disabled.' });
      }
      await mfaService.disable(user_id, company_id!);
      await query(`INSERT INTO audit_logs (id, company_id, user_id, action, resource, resource_id) VALUES (uuid_generate_v4(), $1, $2, 'auth.mfa_disabled', 'auth', $2)`, [company_id, user_id]).catch(() => {});
      return res.json({ success: true, data: { disabled: true }, meta: {} });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Could not disable MFA', errors: [] });
    }
  }
}

export const authController = new AuthController();
