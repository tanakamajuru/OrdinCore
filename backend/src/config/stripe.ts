import Stripe from 'stripe';
import logger from '../utils/logger';

// Stripe is optional: until STRIPE_SECRET_KEY is set the whole billing surface is inert and the rest
// of the platform runs normally. Never throw at import time — callers check isStripeConfigured().
let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client = new Stripe(key, { apiVersion: '2025-01-27.acacia' as any });
  return client;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

// The public base URL Stripe redirects back to after Checkout / Billing Portal.
export function appBaseUrl(): string {
  return process.env.APP_PUBLIC_URL || 'https://work.ordincore.co.uk';
}

export function warnIfMisconfigured(): void {
  if (!isStripeConfigured()) {
    logger.info('Billing: Stripe not configured (STRIPE_SECRET_KEY unset) — billing endpoints are inert.');
  } else if (!getWebhookSecret()) {
    logger.warn('Billing: STRIPE_SECRET_KEY set but STRIPE_WEBHOOK_SECRET missing — webhooks will be rejected.');
  }
}
