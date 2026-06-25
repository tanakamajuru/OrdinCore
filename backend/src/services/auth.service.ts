import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { usersRepo } from '../repositories/users.repo';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { governanceService } from './governance.service';
import { sendMail } from '../utils/mailer';

// One-time password-reset tokens are valid for this long.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const hashToken = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-fallback';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export class AuthService {
  private validatePassword(password: string) {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      throw new Error('Password must contain at least one letter and one number');
    }
  }

  async login(email: string, password: string) {
    const user = await usersRepo.findByEmail(email);
    if (!user) throw new Error('Invalid credentials');
    if (user.status !== 'active') throw new Error('Account is inactive or suspended');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new Error('Invalid credentials');

    // Block access when the organisation itself has been deactivated/suspended/archived.
    // (SUPER_ADMIN has no company_id and is exempt.)
    if (user.company_id) {
      const compRes = await query('SELECT status FROM companies WHERE id = $1', [user.company_id]);
      const compStatus = compRes.rows[0]?.status;
      if (compStatus && compStatus !== 'active') {
        throw new Error('Your organisation account has been suspended. Please contact your administrator.');
      }
    }

    // Update last login
    await usersRepo.update(user.id, { last_login: new Date() });

    // Trigger pulse generation on login
    const houseRoles = ['REGISTERED_MANAGER', 'RM', 'TEAM_LEADER', 'TL'];
    if (user.company_id) {
      const houseId = user.assigned_house_id;
      if (houseRoles.includes(user.role.toUpperCase()) && houseId) {
        // Targeted generation for the user's house
        void governanceService.generateMissingPulses(user.company_id, houseId, user.id).catch(err => {
          console.error(`Failed to generate pulses for house ${houseId}:`, err);
        });
      } else {
        // General generation for the company
        void governanceService.generateMissingPulses(user.company_id).catch(err => {
          console.error('Failed to generate missing pulses on login:', err);
        });
      }
    }

    const profile = await query('SELECT * FROM user_profiles WHERE user_id = $1', [user.id]);
    const assignedHouses = await usersRepo.getHouses(user.id);
    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    const { password_hash, ...safeUser } = user;
    void password_hash;
    return { 
      token, 
      refreshToken, 
      user: {
        ...safeUser,
        profile: profile.rows[0] || null,
        assigned_house_ids: assignedHouses.map(h => h.id),
        assigned_house_id: assignedHouses.length > 0 ? assignedHouses[0].id : (user.assigned_house_id || null)
      } 
    };
  }

  async me(userId: string) {
    const user = await usersRepo.findById(userId);
    if (!user) throw new Error('User not found');
    
    let company_name = null;
    if (user.company_id) {
      const comp = await query('SELECT name FROM companies WHERE id = $1', [user.company_id]);
      company_name = comp.rows[0]?.name || null;
    }

    const profile = await query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
    const assignedHouses = await usersRepo.getHouses(userId);
    const { password_hash, ...safeUser } = user;
    void password_hash;
    return { 
      ...safeUser, 
      company_name, 
      profile: profile.rows[0] || null,
      assigned_house_id: user.assigned_house_id,
      assigned_house_name: user.assigned_house_name,
      assigned_house_ids: assignedHouses.map(h => h.id)
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await usersRepo.findById(userId);
    if (!user) throw new Error('User not found');

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw new Error('Current password is incorrect');

    this.validatePassword(newPassword);
    const hash = await bcrypt.hash(newPassword, 12);
    await usersRepo.update(userId, { password_hash: hash });
    return { message: 'Password changed successfully' };
  }

  /**
   * Step 1 of password reset: issue a random one-time token and email a reset link.
   *
   * Security notes:
   *  - We always return success regardless of whether the email exists, to avoid
   *    leaking which addresses are registered (account-enumeration protection).
   *  - Only the SHA-256 hash of the token is stored; the raw token lives only in
   *    the emailed link. A token is single-use and expires after RESET_TOKEN_TTL_MS.
   */
  async requestPasswordReset(email: string) {
    const user = await usersRepo.findByEmail(email);
    if (!user) return; // silent no-op — do not reveal non-existent accounts

    // Invalidate any outstanding tokens for this user.
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await query(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), user.id, hashToken(rawToken), expiresAt]
    );

    const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetLink = `${appUrl}/reset-password?token=${rawToken}`;
    const name = user.first_name || 'there';

    await sendMail({
      to: user.email,
      subject: 'Reset your OrdinCore password',
      text:
        `Hi ${name},\n\n` +
        `We received a request to reset your OrdinCore password. ` +
        `Use the link below within the next hour to set a new password:\n\n${resetLink}\n\n` +
        `If you didn't request this, you can safely ignore this email — your password will not change.`,
      html:
        `<p>Hi ${name},</p>` +
        `<p>We received a request to reset your OrdinCore password. ` +
        `Click the button below within the next hour to set a new password:</p>` +
        `<p><a href="${resetLink}" style="display:inline-block;padding:10px 18px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px">Reset password</a></p>` +
        `<p>Or paste this link into your browser:<br><a href="${resetLink}">${resetLink}</a></p>` +
        `<p>If you didn't request this, you can safely ignore this email — your password will not change.</p>`,
    });
  }

  /**
   * Step 2 of password reset: consume a valid one-time token and set a new password.
   */
  async resetPassword(rawToken: string, newPassword: string) {
    if (!rawToken) throw new Error('Reset token is required');
    this.validatePassword(newPassword);

    const tokenRes = await query(
      `SELECT id, user_id, expires_at, used_at
         FROM password_reset_tokens
        WHERE token_hash = $1`,
      [hashToken(rawToken)]
    );
    const row = tokenRes.rows[0];
    if (!row || row.used_at || new Date(row.expires_at) < new Date()) {
      throw new Error('This password reset link is invalid or has expired. Please request a new one.');
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await usersRepo.update(row.user_id, { password_hash: hash } as any);
    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [row.id]);

    return { message: 'Password reset successfully. You can now sign in with your new password.' };
  }

  async refreshToken(token: string) {
    let payload: { user_id: string };
    try {
      payload = jwt.verify(token, JWT_REFRESH_SECRET) as { user_id: string };
    } catch {
      throw new Error('Invalid or expired refresh token');
    }
    const user = await usersRepo.findById(payload.user_id);
    if (!user) throw new Error('User not found');
    if (user.status !== 'active') throw new Error('Account is inactive or suspended');
    const newToken = this.generateToken(user);
    return { token: newToken };
  }

  generateToken(user: { id: string; company_id: string | null; role: string; email: string }) {
    return jwt.sign(
      { user_id: user.id, company_id: user.company_id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );
  }

  generateRefreshToken(user: { id: string }) {
    return jwt.sign({ user_id: user.id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);
  }

  async logAudit(company_id: string | null, user_id: string, action: string, resource: string, resource_id?: string) {
    await query(
      `INSERT INTO audit_logs (id, company_id, user_id, action, resource, resource_id) VALUES ($1,$2,$3,$4,$5,$6)`,
      [uuidv4(), company_id, user_id, action, resource, resource_id || null]
    );
  }

  async updateProfile(userId: string, data: { first_name?: string; last_name?: string; avatar_url?: string }) {
    if (data.first_name || data.last_name) {
      await usersRepo.update(userId, { 
        first_name: data.first_name, 
        last_name: data.last_name 
      } as any);
    }
    if (data.avatar_url !== undefined) {
      await query(
        `INSERT INTO user_profiles (user_id, avatar_url) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET avatar_url = $2, updated_at = NOW()`,
        [userId, data.avatar_url]
      );
    }
    return this.me(userId);
  }
}

export const authService = new AuthService();
