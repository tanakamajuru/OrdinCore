import { query } from '../config/database';

// Server-side pricing engine (Ordin_Core_Supported_Living_and_Homecare_Pricing_Schedules,
// 22 Oct 2026). Report doctrine: "Calculate the price on the server using approved pricing
// rules" and "never accept a browser-supplied price". Reads the active versioned config
// (billing_pricing_config) rather than hard-coding rates, so a future rate change is a new
// config row with an effective_from date, not a code change.

export interface PricingConfig {
  supportedLiving: {
    capacityBands: { maxCapacity: number; monthlyPrice: number }[];
    siteDiscountTiers: { maxPosition: number; discount: number }[];
  };
  homecare: {
    minimumCharge: number;
    firstBandLimit: number;
    marginalRates: { fromClient: number; toClient: number; rate: number }[];
    additionalBranchFee: number;
    quotationAboveClients: number;
  };
}

export interface SiteLine {
  position: number; capacity: number;
  standard?: number; discount?: number; amount?: number;
  quote?: boolean;
}
export interface SupportedLivingQuote { lines: SiteLine[]; total: number; hasQuote: boolean }
export interface HomecareQuote { clientCharge?: number; branchFee?: number; total?: number; quote?: boolean }

function round2(n: number): number { return Math.round((n + Number.EPSILON) * 100) / 100; }

export const billingPricingService = {
  async getActiveConfig(asOf: Date = new Date()): Promise<{ version: number; config: PricingConfig }> {
    const row = (await query(
      `SELECT version, config FROM billing_pricing_config WHERE effective_from <= $1 ORDER BY effective_from DESC, version DESC LIMIT 1`,
      [asOf]
    )).rows[0];
    if (!row) throw new Error('No pricing configuration is active. Record a billing_pricing_config row before quoting.');
    return { version: row.version, config: row.config };
  },

  // capacity -> standard monthly price for one supported-living site, or null (individual quotation).
  siteStandardPrice(config: PricingConfig, capacity: number): number | null {
    for (const band of config.supportedLiving.capacityBands) {
      if (capacity <= band.maxCapacity) return band.monthlyPrice;
    }
    return null;
  },

  // 1-based activation position -> discount fraction, or null (individual quotation beyond 10 sites).
  siteDiscount(config: PricingConfig, position: number): number | null {
    for (const tier of config.supportedLiving.siteDiscountTiers) {
      if (position <= tier.maxPosition) return tier.discount;
    }
    return null;
  },

  // sites: capacities in activation order (position = index + 1). Never reorders — activation
  // order is the provider's own history, retained with an auditable tie-breaker upstream.
  supportedLivingQuote(config: PricingConfig, sites: number[]): SupportedLivingQuote {
    let total = 0, hasQuote = false;
    const lines: SiteLine[] = sites.map((capacity, i) => {
      const position = i + 1;
      const standard = this.siteStandardPrice(config, capacity);
      const discount = this.siteDiscount(config, position);
      if (standard === null || discount === null) { hasQuote = true; return { position, capacity, quote: true }; }
      const amount = round2(standard * (1 - discount));
      total = round2(total + amount);
      return { position, capacity, standard, discount, amount };
    });
    return { lines, total, hasQuote };
  },

  // C: average daily unique active clients across the provider for the (completed) billing
  // period, kept unrounded through calculation per the doctrine. branches: approved operating
  // units (towns/shifts/staff teams alone do not count).
  homecareQuote(config: PricingConfig, C: number, branches: number): HomecareQuote {
    const hc = config.homecare;
    if (C > hc.quotationAboveClients) return { quote: true };
    let marginal = 0;
    for (const band of hc.marginalRates) {
      const bandSize = band.toClient - band.fromClient + 1;
      const withinBand = Math.min(Math.max(C - (band.fromClient - 1), 0), bandSize);
      marginal += withinBand * band.rate;
    }
    const clientCharge = round2(hc.minimumCharge + marginal);
    const branchFee = hc.additionalBranchFee * Math.max((branches || 1) - 1, 0);
    return { clientCharge, branchFee, total: round2(clientCharge + branchFee) };
  },
};
