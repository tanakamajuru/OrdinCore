-- Migration 216: Serious Incident workflow, Steps 3-4 (22 Nov 2026 brief).
-- "Start Investigation" previously surfaced a purely status-derived "Review Incident" item in
-- My Work (guidedWork.service.ts, migration 215) -- it had no named owner distinct from whoever
-- clicked the button, no due date a manager actually set, no assignment history, and no way to
-- record findings/decision/outcome against it. This table is the real, assignable review: one
-- row per review ROUND for an incident (version increments when a completed review spawns a
-- follow-up round), with a status lifecycle (Assigned -> Completed) and an explicit is_waiting
-- flag the reviewer sets themselves (never inferred).
--
-- Frozen-snapshot-at-lock-time doctrine (same shape as governance_reconstructions/
-- provider_review_signoffs): THIS row is both the working draft and, once status='Completed',
-- the immutable record -- the service layer rejects further writes to a completed row, so a
-- later PDF download always reflects exactly what was true at completion time, never a live
-- recompute. "Versioned" means each review round for an incident is its own row (version 1, 2, ...),
-- not a second table of snapshots.
CREATE TABLE IF NOT EXISTS incident_reviews (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  incident_id                   UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  version                       INT NOT NULL DEFAULT 1,
  status                        VARCHAR(20) NOT NULL DEFAULT 'Assigned'
                                   CHECK (status IN ('Assigned', 'Completed')),

  -- Current owner + the due date the assigning manager set (distinct from the incident's own
  -- investigation_started_at/updated_at, which drift on unrelated edits).
  assigned_to                   UUID REFERENCES users(id),
  assigned_by                   UUID REFERENCES users(id),
  assigned_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at                        TIMESTAMPTZ,

  -- Reviewer-declared "Waiting" state (brief: "the reviewer explicitly marks it as such, not an
  -- automatic state") -- never set by any automated check.
  is_waiting                    BOOLEAN NOT NULL DEFAULT FALSE,
  waiting_reason                TEXT,
  waiting_since                 TIMESTAMPTZ,

  -- Findings captured by the reviewer (brief Step 3: "facts, impact, warning signs, contributing
  -- factors, evidence gaps, timeliness, response, and effectiveness").
  facts                         TEXT,
  impact                        TEXT,
  warning_signs                 TEXT,
  contributing_factors          TEXT,
  evidence_gaps                 TEXT,
  timeliness_notes              TEXT,
  response_evaluation           TEXT,
  effectiveness_notes           TEXT,
  -- Where effectiveness is still unknown: what evidence is needed and when to check it.
  effectiveness_evidence_needed TEXT,
  effectiveness_recheck_at      TIMESTAMPTZ,

  external_reference_notes      TEXT,
  -- Set via POST /incident-reviews/:id/link-learning after creating the record through the
  -- existing learning.service.ts create() flow (source_type 'INCIDENT') -- this table never
  -- duplicates that creation logic.
  learning_record_id            UUID REFERENCES learning_records(id),

  -- Decision: outcome + rationale, both required to complete (brief: exactly these four options).
  decision_outcome              VARCHAR(50)
                                   CHECK (decision_outcome IN (
                                     'Further investigation required',
                                     'Actions or checks outstanding',
                                     'Ready for resolution',
                                     'Refer for leadership oversight'
                                   )),
  decision_rationale            TEXT,
  -- Required when the outcome is not terminal (Further investigation required / Actions or
  -- checks outstanding) -- drives the follow-up round created on completion.
  next_review_at                TIMESTAMPTZ,

  -- Snapshot of the linked canonical actions (risk_actions, incident_id-linked) taken at THE
  -- MOMENT this review is completed -- title/owner/due date/status/effectiveness as they stood
  -- then. The PDF export reads only this column, never a live risk_actions query, so a later
  -- reassignment or due-date change on the action itself can never alter what a downloaded
  -- review PDF says was true at completion (brief Step 4: "never live-recompute").
  actions_snapshot              JSONB NOT NULL DEFAULT '[]',

  completed_at                  TIMESTAMPTZ,
  completed_by                  UUID REFERENCES users(id),

  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_reviews_incident ON incident_reviews(incident_id, version);
CREATE INDEX IF NOT EXISTS idx_incident_reviews_assigned_to ON incident_reviews(assigned_to) WHERE status = 'Assigned';

-- "Enforce exactly ONE active review per incident": only one non-completed row may exist per
-- incident at a time. Reassignment/draft-save update THIS row in place; a follow-up round is
-- only ever inserted once this row is already Completed, so the partial index never blocks it.
CREATE UNIQUE INDEX IF NOT EXISTS uq_incident_reviews_one_active
  ON incident_reviews(incident_id) WHERE status <> 'Completed';

-- Append-only assignment history ("who assigned whom, when") -- survives reassignment, which
-- only updates incident_reviews.assigned_to/assigned_by/due_at in place and would otherwise lose
-- the prior owner entirely.
CREATE TABLE IF NOT EXISTS incident_review_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id     UUID NOT NULL REFERENCES incident_reviews(id) ON DELETE CASCADE,
  incident_id   UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assigned_by   UUID REFERENCES users(id),
  assigned_to   UUID REFERENCES users(id),
  due_at        TIMESTAMPTZ,
  note          TEXT,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_review_assignments_incident ON incident_review_assignments(incident_id, assigned_at);
