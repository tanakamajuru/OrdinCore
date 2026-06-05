-- Migration 048: Strategic risk fields
-- Reframes the risk register as a Strategic Risk layer (spec module 3).
-- (Renumbered from spec's 040.)

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS strategic_theme TEXT,
  ADD COLUMN IF NOT EXISTS trend TEXT DEFAULT 'Stable',
  ADD COLUMN IF NOT EXISTS trend_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS services_affected_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS clients_affected_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS days_open INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_governance_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closure_eligible BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reopened_count INTEGER DEFAULT 0;

-- Seed strategic_theme from existing title/category where not set so the
-- strategic dashboards have a value to group by immediately.
UPDATE risks SET strategic_theme = title WHERE strategic_theme IS NULL AND title IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_risks_strategic_theme ON risks(company_id, strategic_theme);
CREATE INDEX IF NOT EXISTS idx_risks_trend ON risks(company_id, trend);
