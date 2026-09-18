import '../config/env';
import { getStripe, isStripeConfigured } from '../config/stripe';
import { getPool } from '../config/database';
import logger from '../utils/logger';

/**
 * One-time (idempotent) Stripe setup. For every active billing_tiers row without a stripe_price_id,
 * create a monthly GBP recurring Price (under a per-tier Product) and write the price id back.
 * Safe to re-run: tiers that already have a price id are skipped.
 *
 *   STRIPE_SECRET_KEY=sk_test_... npx ts-node src/scripts/stripe-setup.ts
 */
async function run() {
  if (!isStripeConfigured()) {
    logger.error('Stripe setup: STRIPE_SECRET_KEY is not set. Aborting.');
    process.exit(1);
  }
  const stripe = getStripe()!;
  const pool = getPool();
  const client = await pool.connect();
  try {
    const tiers = (await client.query(
      `SELECT id, tier_key, care_model, is_pilot, min_units, max_units, monthly_amount_pence, currency
         FROM billing_tiers WHERE active AND stripe_price_id IS NULL ORDER BY care_model, is_pilot, min_units`)).rows;
    if (tiers.length === 0) { logger.info('Stripe setup: all active tiers already have prices. Nothing to do.'); return; }

    for (const t of tiers) {
      const range = t.max_units == null ? `${t.min_units}+` : `${t.min_units}-${t.max_units}`;
      const unit = t.care_model === 'DOMICILIARY' ? 'clients' : 'houses';
      const name = `OrdinCore ${t.is_pilot ? 'Pilot ' : ''}${t.care_model === 'DOMICILIARY' ? 'Domiciliary' : 'Residential'} (${range} ${unit})`;
      const product = await stripe.products.create({
        name, metadata: { tier_key: t.tier_key, care_model: t.care_model, is_pilot: String(t.is_pilot) },
      });
      const price = await stripe.prices.create({
        product: product.id,
        currency: (t.currency || 'GBP').toLowerCase(),
        unit_amount: t.monthly_amount_pence,
        recurring: { interval: 'month' },
        metadata: { tier_key: t.tier_key },
      });
      await client.query('UPDATE billing_tiers SET stripe_price_id = $1, updated_at = NOW() WHERE id = $2', [price.id, t.id]);
      logger.info(`Stripe setup: ${t.tier_key} -> price ${price.id} (${(t.monthly_amount_pence / 100).toFixed(2)} ${t.currency}/mo)`);
    }
    logger.info(`Stripe setup complete: ${tiers.length} price(s) created.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => { logger.error('Stripe setup failed', e); process.exit(1); });
