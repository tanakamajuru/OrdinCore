-- 097_tl_availability.sql
-- Finding F (optional fuller fix) — a per-Team-Leader availability flag, so action
-- auto-allocation and the reassign picker can route around an unavailable TL (mirrors
-- the deputy_rm_id pattern that already exists for RM cover). Additive; default available.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true;

COMMIT;
