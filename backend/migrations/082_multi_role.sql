-- ============================================================================
-- Migration 082: multi-role — one person (one email) may hold several roles and
-- switch the capacity they act in, without losing attribution or breaking
-- separation of duties.
-- ----------------------------------------------------------------------------
-- users.role stays as the primary/default role (fallback, no breaking change).
-- active_role is what the session currently acts as. user_roles holds the grants.
-- acted_as_role stamps the capacity a governance action was taken in.
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  role        VARCHAR(50) NOT NULL CHECK (role IN
                ('SUPER_ADMIN','ADMIN','REGISTERED_MANAGER','RESPONSIBLE_INDIVIDUAL','DIRECTOR','TEAM_LEADER')),
  granted_by  UUID REFERENCES users(id),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- The role the user is currently acting in (defaults to their primary).
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_role VARCHAR(50);

-- Backfill: every existing user gets exactly one grant = their current role,
-- and active_role = role. Single-role users behave identically to today.
INSERT INTO user_roles (user_id, company_id, role, granted_by)
  SELECT id, company_id, role, id FROM users
  ON CONFLICT (user_id, role) DO NOTHING;
UPDATE users SET active_role = role WHERE active_role IS NULL;

-- Stamp capacity on governance action/decision tables ("who, acting as what").
ALTER TABLE risks              ADD COLUMN IF NOT EXISTS acted_as_role VARCHAR(50);
ALTER TABLE risk_actions       ADD COLUMN IF NOT EXISTS acted_as_role VARCHAR(50);
ALTER TABLE escalation_actions ADD COLUMN IF NOT EXISTS acted_as_role VARCHAR(50);
ALTER TABLE weekly_reviews     ADD COLUMN IF NOT EXISTS acted_as_role VARCHAR(50);

-- Record WHO finalised a weekly review, so validation can be structurally enforced
-- as independent (the finaliser cannot also validate — separation of duties).
ALTER TABLE weekly_reviews     ADD COLUMN IF NOT EXISTS rm_finalised_by UUID REFERENCES users(id);
