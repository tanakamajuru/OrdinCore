-- Migration 122: idempotency key on governance decisions (PDF Phase 4).
-- A unique key per (company, key) so retries or double-clicks cannot create duplicate
-- decisions, tasks or escalations. Additive, idempotent.

BEGIN;

ALTER TABLE governance_reviews
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_governance_review_idempotency
  ON governance_reviews(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMIT;
