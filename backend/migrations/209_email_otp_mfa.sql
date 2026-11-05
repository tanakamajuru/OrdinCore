-- Migration 209: replace authenticator-app (TOTP) MFA with an emailed one-time code.
-- Additive for the new table; drops the TOTP-only artifacts that are no longer read by any code
-- path (mfa_secret_enc, mfa_recovery_codes). users.mfa_enabled / mfa_enrolled_at are KEPT — now
-- repurposed to mean "has completed the email code at least once" (used by admin dashboards).
BEGIN;

CREATE TABLE IF NOT EXISTS email_otp_codes (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  uuid REFERENCES companies(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_otp_codes_user ON email_otp_codes(user_id);

DROP TABLE IF EXISTS mfa_recovery_codes;
ALTER TABLE users DROP COLUMN IF EXISTS mfa_secret_enc;

COMMIT;
