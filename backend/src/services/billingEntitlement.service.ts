import { query } from '../config/database';
import { billingPricingService } from './billingPricing.service';

// Organisation-linked quote calculation (report section 2 + section 3 "Quote" stage). Reads the
// provider's REAL chargeable quantities from the canonical house/service-user tables -- never a
// browser-supplied count. Read-only: does not write a billing record. Persisting a quote onto a
// Stripe subscription/invoice is existing territory (billing.service.ts, migration 155) and
// needs its own change once the new per-site/marginal pricing replaces billing_tiers' flat
// lookup there -- tracked separately, not done here.

export interface OrganisationQuote {
  priceVersion: number;
  supportedLiving: ReturnType<typeof billingPricingService.supportedLivingQuote>;
  homecare: (ReturnType<typeof billingPricingService.homecareQuote> & { clientCount: number; branchCount: number; isStartingCount: boolean }) | null;
  total: number;
  hasQuote: boolean;
}

export const billingEntitlementService = {
  // Supported-living sites: one chargeable site per active SUPPORTED_LIVING/MIXED house, priced
  // by its declared capacity. Activation order = when the site was brought onto Ordin Core
  // (created_at), with id as the auditable tie-breaker for same-instant rows.
  async getActiveSupportedLivingCapacities(companyId: string): Promise<number[]> {
    const rows = (await query(
      `SELECT capacity FROM houses
        WHERE company_id = $1 AND status = 'active' AND sector IN ('SUPPORTED_LIVING', 'MIXED')
        ORDER BY created_at ASC, id ASC`,
      [companyId]
    )).rows;
    return rows.map((r: any) => Math.max(1, Number(r.capacity) || 1));
  },

  // Homecare: active service users under DOMICILIARY/MIXED houses, and the count of those houses
  // as a proxy for "approved branches" until a dedicated branch record exists. Doctrine (pricing
  // schedule section 10): "For a new homecare subscription without a completed period, show the
  // starting active-client count... use that count for the first period, then switch to
  // completed-period averages" -- this is exactly that starting-count case; no billing period has
  // completed yet for any organisation, since the new schedule has not gone live.
  async getHomecareSnapshot(companyId: string): Promise<{ clientCount: number; branchCount: number }> {
    const row = (await query(
      `SELECT COUNT(DISTINCT su.id)::int AS clients, COUNT(DISTINCT h.id)::int AS branches
         FROM houses h
         LEFT JOIN service_users su ON su.house_id = h.id AND su.is_active = true
        WHERE h.company_id = $1 AND h.status = 'active' AND h.sector IN ('DOMICILIARY', 'MIXED')`,
      [companyId]
    )).rows[0];
    return { clientCount: Number(row?.clients) || 0, branchCount: Math.max(1, Number(row?.branches) || 0) };
  },

  async getOrganisationQuote(companyId: string): Promise<OrganisationQuote> {
    const { version, config } = await billingPricingService.getActiveConfig();
    const capacities = await this.getActiveSupportedLivingCapacities(companyId);
    const supportedLiving = billingPricingService.supportedLivingQuote(config, capacities);

    let homecare: OrganisationQuote['homecare'] = null;
    const hcSnapshot = await this.getHomecareSnapshot(companyId);
    if (hcSnapshot.clientCount > 0 || hcSnapshot.branchCount > 1) {
      const hcQuote = billingPricingService.homecareQuote(config, hcSnapshot.clientCount, hcSnapshot.branchCount);
      homecare = { ...hcQuote, clientCount: hcSnapshot.clientCount, branchCount: hcSnapshot.branchCount, isStartingCount: true };
    }

    let total = supportedLiving.total;
    let hasQuote = supportedLiving.hasQuote;
    if (homecare && !homecare.quote) total = Math.round((total + (homecare.total || 0)) * 100) / 100;
    if (homecare?.quote) hasQuote = true;

    return { priceVersion: version, supportedLiving, homecare, total, hasQuote };
  },
};
