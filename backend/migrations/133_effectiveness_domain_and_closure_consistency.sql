BEGIN;

-- Preserve an explicit domain on actions which do not yet have a risk or pattern link.
ALTER TABLE risk_actions ADD COLUMN IF NOT EXISTS governance_domain TEXT;

-- Backfill deterministically from the strongest available canonical source. Never overwrite
-- a domain already recorded on the action and never invent a domain where lineage is absent.
UPDATE risk_actions ra
SET governance_domain = COALESCE(
  (SELECT COALESCE(NULLIF(TRIM(r.risk_domain), ''), NULLIF(TRIM(r.strategic_theme), ''))
     FROM risks r WHERE r.id = ra.risk_id AND r.company_id = ra.company_id),
  (SELECT NULLIF(TRIM(sc.risk_domain), '')
     FROM signal_clusters sc WHERE sc.id = ra.source_cluster_id AND sc.company_id = ra.company_id),
  (SELECT COALESCE(NULLIF(TRIM(gp.governance_domain), ''), NULLIF(TRIM((gp.risk_domain)[1]), ''))
     FROM governance_pulses gp WHERE gp.id = ra.source_pulse_id AND gp.company_id = ra.company_id)
)
WHERE NULLIF(TRIM(ra.governance_domain), '') IS NULL;

CREATE INDEX IF NOT EXISTS idx_risk_actions_company_governance_domain
  ON risk_actions(company_id, governance_domain);

COMMIT;
