import { query } from '../config/database';

export type ReconstructionScope = 'client' | 'service' | 'theme' | 'incident';

/**
 * Reconstruction engine (spec module 9).
 * Builds a single chronological governance timeline for a Client, Service,
 * Risk Theme or Serious Incident by merging signals, governance reviews,
 * escalations, actions and effectiveness reviews.
 */
export class ReconstructionService {
  async reconstruct(companyId: string, scope: ReconstructionScope, id: string, start?: string, end?: string) {
    const startTs = start || '1970-01-01';
    const endTs = end || '2999-12-31';

    // Build the scope predicate against governance_pulses (risk_domain may be
    // text or text[]; cast to text so theme matching is safe either way).
    const signalScope = (() => {
      switch (scope) {
        case 'client': return `gp.related_person::text = $2`;
        case 'service': return `gp.house_id::text = $2`;
        case 'theme': return `gp.risk_domain::text ILIKE '%' || $2 || '%'`;
        case 'incident': return `gp.id IN (
            SELECT irp.pulse_id FROM incident_reconstruction_pulses irp
            JOIN incident_reconstruction irec ON irec.id = irp.reconstruction_id
            WHERE irec.incident_id = $2)`;
        default: return 'TRUE';
      }
    })();

    const signals = await query(
      `SELECT 'signal' AS item_type, gp.created_at AS event_time,
              gp.risk_domain::text AS theme, gp.description, gp.severity::text AS status,
              gp.related_person, gp.house_id
       FROM governance_pulses gp
       WHERE gp.company_id = $1 AND ${signalScope}
         AND gp.created_at BETWEEN $3 AND $4`,
      [companyId, id, startTs, endTs]
    );

    // Governance reviews + escalations + closures are scoped by service where
    // a direct link exists; theme/client scopes fall back to time window.
    const reviews = await query(
      `SELECT 'review' AS item_type, gr.review_date AS event_time,
              gr.review_type AS theme, gr.what_is_happening AS description,
              gr.decision AS status, NULL::text AS related_person, gr.service_id AS house_id
       FROM governance_reviews gr
       WHERE gr.company_id = $1
         AND ($2::text IS NULL OR gr.service_id::text = $2 OR $5 <> 'service')
         AND gr.review_date BETWEEN $3 AND $4`,
      [companyId, scope === 'service' ? id : null, startTs, endTs, scope]
    );

    const escalations = await query(
      `SELECT 'escalation' AS item_type, e.created_at AS event_time,
              e.reason AS theme,
              COALESCE(e.closure_evidence, e.resolution_notes, '') AS description,
              COALESCE(e.lifecycle_status::text, e.status) AS status,
              NULL::text AS related_person, e.house_id
       FROM escalations e
       WHERE e.company_id = $1
         AND (CASE WHEN $5 = 'service' THEN e.house_id::text = $2 ELSE TRUE END)
         AND e.created_at BETWEEN $3 AND $4`,
      [companyId, id, startTs, endTs, scope]
    );

    const timeline = [...signals.rows, ...reviews.rows, ...escalations.rows]
      .filter((r) => r.event_time)
      .sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime());

    return {
      scope,
      id,
      start: start || null,
      end: end || null,
      counts: {
        signals: signals.rows.length,
        reviews: reviews.rows.length,
        escalations: escalations.rows.length,
        total: timeline.length,
      },
      timeline,
    };
  }
}

export const reconstructionService = new ReconstructionService();
