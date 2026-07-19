-- Migration 106: the computed Risk Index becomes the authoritative figure.
-- Store the 0–100 index on the risk so the register/dashboards read it without recomputing
-- per row. The risk's severity/grade is henceforth DERIVED from the index (Low/Medium/High/
-- Critical bands) by the engine — no manual scoring — and refreshed on the events that move it.
ALTER TABLE risks ADD COLUMN IF NOT EXISTS risk_index INTEGER;
