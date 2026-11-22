-- Migration 214: Reconstruction reporting fixes (21 Nov 2026 dev brief).
-- Issue 01: the PDF export needs the selected "From date" snapshotted alongside incident_date
-- so a locked record's reporting period is the actual selected scope, not a shortcut derived
-- from timeline rows (which never carried a `date`/`created_at` field in the first place --
-- the real field is event_time; see reconstruction.controller.ts downloadLockedPdf).
ALTER TABLE governance_reconstructions ADD COLUMN IF NOT EXISTS from_date DATE;

-- Issue 02: recommendations were only ever folded into the auto-drafted narrative prose and
-- governance_outputs JSON; the brief requires them as a distinct, separately-labelled field
-- on the locked record itself (trajectory/contributing_factors/control_failure/lessons_learned
-- already have their own columns -- recommendations did not).
ALTER TABLE governance_reconstructions ADD COLUMN IF NOT EXISTS recommendations JSONB NOT NULL DEFAULT '[]';

-- Issue 03: a Draft row with evidence that genuinely never saved must be distinguishable from one
-- where the combined save failed outright. last_save_error records the latter so a human can see
-- it rather than the record silently looking like an ordinary unfinished draft.
ALTER TABLE governance_reconstructions ADD COLUMN IF NOT EXISTS last_save_error TEXT;

-- Issue 04: "viewed" must be a real, per-user, persisted flag (not localStorage) so it survives
-- refresh and re-sign-in, and is independent between users looking at the same locked record.
CREATE TABLE IF NOT EXISTS governance_reconstruction_views (
  reconstruction_id UUID NOT NULL REFERENCES governance_reconstructions(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (reconstruction_id, user_id)
);
