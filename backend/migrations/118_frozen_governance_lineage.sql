BEGIN;

-- Signal: leadership attention is a governance marker, not severity.
ALTER TABLE governance_pulses
  ADD COLUMN IF NOT EXISTS leadership_attention BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS leadership_attention_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS leadership_attention_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS leadership_attention_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_pulses_leadership_attention
  ON governance_pulses(house_id, leadership_attention, entry_date DESC);

-- Daily governance: separate leadership narrative from the operational team brief.
ALTER TABLE daily_governance_log
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS leadership_narrative TEXT,
  ADD COLUMN IF NOT EXISTS team_brief TEXT,
  ADD COLUMN IF NOT EXISTS material_change BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id);

-- Backfill company from house where possible.
UPDATE daily_governance_log dgl
SET company_id = h.company_id
FROM houses h
WHERE dgl.house_id = h.id
  AND dgl.company_id IS NULL;

-- Governance decision lineage.
ALTER TABLE governance_reviews
  ADD COLUMN IF NOT EXISTS daily_governance_log_id UUID REFERENCES daily_governance_log(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pulse_entry_id UUID REFERENCES governance_pulses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cluster_id UUID REFERENCES signal_clusters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_review_id UUID REFERENCES governance_reviews(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decision_owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS intended_outcome TEXT,
  ADD COLUMN IF NOT EXISTS decision_status TEXT NOT NULL DEFAULT 'Open';

ALTER TABLE governance_reviews
  DROP CONSTRAINT IF EXISTS governance_reviews_decision_status_check;
ALTER TABLE governance_reviews
  ADD CONSTRAINT governance_reviews_decision_status_check
  CHECK (decision_status IN ('Open','In Progress','Completed','Monitoring','Superseded','Closed'));

CREATE INDEX IF NOT EXISTS idx_governance_reviews_daily_log ON governance_reviews(daily_governance_log_id);
CREATE INDEX IF NOT EXISTS idx_governance_reviews_pulse ON governance_reviews(pulse_entry_id);
CREATE INDEX IF NOT EXISTS idx_governance_reviews_cluster ON governance_reviews(cluster_id);
CREATE INDEX IF NOT EXISTS idx_governance_reviews_owner_due
  ON governance_reviews(decision_owner_id, due_at)
  WHERE decision_status IN ('Open','In Progress','Monitoring');

-- Link risk actions to the decision and source evidence.
ALTER TABLE risk_actions
  ADD COLUMN IF NOT EXISTS governance_review_id UUID REFERENCES governance_reviews(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_pulse_id UUID REFERENCES governance_pulses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_cluster_id UUID REFERENCES signal_clusters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS intended_outcome TEXT,
  ADD COLUMN IF NOT EXISTS completion_evidence TEXT;

CREATE INDEX IF NOT EXISTS idx_risk_actions_governance_review ON risk_actions(governance_review_id);
CREATE INDEX IF NOT EXISTS idx_risk_actions_source_pulse ON risk_actions(source_pulse_id);
CREATE INDEX IF NOT EXISTS idx_risk_actions_source_cluster ON risk_actions(source_cluster_id);

-- Link escalations to source evidence and require a return-to-risk review after closure.
ALTER TABLE escalations
  ADD COLUMN IF NOT EXISTS source_pulse_id UUID REFERENCES governance_pulses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_cluster_id UUID REFERENCES signal_clusters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_governance_review_id UUID REFERENCES governance_reviews(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS post_closure_risk_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS post_closure_risk_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS post_closure_risk_reviewed_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_escalations_source_pulse ON escalations(source_pulse_id);
CREATE INDEX IF NOT EXISTS idx_escalations_source_cluster ON escalations(source_cluster_id);
CREATE INDEX IF NOT EXISTS idx_escalations_source_review ON escalations(source_governance_review_id);

-- Existing signal_clusters remains the only pattern object.
ALTER TABLE signal_clusters
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_reviewed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS next_review_date DATE,
  ADD COLUMN IF NOT EXISTS review_outcome TEXT,
  ADD COLUMN IF NOT EXISTS closure_reason TEXT,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES users(id);

ALTER TABLE signal_clusters
  DROP CONSTRAINT IF EXISTS signal_clusters_review_outcome_check;
ALTER TABLE signal_clusters
  ADD CONSTRAINT signal_clusters_review_outcome_check
  CHECK (review_outcome IS NULL OR review_outcome IN (
    'Continue Monitoring','Improving','Stable','Deteriorating','Promote to Risk','Escalate','Close'
  ));

CREATE INDEX IF NOT EXISTS idx_clusters_next_review ON signal_clusters(company_id, next_review_date);

COMMIT;
