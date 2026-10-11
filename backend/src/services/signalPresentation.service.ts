import { query } from '../config/database';

/**
 * Signal theme simplification — display-only presentation catalogue.
 *
 * A versioned presentation layer over the canonical signal taxonomy. It NEVER changes what
 * is stored or submitted — canonical theme/signal labels remain the single source of truth.
 * Each catalogue row carries optional plain-language display attributes that the capture UI
 * may surface INSTEAD of the canonical wording, but only once a row is APPROVED (leadership
 * Stage-B sign-off). Until then the overlay is empty and the UI shows canonical wording.
 */

export interface PresentationEntry {
  display_theme: string | null;
  display_signal: string | null;
  navigation_group: string | null;
  help_text: string | null;
  search_aliases: string[];
  recommended_route: string | null;
}

export interface PresentationCatalogueRow extends PresentationEntry {
  id: string;
  version: number;
  sector: string;
  canonical_theme: string;
  canonical_signal_label: string | null;
  review_status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  is_active: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

// Key a mapping by sector + theme + (signal | theme-level). Kept stable so the overlay
// in governanceDomains can look up both theme-level and signal-level rows.
export function presentationKey(sector: string, theme: string, signal?: string | null): string {
  return `${sector}||${theme}||${signal || ''}`;
}

export const signalPresentationService = {
  /**
   * The active (APPROVED) overlay for one or more sectors, as a lookup map. Only APPROVED,
   * active rows are returned, so DRAFT/IN_REVIEW wording never reaches production capture.
   */
  async getActiveOverlay(sectors: string[]): Promise<Record<string, PresentationEntry>> {
    if (!sectors.length) return {};
    const r = await query(
      `SELECT sector, canonical_theme, canonical_signal_label,
              display_theme, display_signal, navigation_group, help_text,
              search_aliases, recommended_route
         FROM signal_presentation_catalogue
        WHERE sector = ANY($1) AND is_active = true AND review_status = 'APPROVED'`,
      [sectors]
    );
    const map: Record<string, PresentationEntry> = {};
    for (const row of r.rows) {
      map[presentationKey(row.sector, row.canonical_theme, row.canonical_signal_label)] = {
        display_theme: row.display_theme || null,
        display_signal: row.display_signal || null,
        navigation_group: row.navigation_group || null,
        help_text: row.help_text || null,
        search_aliases: Array.isArray(row.search_aliases) ? row.search_aliases : [],
        recommended_route: row.recommended_route || null,
      };
    }
    return map;
  },

  /** Full catalogue (all statuses) for leadership review — admin only. */
  async listCatalogue(sector?: string): Promise<PresentationCatalogueRow[]> {
    const params: unknown[] = [];
    let where = 'WHERE is_active = true';
    if (sector) { params.push(sector); where += ` AND sector = $${params.length}`; }
    const r = await query(
      `SELECT id, version, sector, canonical_theme, canonical_signal_label,
              display_theme, display_signal, navigation_group, help_text,
              search_aliases, recommended_route, review_status, is_active,
              reviewed_by, reviewed_at
         FROM signal_presentation_catalogue
         ${where}
        ORDER BY sector, canonical_theme, canonical_signal_label NULLS FIRST`,
      params
    );
    return r.rows as PresentationCatalogueRow[];
  },

  /**
   * Promote/demote a single catalogue row. This is the Stage-B sign-off lever — moving a row
   * to APPROVED makes its display wording live. SUPER_ADMIN only; the caller records the audit.
   */
  async setReviewStatus(
    id: string,
    status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED',
    reviewed_by: string
  ): Promise<PresentationCatalogueRow | null> {
    const r = await query(
      `UPDATE signal_presentation_catalogue
          SET review_status = $2,
              reviewed_by = $3,
              reviewed_at = NOW(),
              updated_at = NOW()
        WHERE id = $1
        RETURNING id, version, sector, canonical_theme, canonical_signal_label,
                  display_theme, display_signal, navigation_group, help_text,
                  search_aliases, recommended_route, review_status, is_active,
                  reviewed_by, reviewed_at`,
      [id, status, reviewed_by]
    );
    return (r.rows[0] as PresentationCatalogueRow) || null;
  },
};
