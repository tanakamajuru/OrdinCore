-- Stage 10D: immutable, append-only effectiveness review evidence.
CREATE TABLE IF NOT EXISTS action_effectiveness_reviews (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES risk_actions(id) ON DELETE RESTRICT,
  outcome TEXT NOT NULL CHECK (outcome IN ('Effective','Partially Effective','Not Effective','Too Early To Assess')),
  intended_outcome TEXT NOT NULL,
  evidence TEXT,
  reviewed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_review_date DATE,
  CHECK (outcome = 'Too Early To Assess' OR LENGTH(TRIM(COALESCE(evidence,''))) >= 20),
  CHECK (outcome <> 'Too Early To Assess' OR next_review_date IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_action_effectiveness_reviews_action
  ON action_effectiveness_reviews(company_id, action_id, reviewed_at DESC);

-- Preserve existing reviews once. Do not invent missing intended outcomes.
INSERT INTO action_effectiveness_reviews
  (id, company_id, action_id, outcome, intended_outcome, evidence, reviewed_by, reviewed_at, next_review_date)
SELECT gen_random_uuid(), ra.company_id, ra.id,
       COALESCE(ra.effectiveness_outcome,
         CASE ra.effectiveness::text WHEN 'Neutral' THEN 'Partially Effective'
           WHEN 'Ineffective' THEN 'Not Effective' ELSE ra.effectiveness::text END),
       COALESCE(NULLIF(TRIM(ra.intended_outcome),''), '[Historical outcome not recorded]'),
       ra.effectiveness_evidence,
       ra.effectiveness_reviewed_by,
       COALESCE(ra.effectiveness_reviewed_at, ra.completed_at, ra.updated_at),
       CASE WHEN ra.effectiveness_outcome='Too Early To Assess' THEN ra.effectiveness_due_at::date ELSE NULL END
  FROM risk_actions ra
 WHERE (ra.effectiveness_outcome IS NOT NULL OR ra.effectiveness IS NOT NULL)
   AND ra.effectiveness_reviewed_by IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM action_effectiveness_reviews aer WHERE aer.company_id=ra.company_id AND aer.action_id=ra.id);

