-- Password expiry policy: force a change every 45 days.
-- Track the last password change. Existing users are backfilled to NOW() so the policy starts
-- from this deployment (nobody is expired retroactively); the 45-day clock runs from here.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
UPDATE users SET password_changed_at = NOW() WHERE password_changed_at IS NULL;
ALTER TABLE users ALTER COLUMN password_changed_at SET DEFAULT NOW();
