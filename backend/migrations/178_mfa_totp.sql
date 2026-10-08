-- TOTP multi-factor authentication (DSPT item 4.5.x). Additive: a user with mfa_enabled=false logs
-- in exactly as before, so this cannot break existing authentication.
BEGIN;

-- users.mfa_enabled already exists. Add the (encrypted) secret and enrolment timestamp.
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret_enc text;       -- AES-256-GCM, never plaintext
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enrolled_at timestamptz;

-- One-time recovery codes, stored HASHED (never plaintext). Shown to the user once at enrolment.
CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   text NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_user ON mfa_recovery_codes(user_id);

COMMIT;
