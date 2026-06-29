-- ============================================================================
-- Migration 071: Retain generated reports in-platform (PDF/CSV)
-- ----------------------------------------------------------------------------
-- Reports were generated client-side and only ever landed in the user's Downloads
-- folder — an inspection tool should hold its own evidence trail. This table records
-- every report generated on the server (rendered to PDF or CSV under public/reports),
-- so they appear in a "Saved Reports" list and stay re-openable from OrdinCore —
-- mirroring the existing "Saved Reconstructions" pattern.
-- ============================================================================
CREATE TABLE IF NOT EXISTS generated_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_key    VARCHAR(80) NOT NULL,
  title         TEXT NOT NULL,
  format        VARCHAR(10) NOT NULL CHECK (format IN ('pdf','csv')),
  period_label  TEXT,
  service_name  TEXT,
  file_path     TEXT NOT NULL,          -- filename under backend/public/reports
  size_bytes    INTEGER,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_company ON generated_reports(company_id, created_at DESC);
