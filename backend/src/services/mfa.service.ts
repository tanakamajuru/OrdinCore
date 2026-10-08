/**
 * mfa.service.ts — TOTP multi-factor authentication (DSPT 4.5.x).
 *
 * Secrets are encrypted at rest (AES-256-GCM); recovery codes are stored hashed (SHA-256 of a
 * high-entropy random code) and are single-use. Enrolment is two-step: generate (pending, not yet
 * enabled) then confirm with a valid code (enables + issues recovery codes). Login verification
 * accepts a TOTP code or an unused recovery code.
 */
import crypto from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { query } from '../config/database';

const ISSUER = 'OrdinCore';

// Roles for which MFA is mandatory regardless of the company setting.
export const MFA_MANDATORY_ROLES = ['ADMIN', 'SUPER_ADMIN', 'REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'];

function encKey(): Buffer {
  // A dedicated key is strongly preferred; fall back to the JWT secret so MFA still functions if the
  // dedicated key is not set (documented in .env.example). Either way the stored secret is encrypted.
  const material = process.env.MFA_ENCRYPTION_KEY || process.env.JWT_SECRET || 'ordincore-mfa-fallback-key';
  return crypto.createHash('sha256').update(material).digest();
}

function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

function decrypt(blob: string): string {
  const [ivB, tagB, dataB] = blob.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKey(), Buffer.from(ivB, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB, 'base64')), decipher.final()]).toString('utf8');
}

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export const mfaService = {
  mandatoryForRole(role: string): boolean {
    return MFA_MANDATORY_ROLES.includes(String(role || '').toUpperCase().replace(/-/g, '_'));
  },

  // Must the user enrol before they can use the app? (privileged role, or company requires it.)
  enrolmentRequired(role: string, companyMfaRequired: boolean, mfaEnabled: boolean): boolean {
    if (mfaEnabled) return false;
    return this.mandatoryForRole(role) || !!companyMfaRequired;
  },

  // Step 1 — generate a pending secret and the QR to scan. Does NOT enable MFA yet.
  async beginEnrolment(userId: string, companyId: string, email: string) {
    const secret = authenticator.generateSecret(); // base32
    await query(
      `UPDATE users SET mfa_secret_enc = $1 WHERE id = $2 AND company_id = $3`,
      [encrypt(secret), userId, companyId],
    );
    const otpauth = authenticator.keyuri(email, ISSUER, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    return { otpauthUrl: otpauth, qrDataUrl, manualKey: secret };
  },

  // Step 2 — confirm a code against the pending secret; on success, enable MFA and issue recovery codes.
  async confirmEnrolment(userId: string, companyId: string, code: string): Promise<{ recoveryCodes: string[] }> {
    const row = (await query(`SELECT mfa_secret_enc FROM users WHERE id=$1 AND company_id=$2`, [userId, companyId])).rows[0];
    if (!row?.mfa_secret_enc) throw new Error('Start MFA setup first.');
    const secret = decrypt(row.mfa_secret_enc);
    if (!authenticator.verify({ token: String(code || '').replace(/\s/g, ''), secret })) {
      throw new Error('That code is not valid. Check your authenticator app and try again.');
    }
    // Fresh recovery codes (replace any existing), stored hashed; returned once in plaintext.
    const codes = Array.from({ length: 10 }, () => crypto.randomBytes(5).toString('hex').toUpperCase().replace(/(.{5})(.{5})/, '$1-$2'));
    await query(`DELETE FROM mfa_recovery_codes WHERE user_id=$1`, [userId]);
    for (const c of codes) {
      await query(`INSERT INTO mfa_recovery_codes (id, company_id, user_id, code_hash) VALUES (uuid_generate_v4(), $1, $2, $3)`, [companyId, userId, sha256(c)]);
    }
    await query(`UPDATE users SET mfa_enabled = true, mfa_enrolled_at = NOW() WHERE id=$1 AND company_id=$2`, [userId, companyId]);
    return { recoveryCodes: codes };
  },

  // Verify a TOTP code OR consume an unused recovery code. Returns true on success.
  async verify(userId: string, companyId: string, code: string): Promise<boolean> {
    const clean = String(code || '').replace(/\s/g, '');
    const row = (await query(`SELECT mfa_secret_enc, mfa_enabled FROM users WHERE id=$1 AND company_id=$2`, [userId, companyId])).rows[0];
    if (!row?.mfa_enabled || !row?.mfa_secret_enc) return false;
    // TOTP
    try {
      if (authenticator.verify({ token: clean, secret: decrypt(row.mfa_secret_enc) })) return true;
    } catch { /* fall through to recovery code */ }
    // Recovery code (single use)
    const rc = (await query(
      `UPDATE mfa_recovery_codes SET used_at = NOW()
        WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL RETURNING id`,
      [userId, sha256(clean.toUpperCase())],
    ));
    return (rc.rowCount || 0) > 0;
  },

  async status(userId: string, companyId: string) {
    const row = (await query(`SELECT mfa_enabled, mfa_enrolled_at FROM users WHERE id=$1 AND company_id=$2`, [userId, companyId])).rows[0];
    const remaining = (await query(`SELECT COUNT(*)::int AS n FROM mfa_recovery_codes WHERE user_id=$1 AND used_at IS NULL`, [userId])).rows[0]?.n || 0;
    return { enabled: !!row?.mfa_enabled, enrolledAt: row?.mfa_enrolled_at || null, recoveryCodesRemaining: remaining };
  },

  // Disable MFA (used by an admin reset or a self-disable where policy allows).
  async disable(userId: string, companyId: string) {
    await query(`UPDATE users SET mfa_enabled=false, mfa_secret_enc=NULL, mfa_enrolled_at=NULL WHERE id=$1 AND company_id=$2`, [userId, companyId]);
    await query(`DELETE FROM mfa_recovery_codes WHERE user_id=$1`, [userId]);
  },
};
