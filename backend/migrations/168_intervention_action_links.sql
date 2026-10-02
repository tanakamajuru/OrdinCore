-- 168: Multiple explicit, de-duplicated, audited action links per intervention (brief 2, §1).
--
-- An intervention is the leadership PLAN; existing actions deliver it. One plan often needs several
-- delivery actions, but the schema only held a single interventions.linked_action_id, so coverage
-- and effectiveness were derived from one action (or guessed via the linked risk). This adds an
-- append-only link table: many actions per intervention, deduplicated by stable ID, with who linked
-- and unlinked each one and when — an audited history of link changes. The legacy linked_action_id
-- column is retained for backward compatibility and backfilled here.

CREATE TABLE IF NOT EXISTS intervention_action_links (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  intervention_id uuid NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  action_id       uuid NOT NULL REFERENCES risk_actions(id) ON DELETE CASCADE,
  created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  removed_at      timestamptz,
  removed_by      uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Dedupe by ID: at most one ACTIVE link between a given intervention and action. Re-linking after an
-- unlink creates a new row (preserving the audit trail) without violating this.
CREATE UNIQUE INDEX IF NOT EXISTS uq_intervention_action_active
  ON intervention_action_links(intervention_id, action_id) WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ial_intervention ON intervention_action_links(company_id, intervention_id) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ial_action ON intervention_action_links(company_id, action_id) WHERE removed_at IS NULL;

-- Backfill the existing single link so no coverage is lost on cutover.
INSERT INTO intervention_action_links (company_id, intervention_id, action_id, created_by)
SELECT i.company_id, i.id, i.linked_action_id, i.created_by
  FROM interventions i
 WHERE i.linked_action_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM risk_actions ra WHERE ra.id = i.linked_action_id)
ON CONFLICT (intervention_id, action_id) WHERE removed_at IS NULL DO NOTHING;
