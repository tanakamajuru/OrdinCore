import { query } from '../config/database';
import { getStripe, isStripeConfigured, appBaseUrl } from '../config/stripe';
import logger from '../utils/logger';

export type CareModel = 'RESIDENTIAL' | 'DOMICILIARY';

export class BillingNotConfiguredError extends Error {
  constructor() { super('Billing is not configured yet.'); this.name = 'BillingNotConfiguredError'; }
}

// Statuses that mean the paid period has genuinely ended and access should be withdrawn.
const LAPSED = new Set(['canceled', 'unpaid', 'incomplete_expired']);

export const billingService = {
  /** The billable unit count for a company: active houses (residential) or active clients (domiciliary). */
  async billableUnits(companyId: string, careModel: CareModel): Promise<number> {
    if (careModel === 'DOMICILIARY') {
      const r = await query(
        `SELECT COUNT(DISTINCT su.id)::int AS n
           FROM service_users su
           JOIN houses h ON h.id = su.house_id
          WHERE h.company_id = $1 AND COALESCE(su.status,'active') <> 'archived'`, [companyId]);
      return r.rows[0]?.n || 0;
    }
    const r = await query(
      `SELECT COUNT(*)::int AS n FROM houses WHERE company_id = $1 AND status <> 'closed'`, [companyId]);
    return r.rows[0]?.n || 0;
  },

  /** Choose the tier whose [min,max] range contains the unit count for this care model. */
  async selectTier(careModel: CareModel, units: number, pilot: boolean) {
    const r = await query(
      `SELECT * FROM billing_tiers
        WHERE care_model = $1 AND is_pilot = $2 AND active
          AND min_units <= $3 AND (max_units IS NULL OR max_units >= $3)
        ORDER BY min_units DESC LIMIT 1`, [careModel, pilot, Math.max(units, 1)]);
    return r.rows[0] || null;
  },

  async getCompany(companyId: string) {
    const r = await query(
      `SELECT id, name, email, care_model, is_pilot, stripe_customer_id, stripe_subscription_id,
              subscription_status, subscription_tier_key, subscription_current_period_end,
              subscription_cancel_at_period_end
         FROM companies WHERE id = $1`, [companyId]);
    return r.rows[0] || null;
  },

  /** Public status for the Company Admin billing panel (safe to call even when Stripe is unconfigured). */
  async status(companyId: string) {
    const c = await this.getCompany(companyId);
    if (!c) throw new Error('Company not found');
    const careModel = (c.care_model as CareModel) || null;
    const units = careModel ? await this.billableUnits(companyId, careModel) : 0;
    const tier = careModel ? await this.selectTier(careModel, units, !!c.is_pilot) : null;
    return {
      configured: isStripeConfigured(),
      care_model: careModel,
      is_pilot: !!c.is_pilot,
      billable_units: units,
      unit_label: careModel === 'DOMICILIARY' ? 'clients' : 'houses',
      current_tier: tier ? {
        tier_key: tier.tier_key, monthly_amount_pence: tier.monthly_amount_pence,
        currency: tier.currency, min_units: tier.min_units, max_units: tier.max_units,
        price_ready: !!tier.stripe_price_id,
      } : null,
      subscription_status: c.subscription_status || null,
      current_period_end: c.subscription_current_period_end,
      cancel_at_period_end: !!c.subscription_cancel_at_period_end,
      active: billingService.isAccessActive(c),
    };
  },

  /** Whether a company's billing entitles its staff to access. NULL/pilot/active => yes. */
  isAccessActive(company: any): boolean {
    const s = company.subscription_status as string | null;
    if (!s) return true;                       // never subscribed (pilot / pre-billing) — not gated
    if (!LAPSED.has(s)) return true;           // trialing/active/past_due/pilot still have access
    // Lapsed: allow until the paid period actually ends.
    const end = company.subscription_current_period_end ? new Date(company.subscription_current_period_end).getTime() : 0;
    return end > Date.now();
  },

  async ensureCustomer(companyId: string): Promise<string> {
    const stripe = getStripe();
    if (!stripe) throw new BillingNotConfiguredError();
    const c = await this.getCompany(companyId);
    if (!c) throw new Error('Company not found');
    if (c.stripe_customer_id) return c.stripe_customer_id;
    const customer = await stripe.customers.create({
      name: c.name, email: c.email || undefined, metadata: { company_id: companyId },
    });
    await query('UPDATE companies SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2', [customer.id, companyId]);
    return customer.id;
  },

  /** Create a Checkout session for the tier that matches the company's current unit count. */
  async createCheckoutSession(companyId: string) {
    const stripe = getStripe();
    if (!stripe) throw new BillingNotConfiguredError();
    const c = await this.getCompany(companyId);
    if (!c) throw new Error('Company not found');
    if (!c.care_model) throw new Error('Billing basis is not set for this company. Ask your platform administrator to set the care model.');
    const units = await this.billableUnits(companyId, c.care_model);
    const tier = await this.selectTier(c.care_model, units, !!c.is_pilot);
    if (!tier) throw new Error('No price tier matches this company. Ask your platform administrator to configure billing tiers.');
    if (!tier.stripe_price_id) throw new Error('This tier has no Stripe price yet. Ask your platform administrator to run the Stripe setup.');
    const customerId = await this.ensureCustomer(companyId);
    const base = appBaseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: tier.stripe_price_id, quantity: 1 }],
      success_url: `${base}/company-admin?billing=success`,
      cancel_url: `${base}/company-admin?billing=cancelled`,
      subscription_data: { metadata: { company_id: companyId, tier_key: tier.tier_key } },
      metadata: { company_id: companyId, tier_key: tier.tier_key },
      allow_promotion_codes: true,
    });
    return { url: session.url };
  },

  /** Self-serve Billing Portal (update card, view invoices, cancel — cancel_at_period_end). */
  async createPortalSession(companyId: string) {
    const stripe = getStripe();
    if (!stripe) throw new BillingNotConfiguredError();
    const c = await this.getCompany(companyId);
    if (!c?.stripe_customer_id) throw new Error('No billing account exists yet — subscribe first.');
    const session = await stripe.billingPortal.sessions.create({
      customer: c.stripe_customer_id,
      return_url: `${appBaseUrl()}/company-admin`,
    });
    return { url: session.url };
  },

  /** Apply a Stripe subscription object to our companies row (single place that mirrors state). */
  async syncSubscription(sub: any) {
    const companyId = sub?.metadata?.company_id;
    if (!companyId) { logger.warn(`Billing: subscription ${sub?.id} has no company_id metadata`); return; }
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
    await query(
      `UPDATE companies
          SET stripe_subscription_id = $1,
              subscription_status = $2,
              subscription_tier_key = COALESCE($3, subscription_tier_key),
              subscription_current_period_end = $4,
              subscription_cancel_at_period_end = $5,
              updated_at = NOW()
        WHERE id = $6`,
      [sub.id, sub.status, sub.metadata?.tier_key || null, periodEnd, !!sub.cancel_at_period_end, companyId]);
    logger.info(`Billing: company ${companyId} subscription ${sub.id} -> ${sub.status}`);
  },
};
