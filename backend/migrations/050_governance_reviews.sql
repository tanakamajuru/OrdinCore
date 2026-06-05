-- Migration 050: Governance reviews
-- Records leadership judgement (RM/Director/RI) against a risk or escalation
-- (spec module 5). Renumbered from spec's 042.

CREATE TABLE IF NOT EXISTS governance_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service_id UUID REFERENCES houses(id),
  risk_id UUID REFERENCES risks(id),
  escalation_id UUID REFERENCES escalations(id),
  review_type TEXT NOT NULL CHECK (review_type IN ('RM_REVIEW', 'DIRECTOR_REVIEW', 'RI_ASSURANCE_REVIEW', 'WEEKLY_REVIEW')),
  reviewed_by UUID NOT NULL REFERENCES users(id),
  review_date TIMESTAMPTZ DEFAULT NOW(),
  what_is_happening TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('Monitor', 'Create Action', 'Escalate', 'Close', 'Reopen')),
  escalation_required BOOLEAN DEFAULT false,
  action_required BOOLEAN DEFAULT false,
  evidence TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_governance_reviews_company ON governance_reviews(company_id, review_date DESC);
CREATE INDEX IF NOT EXISTS idx_governance_reviews_risk ON governance_reviews(risk_id);
CREATE INDEX IF NOT EXISTS idx_governance_reviews_escalation ON governance_reviews(escalation_id);
