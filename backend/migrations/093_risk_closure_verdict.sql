-- 093_risk_closure_verdict.sql
-- Finding B — evidence-gated closure verdict + explicit recurrence window.
-- Additive. resolved_at / closed_at / reopened_at already exist.

BEGIN;

ALTER TABLE risks ADD COLUMN IF NOT EXISTS resolution_outcome      TEXT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS resolution_reason       TEXT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS resolved_by             UUID;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS recurrence_window_until TIMESTAMPTZ;

COMMIT;

-- resolution_outcome ∈ {Resolved — controls effective, Resolved — no longer applicable,
-- Tolerated — risk accepted}. "controls effective" is refused unless a control on the
-- risk was actually rated effective (enforced in risks.service.closeRisk). The
-- recurrence window (default 60 days) is read by recurrenceWatch.worker.
