# Billing (Stripe UK) — setup & operations

OrdinCore billing is **monthly Stripe subscriptions**, billed on a per-company usage metric, with
self-serve cancel and automatic collection. It is **inert until Stripe keys are configured** — the
platform runs normally before then, so this can be switched on when ready.

## Model
- **Billing basis** (`companies.care_model`, set by super-admin):
  - `RESIDENTIAL` → billed on the number of **active houses**.
  - `DOMICILIARY` → billed on the number of **active clients** (`service_users`).
- **Tiers** (`billing_tiers`): a unit range → a monthly GBP price. `max_units NULL` means "and above".
  Amounts are pence. Seeded defaults are **editable** — confirm ranges/prices before going live.
- **Pilot**: set `companies.is_pilot = true` to bill a company on the low-cost `pilot_*` tiers; flip it
  off later to move them to standard tiers (they re-subscribe at the new price).
- **Cancel**: at end of paid period (`cancel_at_period_end`). When the period ends and the subscription
  is `canceled`/`unpaid`, **front-line staff are locked out**; **admins stay in** so they can renew.
  Companies that never subscribed (pilots / pre-billing) are **never** gated.

## One-time setup
1. Create a **Stripe UK account** (GBP). Get the **Secret key** and **Publishable key** (test first).
2. Set env vars on the API server (`.env` / `.env.production`):
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...        # from step 4
   APP_PUBLIC_URL=https://work.ordincore.co.uk
   ```
3. Review/adjust tiers in `billing_tiers`, then create Stripe Products/Prices from them:
   ```
   STRIPE_SECRET_KEY=sk_test_... npx ts-node src/scripts/stripe-setup.ts
   ```
   This writes each tier's `stripe_price_id` back. Re-runnable; only fills missing prices.
4. Add a **webhook endpoint** in the Stripe dashboard pointing to
   `https://work.ordincore.co.uk/api/v1/billing/webhook`, subscribed to at least:
   `checkout.session.completed`, `customer.subscription.created|updated|deleted`,
   `invoice.paid`, `invoice.payment_failed`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
5. For each customer company, super-admin sets `care_model` (and `is_pilot` for pilots) via
   `PATCH /api/v1/companies/:id`.

## How it works
- Company Admin → **Billing & Subscription** tab: shows care model, billable units, matched tier price
  and status, with **Subscribe** (Stripe Checkout) and **Manage billing** (Stripe Billing Portal).
- `checkout.session.completed` / subscription / invoice webhooks are verified by signature, recorded
  idempotently in `billing_events`, and mirrored onto the `companies` row by `syncSubscription`.
- Access gating lives in `auth.middleware` and only bites on a genuinely lapsed subscription past its
  period end (admins exempt).

## Endpoints
| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/api/v1/billing/status` | Admin | Panel data (safe when unconfigured) |
| POST | `/api/v1/billing/checkout` | Admin | Start subscription Checkout |
| POST | `/api/v1/billing/portal` | Admin | Open Billing Portal |
| POST | `/api/v1/billing/webhook` | Stripe (signature) | Sync subscription state |

## Notes
- Amounts/ranges in `billing_tiers` are starter defaults from the provider's stated pricing
  (residential 1–3 £50 / 4–6 £60 / 7–10 £75 / 11+ £95; domiciliary 1–50 £40 / 51–100 £55 / 101+ £75;
  pilot £10). **Confirm these before creating live prices.**
- Nothing charges or blocks until `STRIPE_SECRET_KEY` is set; the migration and UI ship dormant.
