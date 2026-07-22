-- 110_risk_recurrence_lineage.sql
-- Recurrence continuity: when a pattern that was previously closed reaches the promotion
-- threshold again, the new risk must not start from a blank page. It is linked back to the
-- closed risk it descends from, so the register can show one continuous story rather than a
-- series of unrelated entries — and the inspector can see that this concern has returned.
--
-- Doctrine: closure is never deletion. A closed risk stays in the register (Closed Oversight)
-- as the evidential record; recurrence adds a new chapter that cites it.

BEGIN;

ALTER TABLE risks ADD COLUMN IF NOT EXISTS previous_risk_id UUID REFERENCES risks(id) ON DELETE SET NULL;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS recurrence_count INT NOT NULL DEFAULT 0;

-- Lineage is walked backwards from the newest chapter, so index the child side.
CREATE INDEX IF NOT EXISTS idx_risks_previous_risk ON risks(previous_risk_id) WHERE previous_risk_id IS NOT NULL;

-- Finding the prior closed chapter is a lookup by tenant + domain + status.
CREATE INDEX IF NOT EXISTS idx_risks_domain_status ON risks(company_id, risk_domain, status);

COMMIT;

-- recurrence_count = 0 for a first occurrence, 1 for the first return, and so on. It is the
-- figure leadership reads as "this has come back N times despite closure" — a stronger
-- governance signal than the risk's own severity.
