-- Migration: 041_refresh_tokens.sql
-- Description: Server-side refresh-token store for rotation, revocation and reuse detection (M-05).
--   Only a hash of each issued refresh token is stored (never the token itself). On use a token is
--   rotated (old row revoked, successor linked via rotated_to); presenting a revoked/rotated token
--   is treated as reuse. Logout, password reset and suspension revoke a user's active tokens.

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   -- the token's jti
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,                         -- sha256 of the signed refresh token
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  rotated_to UUID,                                  -- successor jti after rotation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active ON refresh_tokens(user_id) WHERE revoked_at IS NULL;
