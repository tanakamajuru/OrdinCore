-- Migration 121: frozen-governance follow-ups.
--  1) First-class reconstruction learning (was folded into the narrative).
--  2) Mirror the active governance themes into risk_categories so the Risk Promotion
--     category dropdown matches the 26-theme taxonomy (migration 070 pre-dated it).
-- Additive and idempotent.

BEGIN;

-- 1) Reconstruction: store lessons learned and the derived Governance Outputs directly.
ALTER TABLE governance_reconstructions
  ADD COLUMN IF NOT EXISTS lessons_learned TEXT,
  ADD COLUMN IF NOT EXISTS governance_outputs JSONB;

-- 2) Seed the current ACTIVE themes as risk categories for every company (name-matched,
--    skipping any that already exist). Sources from governance_domains so category names
--    line up with the engine's risk_domain values and the promotion form auto-selects.
INSERT INTO risk_categories (id, company_id, name, description, color)
SELECT uuid_generate_v4(), c.id, d.name, d.description, '#ef4444'
FROM companies c
CROSS JOIN (
  SELECT DISTINCT ON (LOWER(name)) name, description
  FROM governance_domains
  WHERE is_active = true
  ORDER BY LOWER(name), name
) d
WHERE NOT EXISTS (
  SELECT 1 FROM risk_categories rc
  WHERE rc.company_id = c.id AND LOWER(rc.name) = LOWER(d.name)
);

COMMIT;
