-- 163: Freeze the reconstruction evidence at lock time.
--
-- Reports must publish the EXACT locked reconstruction, not a live re-derivation (doctrine §8.3).
-- Completing a reconstruction now captures the governance timeline/findings/limitations into
-- this snapshot; the report renders the snapshot for completed reconstructions.
ALTER TABLE incident_reconstruction ADD COLUMN IF NOT EXISTS evidence_snapshot jsonb;
ALTER TABLE incident_reconstruction ADD COLUMN IF NOT EXISTS snapshot_at timestamptz;
