-- ============================================================================
-- Migration 083: store the report payload so Saved Reports can be regenerated at
-- download time — no dependence on a local file that a restart can wipe.
-- ----------------------------------------------------------------------------
-- The "Could not download" red error happened when the row existed in
-- generated_reports but the PDF/CSV was no longer on disk. Storing the data + the
-- narrative lets us render the document fresh on every download (option 1 in the
-- builder report — robust for a single-tenant deploy).
-- ============================================================================

ALTER TABLE generated_reports
  ADD COLUMN IF NOT EXISTS data      JSONB,
  ADD COLUMN IF NOT EXISTS narrative TEXT;
