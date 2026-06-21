-- Migration 061: Sector becomes a per-service control (doctrine: a single org can mix
-- Supported Living houses and Domiciliary rounds). Adds houses.sector, backfilled from
-- the company sector so existing services keep their current behaviour. The signal
-- library + pattern thresholds the engine reads are then selected by the SERVICE's sector.
ALTER TABLE houses
  ADD COLUMN IF NOT EXISTS sector VARCHAR(40);

UPDATE houses h
   SET sector = COALESCE(c.sector, 'SUPPORTED_LIVING')
  FROM companies c
 WHERE c.id = h.company_id
   AND h.sector IS NULL;

UPDATE houses SET sector = 'SUPPORTED_LIVING' WHERE sector IS NULL;

ALTER TABLE houses ALTER COLUMN sector SET DEFAULT 'SUPPORTED_LIVING';

CREATE INDEX IF NOT EXISTS idx_houses_sector ON houses(company_id, sector);
