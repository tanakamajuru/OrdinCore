-- Migration 051: Closure reviews
-- Evidence-based closure decisions for risks/escalations (spec module 8).
-- Renumbered from spec's 043.

CREATE TABLE IF NOT EXISTS closure_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  risk_id UUID REFERENCES risks(id),
  escalation_id UUID REFERENCES escalations(id),
  reviewed_by UUID NOT NULL REFERENCES users(id),
  pattern_reduced BOOLEAN NOT NULL,
  actions_completed BOOLEAN NOT NULL,
  effectiveness_reviewed BOOLEAN NOT NULL,
  further_escalation_required BOOLEAN NOT NULL,
  closure_decision TEXT NOT NULL CHECK (closure_decision IN ('Close', 'Keep Monitoring', 'Reopen', 'Escalate')),
  evidence TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_closure_reviews_risk ON closure_reviews(risk_id);
CREATE INDEX IF NOT EXISTS idx_closure_reviews_escalation ON closure_reviews(escalation_id);
