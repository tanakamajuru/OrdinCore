import { query } from '../config/database';

export interface CanonicalReportRange { start: string; end: string }

export class CanonicalReportingService {
  // 30 Oct 2026 developer specification ("Action Effectiveness screen"), Step 3: "Current
  // position" is one authoritative current review state per distinct action, never restricted
  // to a reporting window. canonical_action_effectiveness_v (migration 141) is already exactly
  // that — one row per action_id carrying its LATEST effectiveness_outcome/reviewed_at — so
  // this reads it with no date filter at all.
  async effectivenessCurrent(companyId: string) {
    const result = await query(
      `WITH stats AS (
         SELECT cev.*, COALESCE(h.name, 'Organisation-wide') AS service_name
           FROM canonical_action_effectiveness_v cev
           LEFT JOIN houses h ON h.id=cev.house_id AND h.company_id=cev.company_id
          WHERE cev.company_id=$1
            AND cev.outcome IS NOT NULL
       )
       SELECT
         (SELECT json_build_object(
           'effective', COUNT(*) FILTER (WHERE outcome='Effective'),
           'partially_effective', COUNT(*) FILTER (WHERE outcome='Partially Effective'),
           'not_effective', COUNT(*) FILTER (WHERE outcome='Not Effective'),
           'too_early', COUNT(*) FILTER (WHERE outcome='Too Early To Assess'),
           'finalised', COUNT(*) FILTER (WHERE review_state='FINAL'),
           'interim', COUNT(*) FILTER (WHERE review_state='INTERIM'),
           'total_reviewed', COUNT(*)
         ) FROM stats) AS org_summary,
         (SELECT COALESCE(json_agg(x ORDER BY service_name), '[]'::json) FROM (
           SELECT service_name,
             COUNT(*) FILTER (WHERE outcome='Effective') AS effective,
             COUNT(*) FILTER (WHERE outcome='Partially Effective') AS partially_effective,
             COUNT(*) FILTER (WHERE outcome='Not Effective') AS not_effective,
             COUNT(*) FILTER (WHERE outcome='Too Early To Assess') AS too_early
           FROM stats GROUP BY service_name
         ) x) AS service_comparison,
         (SELECT COALESCE(json_agg(x ORDER BY domain), '[]'::json) FROM (
           SELECT domain,
             COUNT(*) FILTER (WHERE outcome='Effective') AS effective,
             COUNT(*) FILTER (WHERE outcome='Partially Effective') AS partially_effective,
             COUNT(*) FILTER (WHERE outcome='Not Effective') AS not_effective,
             COUNT(*) FILTER (WHERE outcome='Too Early To Assess') AS too_early
           FROM stats GROUP BY domain
         ) x) AS domain_analysis`,
      [companyId]
    );
    return result.rows[0] || {
      org_summary: { effective: 0, partially_effective: 0, not_effective: 0, too_early: 0, finalised: 0, interim: 0, total_reviewed: 0 },
      service_comparison: [], domain_analysis: [],
    };
  }

  // Step 3 "Review history": apply the selected period to actual REVIEW-EVENT timestamps, not
  // the one-row-per-action current-state view — so one action reviewed three times counts once
  // in effectivenessCurrent() and three times here (Step 8 acceptance test #1). Reads the
  // append-only action_effectiveness_reviews table (migration 140) directly.
  async effectivenessHistory(companyId: string, range: CanonicalReportRange) {
    const result = await query(
      `WITH events AS (
         SELECT aer.outcome, aer.reviewed_at,
                COALESCE(h.name, 'Organisation-wide') AS service_name
           FROM action_effectiveness_reviews aer
           JOIN risk_actions ra ON ra.id = aer.action_id AND ra.company_id = aer.company_id
           LEFT JOIN risks r ON r.id = ra.risk_id AND r.company_id = ra.company_id
           LEFT JOIN houses h ON h.id = COALESCE(ra.house_id, r.house_id)
          WHERE aer.company_id = $1
            AND aer.reviewed_at >= $2::timestamptz
            AND aer.reviewed_at < CASE
                  WHEN $3::text ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN $3::date + INTERVAL '1 day'
                  ELSE $3::timestamptz + INTERVAL '1 millisecond' END
       )
       SELECT
         (SELECT COUNT(*) FROM events)::int AS total_events,
         (SELECT COALESCE(json_agg(x ORDER BY day), '[]'::json) FROM (
           SELECT reviewed_at::date AS day,
             COUNT(*) FILTER (WHERE outcome='Effective') AS effective,
             COUNT(*) FILTER (WHERE outcome='Partially Effective') AS partially_effective,
             COUNT(*) FILTER (WHERE outcome='Not Effective') AS not_effective,
             COUNT(*) FILTER (WHERE outcome='Too Early To Assess') AS too_early
           FROM events GROUP BY reviewed_at::date
         ) x) AS daily_trend`,
      [companyId, range.start, range.end]
    );
    return result.rows[0] || { total_events: 0, daily_trend: [] };
  }
}

export const canonicalReportingService = new CanonicalReportingService();
