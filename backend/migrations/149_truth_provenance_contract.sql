-- Ordin Core Stage 11: truth/provenance contract.
-- Presentation/read-side hardening only. No frozen lifecycle, role or decision semantics change.
BEGIN;

ALTER TABLE daily_governance_log
  ADD COLUMN IF NOT EXISTS evidence_snapshot JSONB;

CREATE OR REPLACE VIEW canonical_signal_evidence_v AS
SELECT gp.id AS signal_id, gp.company_id, gp.house_id, gp.related_person,
       gp.risk_domain, gp.signal_type, gp.description, gp.severity,
       gp.review_status, gp.entry_date, gp.created_at,
       'SIGNAL'::text AS evidence_type,
       'governance_pulses'::text AS provenance_table
  FROM governance_pulses gp;

COMMENT ON VIEW canonical_signal_evidence_v IS
'Only rows originating in governance_pulses are signals. Actions, effectiveness reviews, leadership decisions, trajectory events, escalations and risk reviews are downstream governance evidence and must never increment signal counts.';

COMMIT;
