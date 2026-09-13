BEGIN;

ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS contract_version TEXT NOT NULL DEFAULT 'report-snapshot-v1';
ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS integrity_payload JSONB;
ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS source_cutoff_at TIMESTAMPTZ;

-- Existing snapshots pre-date the complete payload hash and remain explicitly legacy.
UPDATE report_snapshots
SET contract_version='legacy-pre-v1'
WHERE integrity_payload IS NULL AND contract_version='report-snapshot-v1';

CREATE INDEX IF NOT EXISTS idx_report_snapshots_integrity
  ON report_snapshots(company_id, contract_version, created_at DESC);

COMMIT;
