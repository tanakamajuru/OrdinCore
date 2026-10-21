-- Signal evaluation recovery (17 Oct v3 findings, decision confirmed 21 Oct 2026): distinguish a
-- signal awaiting pattern/immediate-detection evaluation from one successfully evaluated from one
-- that failed and needs retry. Before this, a failed "pattern-detection" BullMQ job (default
-- attempts=1, no retry/backoff configured) simply vanished -- the signal was left looking
-- identical to one that was evaluated and genuinely found no concern.
--
-- Covers the single 'pattern-detection' queue job (pattern:check), which runs BOTH the immediate
-- safeguarding fast-path (runImmediateDetection) and cluster/pattern formation (evaluateRules) for
-- every domain on the signal -- there is one evaluation unit per signal, not per domain, so status
-- is tracked at the signal (governance_pulses) level.

DO $$ BEGIN
  CREATE TYPE pulse_evaluation_status AS ENUM ('PENDING', 'PROCESSING', 'EVALUATED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE governance_pulses
  ADD COLUMN IF NOT EXISTS evaluation_status pulse_evaluation_status NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS evaluation_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evaluation_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS evaluation_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS evaluation_last_error TEXT;

-- Existing signals predate this tracking entirely -- they were processed under the old fire-and-
-- forget model. Back-fill them as EVALUATED (not PENDING) so the recovery sweep below does not
-- treat the entire historical backlog as newly-failed work on first deploy; only signals genuinely
-- stuck going forward should be swept up.
UPDATE governance_pulses SET evaluation_status = 'EVALUATED', evaluation_completed_at = COALESCE(reviewed_at, created_at, NOW())
 WHERE evaluation_status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_governance_pulses_evaluation_status
  ON governance_pulses (evaluation_status) WHERE evaluation_status <> 'EVALUATED';
