import { query } from '../config/database';

export interface CanonicalReportRange { start: string; end: string }

export class CanonicalReportingService {
  async effectivenessSummary(companyId: string, range: CanonicalReportRange) {
    const result = await query(
      `WITH stats AS (
         SELECT cev.*, COALESCE(h.name, 'Organisation-wide') AS service_name
           FROM canonical_action_effectiveness_v cev
           LEFT JOIN houses h ON h.id=cev.house_id AND h.company_id=cev.company_id
          WHERE cev.company_id=$1
            AND cev.effectiveness_reviewed_at >= $2::timestamptz
            AND cev.effectiveness_reviewed_at < CASE
                  WHEN $3::text ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN $3::date + INTERVAL '1 day'
                  ELSE $3::timestamptz + INTERVAL '1 millisecond' END
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
         ) x) AS domain_analysis,
         (SELECT COALESCE(json_agg(x ORDER BY day), '[]'::json) FROM (
           SELECT effectiveness_reviewed_at::date AS day,
             COUNT(*) FILTER (WHERE outcome='Effective') AS effective,
             COUNT(*) FILTER (WHERE outcome='Partially Effective') AS partially_effective,
             COUNT(*) FILTER (WHERE outcome='Not Effective') AS not_effective,
             COUNT(*) FILTER (WHERE outcome='Too Early To Assess') AS too_early
           FROM stats GROUP BY effectiveness_reviewed_at::date
         ) x) AS daily_trend`,
      [companyId, range.start, range.end]
    );
    return result.rows[0] || {
      org_summary: { effective: 0, partially_effective: 0, not_effective: 0, too_early: 0, finalised: 0, interim: 0, total_reviewed: 0 },
      service_comparison: [], domain_analysis: [], daily_trend: [],
    };
  }
}

export const canonicalReportingService = new CanonicalReportingService();
