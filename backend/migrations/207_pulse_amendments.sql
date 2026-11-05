-- Migration 207: substantive-amendment pathway for a signal's material facts, distinct from
-- pulse_typing_corrections (migration 205, non-substantive text only).
--
-- Nov 2026 brief ("Monitored signals: history access and typing corrections", §4): a change to
-- person/service, incident date/time, severity or category changes meaning and must go through a
-- recorded amendment with reassessment, never through the typing-correction pathway. Append-only:
-- the earlier value, new value, field, reason, actor and timestamp are kept together and never
-- overwritten, so "what changed and why" is always reconstructable alongside the original
-- signed-off decision.
CREATE TABLE IF NOT EXISTS pulse_amendments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pulse_id UUID NOT NULL REFERENCES governance_pulses(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  original_value TEXT,
  new_value TEXT,
  reason TEXT NOT NULL,
  amended_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pulse_amendments_pulse ON pulse_amendments(pulse_id, created_at DESC);
