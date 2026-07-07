-- 095_domain_framework_reference.sql
-- Finding J (framework transition) — anchor each domain on one of the 5 CQC key questions
-- and keep a configurable Quality Statement reference alongside the legacy KLOE codes, so
-- the provider can map to Quality Statements now and re-map to the new 24 KLOEs (~end 2026)
-- without a code change. Additive; reports fall back to kloe_* when these are empty.

BEGIN;

ALTER TABLE governance_domains ADD COLUMN IF NOT EXISTS key_question      TEXT; -- Safe | Effective | Caring | Responsive | Well-led
ALTER TABLE governance_domains ADD COLUMN IF NOT EXISTS quality_statement TEXT;

COMMIT;
