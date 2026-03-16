-- Migration 010: Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL CHECK (type IN (
    'risk_summary', 'incident_report', 'governance_compliance',
    'escalation_report', 'analytics_export', 'house_overview', 'custom', 'reconstruction_report'
  )),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  generated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  file_url TEXT,
  file_size INTEGER,
  parameters JSONB DEFAULT '{}',
  error_message TEXT,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_company_id ON reports(company_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_generated_by ON reports(generated_by);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

CREATE TABLE report_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  report_type VARCHAR(100) NOT NULL,
  parameters JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'queued',
  job_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE report_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  format VARCHAR(20) DEFAULT 'pdf' CHECK (format IN ('pdf', 'csv', 'xlsx', 'json')),
  file_url TEXT NOT NULL,
  downloaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  downloaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE report_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cache_key VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, cache_key)
);

CREATE INDEX idx_report_cache_company_cache ON report_cache(company_id, cache_key);
CREATE INDEX idx_report_cache_expires ON report_cache(expires_at);
