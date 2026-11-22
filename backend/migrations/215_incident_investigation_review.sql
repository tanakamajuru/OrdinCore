-- Migration 215: Serious Incident workflow (22 Nov 2026 brief).
-- "Start Investigation" (Open -> In Progress) created no Review Incident item in the
-- Registered Manager's My Work. guidedWork.service.ts derives the review item directly from
-- the incident's own status (no new obligation schema -- see that file for the query), but it
-- needs a stable timestamp to anchor a sensible default due date: incidents.updated_at is
-- bumped by every later edit (an attachment, a note, a re-assignment), which would silently
-- drift the review's due date each time. investigation_started_at is stamped once, the first
-- time an incident moves into 'In Progress', and never again.
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS investigation_started_at TIMESTAMPTZ;
