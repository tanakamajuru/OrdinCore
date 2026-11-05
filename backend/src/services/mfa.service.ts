/**
 * mfa.service.ts — email-code second factor (DSPT 4.5.x).
 *
 * Replaces the earlier authenticator-app (TOTP) implementation: no enrolment step, no secret to
 * scan, no recovery codes to lose. A 6-digit code is emailed at login time and must be entered
 * within CODE_TTL_MS (20 minutes). Codes are stored hashed (SHA-256) and are single-use.
 */
import crypto from 'crypto';
import { query } from '../config/database';
import { sendMail } from '../utils/mailer';

// Roles for which the email code is mandatory regardless of the company setting.
export const MFA_MANDATORY_ROLES = ['ADMIN', 'SUPER_ADMIN', 'REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'];

const CODE_TTL_MS = 20 * 60 * 1000; // 20 minutes — matches the login challenge JWT's own expiry

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export const mfaService = {
  mandatoryForRole(role: string): boolean {
    return MFA_MANDATORY_ROLES.includes(String(role || '').toUpperCase().replace(/-/g, '_'));
  },

  // Generate a 6-digit code, store its hash (20-minute expiry), and email it to the user.
  async sendLoginCode(userId: string, companyId: string | null, email: string) {
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    // Invalidate any earlier unused code for this user before issuing a fresh one.
    await query(`DELETE FROM email_otp_codes WHERE user_id = $1 AND used_at IS NULL`, [userId]);
    await query(
      `INSERT INTO email_otp_codes (id, company_id, user_id, code_hash, expires_at) VALUES (uuid_generate_v4(), $1, $2, $3, $4)`,
      [companyId, userId, sha256(code), expiresAt]
    );
    await sendMail({
      to: email,
      subject: 'Your OrdinCore sign-in code',
      text: `Your sign-in verification code is ${code}. It expires in 20 minutes. If you did not try to sign in, you can ignore this email.`,
      html:
        `<p>Your sign-in verification code is:</p>` +
        `<p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>` +
        `<p>It expires in 20 minutes. If you did not try to sign in, you can ignore this email.</p>`,
    });
  },

  // Verify a code against the most recent unused, unexpired one issued for this user.
  async verifyCode(userId: string, code: string): Promise<boolean> {
    const clean = String(code || '').replace(/\s/g, '');
    const r = await query(
      `UPDATE email_otp_codes SET used_at = NOW()
        WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL AND expires_at > NOW()
        RETURNING id`,
      [userId, sha256(clean)]
    );
    return (r.rowCount || 0) > 0;
  },
};
