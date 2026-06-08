-- Migration 055: Add incident regulatory / reconstruction fields
-- The incidents.repo.ts INSERT and update paths reference these columns, but no
-- prior migration ever created them, so incident creation failed in production with
-- 'column "la_referral" of relation "incidents" does not exist'. All are free-text
-- (CreateIncidentDto types them as optional string, including is_foreseeable).

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS la_referral TEXT,
  ADD COLUMN IF NOT EXISTS cqc_notification TEXT,
  ADD COLUMN IF NOT EXISTS police_reference TEXT,
  ADD COLUMN IF NOT EXISTS other_references TEXT,
  ADD COLUMN IF NOT EXISTS is_foreseeable TEXT,
  ADD COLUMN IF NOT EXISTS risk_factors TEXT,
  ADD COLUMN IF NOT EXISTS preventive_measures TEXT,
  ADD COLUMN IF NOT EXISTS leadership_commentary TEXT;
