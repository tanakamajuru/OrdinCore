-- ============================================================================
-- Migration 072: allow specific users (e.g. a senior Team Leader) to view
-- signals across ALL sites — a read-scope widening only.
-- ----------------------------------------------------------------------------
-- By default a Team Leader sees only the house(s) they're assigned to (via
-- user_houses). This adds an explicit, per-user, admin-granted override so a
-- nominated Team Leader can see signals for every site — without changing their
-- role, promote rights, or decision ownership. Directors / RIs / Super Admins
-- already see all houses; this brings the same read capability to an individual
-- user under deliberate, audited admin control.
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS can_view_all_houses BOOLEAN NOT NULL DEFAULT FALSE;

-- Record who granted it and when, for auditability (CQC: who changed access, when).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS view_all_houses_granted_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS view_all_houses_granted_at TIMESTAMPTZ;

COMMENT ON COLUMN users.can_view_all_houses IS
  'When TRUE, this user''s signal/dashboard scope resolves to ALL company houses, regardless of user_houses assignment. Admin-granted override (typically for a senior Team Leader). Read-only widening of scope; does not change role or permissions.';
