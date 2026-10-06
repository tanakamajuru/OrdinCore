-- Effectiveness → learning traceability (developer review §2): a lesson captured after an
-- effectiveness review must link to the EXACT saved review, independently of its originating action
-- (source_id) and of any resulting improvement action (linked_action_id). Additive and nullable so
-- existing records stay valid as legacy/action-linked.
BEGIN;
ALTER TABLE learning_records ADD COLUMN IF NOT EXISTS source_review_id uuid
  REFERENCES action_effectiveness_reviews(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_learning_records_source_review
  ON learning_records(company_id, source_review_id);
COMMIT;
