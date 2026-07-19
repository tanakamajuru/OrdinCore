-- Migration 104: version history for a signal's observation note.
-- A Team Leader can update the note they logged. Rather than overwrite, each edit is kept
-- as a version (who edited it, when), so the RM's Observation Details shows the current note
-- on top with the previous versions preserved (and greyed) beneath — a full trail.
CREATE TABLE IF NOT EXISTS governance_pulse_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pulse_id UUID NOT NULL REFERENCES governance_pulses(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  edited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pulse_notes_pulse ON governance_pulse_notes(pulse_id, created_at DESC);

-- Seed each existing signal's current observation as its first version.
INSERT INTO governance_pulse_notes (pulse_id, company_id, note, edited_by, created_at)
SELECT gp.id, gp.company_id, gp.description, gp.created_by, gp.created_at
  FROM governance_pulses gp
 WHERE gp.description IS NOT NULL AND TRIM(gp.description) <> '';
