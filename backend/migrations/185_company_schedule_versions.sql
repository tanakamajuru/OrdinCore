-- Effective-dated weekly governance review schedule (Provider Admin recommendations §3).
--
-- Problem: the weekly review day/time lived only as current values on `companies`, and every
-- period/deadline was recomputed from those current values. Changing the schedule therefore
-- moved the due dates of EXISTING and current periods — "future periods only" was wording, not
-- a guarantee.
--
-- Fix: keep an append-only history of schedule versions, each effective from a date. The schedule
-- in force for any given day is the latest version whose effective_from <= that day. A change is
-- recorded as a NEW version effective from a future period start, so established periods and their
-- due dates are preserved and the change applies only going forward.
--
-- The `companies` columns remain as a fallback for any company that has no version row yet (e.g.
-- created after this migration), so period calculations never return empty.

CREATE TABLE IF NOT EXISTS company_schedule_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  review_dow INTEGER NOT NULL CHECK (review_dow BETWEEN 0 AND 6),
  review_time TIME NOT NULL DEFAULT '09:00',
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  effective_from DATE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Resolve "latest version effective on or before a date" quickly.
CREATE INDEX IF NOT EXISTS idx_company_schedule_versions_lookup
  ON company_schedule_versions (company_id, effective_from DESC);

-- One version per (company, effective_from) — re-saving the same effective date replaces intent
-- rather than stacking duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS uq_company_schedule_versions_date
  ON company_schedule_versions (company_id, effective_from);

-- Seed each existing company's CURRENT schedule as a version effective from the distant past, so
-- all existing and current periods resolve to exactly today's schedule (no behaviour change on
-- deploy). Future changes are added as new, future-effective versions by the application.
INSERT INTO company_schedule_versions (company_id, review_dow, review_time, timezone, effective_from, reason)
SELECT c.id,
       COALESCE(c.weekly_governance_review_dow, 1),
       COALESCE(c.weekly_governance_review_time, '09:00'::time),
       COALESCE(NULLIF(c.governance_timezone, ''), 'Europe/London'),
       DATE '2000-01-01',
       'Initial schedule (migrated from company settings)'
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM company_schedule_versions v WHERE v.company_id = c.id)
ON CONFLICT (company_id, effective_from) DO NOTHING;
