-- Migration 030: Worker Compatibility Alignment
-- 1. Add closed_at to risks for recurrence tracking
ALTER TABLE risks ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- 2. Add risk_domain to risks for matching with signals
ALTER TABLE risks ADD COLUMN IF NOT EXISTS risk_domain TEXT;

-- 3. Backfill risk_domain from category name if possible
UPDATE risks r
SET risk_domain = c.name
FROM risk_categories c
WHERE r.category_id = c.id AND r.risk_domain IS NULL;
