-- Migration 210: typing-error corrections for a recorded governance decision, mirroring migration
-- 205's pulse_typing_corrections. A decision's own text (what was decided, or why) can carry a
-- spelling/punctuation mistake same as a signal can -- this gives the same lighter, explicitly-
-- reasoned, append-only correction pathway for it. The decision itself (its type, status, owner,
-- due date, and every downstream record it created) is never touched -- only its free text.
CREATE TABLE IF NOT EXISTS governance_review_typing_corrections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES governance_reviews(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  original_text TEXT NOT NULL,
  corrected_text TEXT NOT NULL,
  reason TEXT NOT NULL,
  corrected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  client_correction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_governance_review_typing_corrections_review ON governance_review_typing_corrections(review_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_governance_review_typing_corrections_client_id
  ON governance_review_typing_corrections(review_id, client_correction_id) WHERE client_correction_id IS NOT NULL;
