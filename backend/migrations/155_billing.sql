-- 155 · Billing (Stripe UK) — subscription model.
--
-- Monthly subscriptions billed on a usage metric decided per company by super-admin:
--   RESIDENTIAL  -> number of active houses
--   DOMICILIARY  -> number of active clients (service_users)
-- Tiers map a unit range to a monthly GBP price. Cancel-at-period-end; access is gated only when a
-- subscription has explicitly lapsed (companies with no subscription — pilots / pre-billing — are
-- never gated, so the platform keeps working before Stripe is configured).

-- Company billing basis + subscription state.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS care_model VARCHAR(20) CHECK (care_model IN ('RESIDENTIAL','DOMICILIARY')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(64),
  -- Mirrors the Stripe subscription status: trialing/active/past_due/canceled/unpaid/incomplete, or
  -- 'pilot' for a manually-granted low-cost pilot, or NULL for never-subscribed.
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS subscription_tier_key VARCHAR(60),
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_pilot BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer ON companies(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_subscription ON companies(stripe_subscription_id);

-- Price tiers. Editable config: amounts are GBP pence. max_units NULL means "and above".
-- stripe_price_id is populated by scripts/stripe-setup.ts once Stripe keys exist.
CREATE TABLE IF NOT EXISTS billing_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_key VARCHAR(60) NOT NULL UNIQUE,
  care_model VARCHAR(20) NOT NULL CHECK (care_model IN ('RESIDENTIAL','DOMICILIARY')),
  is_pilot BOOLEAN NOT NULL DEFAULT FALSE,
  min_units INTEGER NOT NULL,
  max_units INTEGER,               -- NULL = no upper bound
  monthly_amount_pence INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
  stripe_price_id VARCHAR(64),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_billing_tiers_lookup ON billing_tiers(care_model, is_pilot, active, min_units);

-- Append-only webhook/event ledger for auditability and idempotency.
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id VARCHAR(64) UNIQUE,       -- Stripe event id; enforces idempotent processing
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  type VARCHAR(80) NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed starter tiers from the provider's stated pricing. These are EDITABLE defaults — confirm/adjust
-- the ranges and amounts before creating Stripe prices (scripts/stripe-setup.ts reads this table).
-- Non-overlapping ranges; "and so forth" bands are placeholders to be reviewed.
INSERT INTO billing_tiers (tier_key, care_model, is_pilot, min_units, max_units, monthly_amount_pence) VALUES
  ('res_1_3',   'RESIDENTIAL', FALSE, 1,  3,    5000),
  ('res_4_6',   'RESIDENTIAL', FALSE, 4,  6,    6000),
  ('res_7_10',  'RESIDENTIAL', FALSE, 7,  10,   7500),
  ('res_11_up', 'RESIDENTIAL', FALSE, 11, NULL, 9500),
  ('dom_1_50',    'DOMICILIARY', FALSE, 1,   50,   4000),
  ('dom_51_100',  'DOMICILIARY', FALSE, 51,  100,  5500),
  ('dom_101_up',  'DOMICILIARY', FALSE, 101, NULL, 7500),
  ('pilot_res', 'RESIDENTIAL', TRUE, 1, NULL, 1000),
  ('pilot_dom', 'DOMICILIARY', TRUE, 1, NULL, 1000)
ON CONFLICT (tier_key) DO NOTHING;
