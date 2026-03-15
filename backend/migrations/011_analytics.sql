-- Migration 011: Analytics
CREATE TABLE trend_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  house_id UUID REFERENCES houses(id) ON DELETE SET NULL,
  metric_type VARCHAR(100) NOT NULL,
  metric_value NUMERIC(10,4) NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trend_metrics_company_id ON trend_metrics(company_id);
CREATE INDEX idx_trend_metrics_metric_type ON trend_metrics(metric_type);
CREATE INDEX idx_trend_metrics_period ON trend_metrics(period_start, period_end);

CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_risks INTEGER DEFAULT 0,
  open_risks INTEGER DEFAULT 0,
  resolved_risks INTEGER DEFAULT 0,
  critical_risks INTEGER DEFAULT 0,
  total_incidents INTEGER DEFAULT 0,
  open_incidents INTEGER DEFAULT 0,
  governance_compliance_rate NUMERIC(5,2) DEFAULT 0,
  total_escalations INTEGER DEFAULT 0,
  resolved_escalations INTEGER DEFAULT 0,
  house_count INTEGER DEFAULT 0,
  user_count INTEGER DEFAULT 0,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, snapshot_date)
);

CREATE INDEX idx_analytics_snapshots_company_id ON analytics_snapshots(company_id);
CREATE INDEX idx_analytics_snapshots_date ON analytics_snapshots(snapshot_date DESC);
