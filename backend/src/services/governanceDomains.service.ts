import { query } from '../config/database';

/**
 * Configurable governance domains / signal library.
 * The engine is sector-agnostic; the domain + signal vocabulary is data, loaded
 * per the organisation's sector (Supported Living, Domiciliary, ...).
 */
export const governanceDomainsService = {
  async getSector(company_id: string | null): Promise<string> {
    if (!company_id) return 'SUPPORTED_LIVING';
    const r = await query('SELECT sector FROM companies WHERE id = $1', [company_id]);
    return r.rows[0]?.sector || 'SUPPORTED_LIVING';
  },

  // Sector is per-service: resolve from the house, falling back to the company.
  async getSectorForHouse(house_id: string | null, company_id: string | null): Promise<string> {
    if (house_id) {
      const r = await query('SELECT sector FROM houses WHERE id = $1', [house_id]);
      if (r.rows[0]?.sector) return r.rows[0].sector;
    }
    return this.getSector(company_id);
  },

  /**
   * Returns the active domains for a sector, each with its selectable signals
   * (the per-domain dropdown) and threshold rule. Sector is resolved from the
   * service (house) when given, otherwise the company.
   */
  async getDomainsForCompany(company_id: string | null, house_id: string | null = null) {
    const sector = house_id
      ? await this.getSectorForHouse(house_id, company_id)
      : await this.getSector(company_id);

    // A MIXED provider (viewed at company level, i.e. no specific service) draws on
    // BOTH sector libraries; a single-sector company (or any concrete house) draws
    // on exactly one. `= ANY($1)` handles both without branching the SQL.
    const sectors = sector === 'MIXED' ? ['SUPPORTED_LIVING', 'DOMICILIARY'] : [sector];

    const [domains, signals, thresholds] = await Promise.all([
      query(
        `SELECT name, description, sort_order FROM governance_domains
         WHERE sector = ANY($1) AND is_active = true ORDER BY sort_order, name`,
        [sectors]
      ),
      query(
        `SELECT domain_name, signal_label, sort_order FROM signal_library
         WHERE sector = ANY($1) AND is_active = true ORDER BY domain_name, sort_order, signal_label`,
        [sectors]
      ),
      query(
        `SELECT domain_name, trigger_signal_count, window_days, description FROM threshold_rules
         WHERE sector = ANY($1) AND is_active = true`,
        [sectors]
      ),
    ]);

    const signalsByDomain: Record<string, string[]> = {};
    for (const s of signals.rows) {
      (signalsByDomain[s.domain_name] = signalsByDomain[s.domain_name] || []).push(s.signal_label);
    }
    const thresholdByDomain: Record<string, { count: number; window_days: number; description: string }> = {};
    for (const t of thresholds.rows) {
      thresholdByDomain[t.domain_name] = { count: t.trigger_signal_count, window_days: t.window_days, description: t.description };
    }

    // For MIXED, the same domain name can exist under both sectors — collapse to one
    // entry (its signals/threshold are keyed by name, so they already merge above).
    const seen = new Set<string>();
    const uniqueDomains = domains.rows.filter((d) => (seen.has(d.name) ? false : (seen.add(d.name), true)));

    return {
      sector,
      domains: uniqueDomains.map(d => ({
        name: d.name,
        description: d.description,
        signals: signalsByDomain[d.name] || [],
        threshold: thresholdByDomain[d.name] || null,
      })),
    };
  },
};
