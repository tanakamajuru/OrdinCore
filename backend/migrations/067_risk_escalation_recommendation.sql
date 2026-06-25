-- 067: Auto-escalation should FLAG, not LOCK, a fresh High/Critical risk.
-- Previously a High/Critical risk was escalated (and thus locked) the instant it
-- was created, before the RM could shape it. Instead we now record a non-blocking
-- "escalation recommended" flag and notify; the RM confirms to actually escalate.

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS escalation_recommended        BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS escalation_recommended_reason TEXT,
  ADD COLUMN IF NOT EXISTS escalation_recommended_at     TIMESTAMPTZ;
