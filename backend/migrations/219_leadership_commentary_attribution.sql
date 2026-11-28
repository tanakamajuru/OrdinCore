-- Incident reconstruction brief, finding 02 follow-up: leadership commentary was visible but
-- unattributed -- no record of who wrote it or when. incidents.service.ts update() now stamps
-- these whenever the text changes.
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS leadership_commentary_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS leadership_commentary_at TIMESTAMPTZ;
