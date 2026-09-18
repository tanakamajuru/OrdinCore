import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';
import { billingService, BillingNotConfiguredError } from '../services/billing.service';
import { getStripe, getWebhookSecret } from '../config/stripe';
import { query } from '../config/database';
import logger from '../utils/logger';

const router = Router();
const admin = [requireAuth, requireTenant, requireRole('ADMIN', 'SUPER_ADMIN')];

const fail = (res: Response, e: any) => {
  const code = e instanceof BillingNotConfiguredError ? 503 : 400;
  return res.status(code).json({ success: false, message: e?.message || 'Billing request failed' });
};

// Current billing status for the Company Admin panel (safe when Stripe is unconfigured).
router.get('/status', ...admin, async (req: Request, res: Response) => {
  try { return res.json({ success: true, data: await billingService.status(req.user!.company_id!) }); }
  catch (e) { return fail(res, e); }
});

// Start a subscription Checkout for the tier matching the company's current unit count.
router.post('/checkout', ...admin, async (req: Request, res: Response) => {
  try { return res.json({ success: true, data: await billingService.createCheckoutSession(req.user!.company_id!) }); }
  catch (e) { return fail(res, e); }
});

// Self-serve Billing Portal (update card, invoices, cancel at period end).
router.post('/portal', ...admin, async (req: Request, res: Response) => {
  try { return res.json({ success: true, data: await billingService.createPortalSession(req.user!.company_id!) }); }
  catch (e) { return fail(res, e); }
});

export default router;

// -----------------------------------------------------------------------------------------------
// Stripe webhook. Mounted separately in app.ts with express.raw BEFORE express.json so the raw body
// is available for signature verification. Idempotent via billing_events.stripe_event_id.
// -----------------------------------------------------------------------------------------------
export async function stripeWebhookHandler(req: Request, res: Response) {
  const stripe = getStripe();
  const secret = getWebhookSecret();
  if (!stripe || !secret) return res.status(503).json({ received: false, message: 'Billing not configured' });

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'] as string, secret);
  } catch (e: any) {
    logger.warn(`Billing webhook signature check failed: ${e?.message}`);
    return res.status(400).send(`Webhook Error: ${e?.message}`);
  }

  // Idempotency: record the event id first; a duplicate delivery is ignored.
  try {
    const ins = await query(
      `INSERT INTO billing_events (stripe_event_id, type, payload) VALUES ($1,$2,$3)
       ON CONFLICT (stripe_event_id) DO NOTHING RETURNING id`,
      [event.id, event.type, event.data?.object ? JSON.stringify(event.data.object) : null]);
    if (ins.rows.length === 0) return res.json({ received: true, duplicate: true });
  } catch (e: any) {
    logger.error(`Billing webhook ledger write failed: ${e?.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        if (s.subscription && s.metadata?.company_id) {
          const sub = await stripe.subscriptions.retrieve(s.subscription as string);
          (sub as any).metadata = { ...(sub as any).metadata, ...s.metadata };
          await billingService.syncSubscription(sub);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await billingService.syncSubscription(event.data.object);
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const inv = event.data.object;
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription as string);
          await billingService.syncSubscription(sub);
        }
        break;
      }
      default:
        break;
    }
  } catch (e: any) {
    logger.error(`Billing webhook handling error (${event.type}): ${e?.message}`);
    // Return 200 so Stripe does not retry a handler bug indefinitely; the event is in the ledger.
  }
  return res.json({ received: true });
}
