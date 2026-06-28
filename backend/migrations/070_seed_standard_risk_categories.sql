-- ============================================================================
-- Migration 070: Seed the standard risk categories (KEYSTONE — unblocks promotion)
-- ----------------------------------------------------------------------------
-- The Risk Promotion form requires a category, but only "Service Delivery" (049)
-- was ever seeded — so the dropdown was empty, the Register button could never
-- enable, and NO cluster could become a risk. Because every downstream screen
-- (Actions, Effectiveness, Oversight tabs, Director rollups, Reports) depends on
-- a risk existing, the whole chain was starved.
--
-- Seed the full set for every company, sourced FROM governance_domains so the
-- category names exactly match the engine's risk_domain values — the promotion
-- form then auto-selects the matching category for a cluster.
-- ============================================================================
INSERT INTO risk_categories (id, company_id, name, description, color)
SELECT uuid_generate_v4(), c.id, d.name, d.description, '#ef4444'
FROM companies c
CROSS JOIN (
  SELECT DISTINCT ON (LOWER(name)) name, description
  FROM governance_domains
  ORDER BY LOWER(name), name
) d
WHERE NOT EXISTS (
  SELECT 1 FROM risk_categories rc
  WHERE rc.company_id = c.id AND LOWER(rc.name) = LOWER(d.name)
);
