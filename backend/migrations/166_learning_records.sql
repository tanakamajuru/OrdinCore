-- 166: Structured, linked learning records (Evidence/decisions/learning brief, L1-L7).
--
-- Learning capture today is scattered free text (weekly lessons_learnt, incident
-- lessons_learned/learning_shared) with no provenance, state, linked improvement
-- work or progress tracking. This adds ONE additive record that LINKS to an
-- existing source (an effectiveness review, escalation/risk/pattern closure, a
-- weekly review or an incident) rather than a competing module. It carries:
--   - state: whether learning was identified, none identified, or not yet assessed
--   - content: what happened, evidence examined, what was learnt, change needed
--   - provenance: human-authored vs AI-suggested (AI suggestions are never
--     presented as approved human learning) and an explicit approval stamp
--   - a linked improvement action and a progress ladder so recording a lesson is
--     distinguished from implementing and verifying the change.

CREATE TABLE IF NOT EXISTS learning_records (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  house_id         uuid REFERENCES houses(id) ON DELETE SET NULL,   -- null = organisation-wide
  source_type      text NOT NULL CHECK (source_type IN
                     ('EFFECTIVENESS','ESCALATION_CLOSURE','RISK_CLOSURE','PATTERN_CLOSURE','WEEKLY_REVIEW','INCIDENT')),
  source_id        uuid,                                            -- the linked record (nullable for general weekly learning)
  state            text NOT NULL DEFAULT 'IDENTIFIED' CHECK (state IN
                     ('IDENTIFIED','NONE_IDENTIFIED','NOT_YET_ASSESSED')),
  what_happened    text,
  evidence_examined text,
  what_learnt      text,
  change_needed    text,
  no_learning_reason text,                                          -- brief reason when NONE_IDENTIFIED
  linked_action_id uuid REFERENCES risk_actions(id) ON DELETE SET NULL,
  progress         text NOT NULL DEFAULT 'RECORDED' CHECK (progress IN
                     ('RECORDED','CHANGE_IMPLEMENTED','IMPROVEMENT_VERIFIED')),
  owner_id         uuid REFERENCES users(id) ON DELETE SET NULL,    -- owner when NOT_YET_ASSESSED
  review_date      date,                                            -- due date when NOT_YET_ASSESSED
  is_ai_suggested  boolean NOT NULL DEFAULT false,                  -- provenance: AI suggestion vs human learning
  approved_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at      timestamptz,
  author_id        uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at       timestamptz NOT NULL DEFAULT NOW(),
  updated_at       timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_records_source ON learning_records(company_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_scope ON learning_records(company_id, house_id, created_at);
