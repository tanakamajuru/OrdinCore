-- Billing correction, 23 Oct 2026: the approved Ordin_Core_Supported_Living_and_Homecare_Pricing
-- _Schedules document explicitly supersedes the "illustrative prices and homecare fixed-band
-- proposal" seeded by migration 155 (billing_tiers) -- a flat per-company tier lookup, which
-- cannot represent this schedule's per-site capacity bands + per-site activation-order discount,
-- or homecare's provider-wide marginal rate + per-branch fee. That existing Stripe/webhook/
-- Checkout/Portal infrastructure (migration 155, billing.service.ts, billing.routes.ts) stays --
-- only the price CALCULATION is being replaced, not the billing plumbing. This migration adds
-- only the versioned rate config the new calculation reads from; it does not touch billing_tiers
-- or billing_events, both of which already exist.

CREATE TABLE IF NOT EXISTS billing_pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL UNIQUE,
  effective_from DATE NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed version 1 of the approved pricing schedule
-- (Ordin_Core_Supported_Living_and_Homecare_Pricing_Schedules, 22 Oct 2026).
INSERT INTO billing_pricing_config (version, effective_from, config)
VALUES (1, CURRENT_DATE, '{
  "supportedLiving": {
    "capacityBands": [
      {"maxCapacity": 6,  "monthlyPrice": 100},
      {"maxCapacity": 10, "monthlyPrice": 125},
      {"maxCapacity": 15, "monthlyPrice": 150}
    ],
    "siteDiscountTiers": [
      {"maxPosition": 3,  "discount": 0.00},
      {"maxPosition": 6,  "discount": 0.05},
      {"maxPosition": 10, "discount": 0.10}
    ]
  },
  "homecare": {
    "minimumCharge": 100,
    "firstBandLimit": 25,
    "marginalRates": [
      {"fromClient": 26,  "toClient": 50,  "rate": 2.00},
      {"fromClient": 51,  "toClient": 200, "rate": 1.50},
      {"fromClient": 201, "toClient": 300, "rate": 1.25}
    ],
    "additionalBranchFee": 25,
    "quotationAboveClients": 300
  }
}'::jsonb)
ON CONFLICT (version) DO NOTHING;
