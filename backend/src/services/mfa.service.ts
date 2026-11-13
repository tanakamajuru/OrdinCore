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

// Matches the OrdinCore login screens' branding (shield mark, navy/blue, same tagline).
const otpEmailHtml = (code: string) => `
<div style="background:#eef2f7;padding:32px 16px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:40px 36px;border:1px solid #e2e8f0">
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle">
          <img src="https://ordincore.co.uk/logo.png" width="40" height="40" alt="Ordin Core" style="display:block;border:0" />
        </td>
        <td style="vertical-align:middle;padding-left:10px">
          <span style="font-size:22px;font-weight:700;color:#0e2c52">Ordin<span style="color:#2F6CB5">Core</span></span>
        </td>
      </tr>
    </table>
    <div style="height:1px;background:#2F6CB5;margin:20px 0 28px"></div>
    <h1 style="font-size:24px;font-weight:800;color:#0e2c52;margin:0 0 10px">Your sign-in code</h1>
    <p style="font-size:14px;color:#475569;margin:0 0 20px">Enter this code to sign in to Ordin Core.</p>
    <div style="background:#dbeafe;border-radius:10px;padding:20px 22px;margin:0 0 20px">
      <p style="font-size:12px;font-weight:700;color:#0e2c52;margin:0 0 8px">Your verification code</p>
      <p style="font-size:34px;font-weight:800;letter-spacing:8px;color:#0e2c52;margin:0">${code}</p>
    </div>
    <p style="font-size:13px;color:#475569;margin:0 0 8px">This code expires in 20 minutes.</p>
    <p style="font-size:13px;color:#475569;margin:0">Do not share this code with anyone. Ordin Core will never ask you to send us your sign-in code.</p>
    <div style="height:1px;background:#e2e8f0;margin:24px 0"></div>
    <h2 style="font-size:15px;font-weight:700;color:#0e2c52;margin:0 0 6px">Didn't request this?</h2>
    <p style="font-size:13px;color:#475569;margin:0 0 20px">You can ignore this email. Do not share or enter the code.</p>
    <p style="font-size:14px;font-weight:700;color:#0e2c52;margin:0 0 2px">Ordin Core</p>
    <p style="font-size:13px;color:#64748b;margin:0 0 14px">Governance infrastructure for care providers.</p>
    <p style="font-size:11px;color:#94a3b8;margin:0">This is an automated email. Please do not reply.</p>
  </div>
</div>`;

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
      subject: 'Your sign-in code',
      text: `Your verification code is ${code}. It expires in 20 minutes. If you did not request this, you can ignore this email.`,
      html: otpEmailHtml(code),
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
