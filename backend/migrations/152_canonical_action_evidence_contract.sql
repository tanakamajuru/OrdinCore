-- Ordin Core — Canonical Action Evidence Contract
-- Consolidates risk_actions creation/completion evidence. No frozen governance lifecycle change.
BEGIN;

ALTER TABLE risk_actions
  ADD COLUMN IF NOT EXISTS review_requirement VARCHAR(40),
  ADD COLUMN IF NOT EXISTS evidence_contract_version VARCHAR(40),
  ADD COLUMN IF NOT EXISTS evidence_remediated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS evidence_remediated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evidence_remediation_reason TEXT,
  ADD COLUMN IF NOT EXISTS evidence_remediation_source TEXT;

DO $$ BEGIN
  ALTER TABLE risk_actions ADD CONSTRAINT risk_actions_review_requirement_chk
    CHECK (review_requirement IS NULL OR review_requirement IN ('COMPLETION_ONLY','EFFECTIVENESS_REQUIRED'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Historical classification is evidence-based only:
-- an existing effectiveness verdict/review or a pre-existing intended outcome proves the action
-- was being treated as effectiveness-bearing. Everything else remains NULL (legacy unclassified).
UPDATE risk_actions ra
   SET review_requirement='EFFECTIVENESS_REQUIRED',
       evidence_contract_version=COALESCE(evidence_contract_version,'legacy-classified-v1')
 WHERE review_requirement IS NULL
   AND (
     NULLIF(BTRIM(COALESCE(ra.intended_outcome,'')),'') IS NOT NULL
     OR ra.effectiveness_outcome IS NOT NULL
     OR ra.effectiveness IS NOT NULL
     OR EXISTS (SELECT 1 FROM action_effectiveness_reviews aer WHERE aer.company_id=ra.company_id AND aer.action_id=ra.id)
   );

-- Canonical read-side: only explicitly effectiveness-bearing actions create a new effectiveness
-- obligation. Legacy unclassified records are not silently reclassified or given invented evidence.
-- NOTE: the derived columns (canonical_status/is_open/is_completed/requires_effectiveness_review)
-- are listed BEFORE the six new evidence-contract columns and after the original base columns,
-- so the existing view's column names/order are preserved and the six new columns are appended at
-- the end. This keeps CREATE OR REPLACE VIEW valid (base `ra.*` would otherwise insert the new
-- columns ahead of the derived ones and reorder the output, which Postgres rejects — and the view
-- has dependents, so a DROP CASCADE would ripple).
CREATE OR REPLACE VIEW canonical_action_state_v AS
SELECT ra.id, ra.risk_id, ra.company_id, ra.title, ra.description, ra.status, ra.verified_by_rm, ra.verified_at_rm, ra.verified_by_ri, ra.verified_at_ri, ra.verification_notes, ra.assigned_to, ra.due_date, ra.completed_at, ra.created_by, ra.created_at, ra.updated_at, ra.linked_review_id, ra.effectiveness_reviewed_at, ra.effectiveness_reviewed_by, ra.effectiveness_measured_at, ra.effectiveness, ra.calculated_outcome, ra.rm_override_outcome, ra.director_override_outcome, ra.effectiveness_outcome, ra.effectiveness_evidence, ra.effectiveness_due_at, ra.completion_note, ra.completion_outcome, ra.completion_rationale, ra.rm_decision, ra.rm_decision_at, ra.rm_decision_comment, ra.trajectory_updated, ra.acted_as_role, ra.completed_by, ra.escalation_stage, ra.escalation_stage_at, ra.service_user_id, ra.governance_review_id, ra.source_pulse_id, ra.source_cluster_id, ra.intended_outcome, ra.completion_evidence, ra.house_id, ra.escalation_id, ra.governance_domain, ra.source_type, ra.source_id,
       CASE
         WHEN ra.completed_at IS NOT NULL
           OR LOWER(BTRIM(COALESCE(ra.status::text,''))) IN ('complete','completed','closed','resolved') THEN 'COMPLETED'
         WHEN LOWER(BTRIM(COALESCE(ra.status::text,''))) IN ('cancelled','canceled') THEN 'CANCELLED'
         WHEN LOWER(BTRIM(COALESCE(ra.status::text,''))) IN ('in progress','in_progress','ongoing') THEN 'IN_PROGRESS'
         ELSE 'OPEN'
       END AS canonical_status,
       NOT (
         ra.completed_at IS NOT NULL
         OR LOWER(BTRIM(COALESCE(ra.status::text,''))) IN ('complete','completed','closed','resolved','cancelled','canceled')
       ) AS is_open,
       (
         ra.completed_at IS NOT NULL
         OR LOWER(BTRIM(COALESCE(ra.status::text,''))) IN ('complete','completed','closed','resolved')
       ) AS is_completed,
       (
         ra.review_requirement='EFFECTIVENESS_REQUIRED'
         AND (ra.completed_at IS NOT NULL OR LOWER(BTRIM(COALESCE(ra.status::text,''))) IN ('complete','completed','closed','resolved'))
         AND (
           ra.effectiveness_outcome IS NULL
           OR LOWER(BTRIM(COALESCE(ra.effectiveness_outcome::text,''))) = 'too early to assess'
         )
       ) AS requires_effectiveness_review,
       ra.review_requirement, ra.evidence_contract_version, ra.evidence_remediated_at,
       ra.evidence_remediated_by, ra.evidence_remediation_reason, ra.evidence_remediation_source
  FROM risk_actions ra;

-- Retire stale effectiveness obligations for actions that are explicitly completion-only.
UPDATE governance_review_obligations o
   SET status='CANCELLED', updated_at=NOW(),
       completion_note=COALESCE(o.completion_note,'Canonical Action Evidence Contract: completion-only action does not require effectiveness review.')
  FROM risk_actions ra
 WHERE o.company_id=ra.company_id AND o.subject_type='ACTION' AND o.subject_id=ra.id
   AND o.obligation_type='ACTION_EFFECTIVENESS' AND o.status='OPEN'
   AND ra.review_requirement='COMPLETION_ONLY';

-- Reconcile pre-existing scheduler rows against the new explicit action contract.
SELECT * FROM reconcile_canonical_read_side(NULL);

COMMIT;
