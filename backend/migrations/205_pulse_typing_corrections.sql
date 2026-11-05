-- Migration 205: typing-error corrections for a signal, distinct from a substantive edit.
--
-- "Edit note" (governance_pulse_notes, migration 104) replaces the observation text outright --
-- appropriate for a substantive update, but it carries no reason and no "non-substantive" signal.
-- This table is the lighter, explicitly-reasoned, append-only pathway for spelling/punctuation/
-- grammar fixes that do not change meaning (Nov 2026 brief: "Monitored signals: history access
-- and typing corrections"). The original text, corrected text, field, reason, actor and server
-- timestamp are kept together and never overwritten; the signal keeps its identity, counts and
-- workflow state untouched.
CREATE TABLE IF NOT EXISTS pulse_typing_corrections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pulse_id UUID NOT NULL REFERENCES governance_pulses(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  original_text TEXT NOT NULL,
  corrected_text TEXT NOT NULL,
  reason TEXT NOT NULL,
  corrected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Idempotency key supplied by the client: a dropped-connection retry of the same attempt
  -- must land once, not duplicate the correction event.
  client_correction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pulse_typing_corrections_pulse ON pulse_typing_corrections(pulse_id, created_at DESC);
-- One retry of the same client-generated attempt must resolve to the same row, not a new one.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pulse_typing_corrections_client_id
  ON pulse_typing_corrections(pulse_id, client_correction_id) WHERE client_correction_id IS NOT NULL;
