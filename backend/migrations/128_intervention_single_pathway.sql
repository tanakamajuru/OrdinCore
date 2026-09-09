-- Migration 128: enforce the single Intervention Action pathway.
-- Apply after migration 109. Take a database backup and run in staging first.

-- Remove stale action references before enforcing referential integrity.
UPDATE interventions i
   SET linked_action_id = NULL
 WHERE linked_action_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM risk_actions ra WHERE ra.id = i.linked_action_id);

ALTER TABLE interventions
  DROP CONSTRAINT IF EXISTS interventions_linked_action_id_fkey;

ALTER TABLE interventions
  ADD CONSTRAINT interventions_linked_action_id_fkey
  FOREIGN KEY (linked_action_id) REFERENCES risk_actions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_interventions_linked_action
  ON interventions(linked_action_id) WHERE linked_action_id IS NOT NULL;

-- Director and RI oversight must append to the RM-owned record, not overwrite it.
CREATE TABLE IF NOT EXISTS intervention_oversight_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role VARCHAR(40) NOT NULL,
  event_type VARCHAR(40) NOT NULL CHECK (event_type IN
    ('DIRECTOR_CHALLENGE','DIRECTOR_DIRECTION','RI_QUERY','RI_ASSURANCE_NOTE','CLARIFICATION_RESPONSE')),
  narrative TEXT NOT NULL CHECK (char_length(trim(narrative)) >= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intervention_oversight_timeline
  ON intervention_oversight_events(intervention_id, created_at DESC);

-- Fast normalised lookup. Uniqueness is retained on the existing theme/scope constraint; a
-- separate data-cleanup migration should merge any historic case variants after human review.
CREATE INDEX IF NOT EXISTS idx_interventions_normalised_org_theme
  ON interventions(company_id, lower(trim(theme))) WHERE house_id IS NULL;
