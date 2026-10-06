-- Idempotent learning saves (developer review §2): a retried submission must not create a duplicate
-- lesson, while a genuinely later/separate learning assessment (a new capture) is never blocked.
-- A per-attempt idempotency key scopes this to one save action; distinct captures carry distinct keys.
BEGIN;
ALTER TABLE learning_records ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_learning_records_idempotency
  ON learning_records(company_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
COMMIT;
