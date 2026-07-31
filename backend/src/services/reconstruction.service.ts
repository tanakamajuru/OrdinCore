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

    // Governance reviews are service-level, not person-level. For a by-service
    // reconstruction they are matched on the service; for by-theme/incident they fall
    // back to the time window; for by-CLIENT they are excluded, because a service-wide
    // review concerns every person in the service and would otherwise leak other people
    // into one person's account.
    const reviews = await query(
      `SELECT 'review' AS item_type, gr.review_date AS event_time,
              gr.review_type AS theme, gr.what_is_happening AS description,
              gr.decision AS status, NULL::text AS related_person, gr.service_id AS house_id
       FROM governance_reviews gr
       WHERE gr.company_id = $1
         AND (CASE WHEN $5 = 'service' THEN gr.service_id::text = $2
                   WHEN $5 = 'client'  THEN FALSE
                   ELSE TRUE END)
         AND gr.review_date BETWEEN $3 AND $4`,
      [companyId, scope === 'service' ? id : null, startTs, endTs, scope]
    );

    // Escalations: by-service match the house; by-CLIENT restrict to escalations whose
    // originating signal or linked risk names THAT person (never the whole company).
    const escalations = await query(
      `SELECT 'escalation' AS item_type, e.created_at AS event_time,
              e.reason AS theme,
              COALESCE(e.closure_evidence, e.resolution_notes, '') AS description,
              COALESCE(e.lifecycle_status::text, e.status) AS status,
              NULL::text AS related_person, e.house_id
       FROM escalations e
       LEFT JOIN governance_pulses ep ON ep.id = e.source_pulse_id
       LEFT JOIN risks er ON er.id = e.risk_id
       WHERE e.company_id = $1
         AND (CASE WHEN $5 = 'service' THEN e.house_id::text = $2
                   WHEN $5 = 'client'  THEN (ep.related_person::text = $6 OR er.linked_person::text = $6)
                   ELSE TRUE END)
         AND e.created_at BETWEEN $3 AND $4`,
      [companyId, scope === 'service' ? id : null, startTs, endTs, scope, scope === 'client' ? id : null]
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
      // Governance Outputs: auto-derived findings, recommendations and learning so a
      // reconstruction isn't just a timeline — it tells the RM what it means and what to do.
      governance_outputs: buildGovernanceOutputs(timeline),
    };
  }
}

// Turn a merged timeline into a governance verdict: how long the warning signs were
// present before escalation, the dominant theme, and concrete recommendations + learning.
function buildGovernanceOutputs(timeline: any[]) {
  const signals = timeline.filter((t) => t.item_type === 'signal');
  const escalations = timeline.filter((t) => t.item_type === 'escalation');

  // Dominant theme across the signals.
  const themeCount = new Map<string, number>();
  for (const s of signals) {
    const th = String(s.theme || '').replace(/[{}"[\]]/g, '').split(',')[0].trim() || 'Unclassified';
    themeCount.set(th, (themeCount.get(th) || 0) + 1);
  }
  const dominant = [...themeCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const dominant_theme = dominant ? dominant[0] : null;

  const firstSignal = signals[0]?.event_time || null;
  const firstEscalation = escalations[0]?.event_time || null;
  const warning_window_days = (firstSignal && firstEscalation)
    ? Math.max(0, Math.round((new Date(firstEscalation).getTime() - new Date(firstSignal).getTime()) / 86400000))
    : null;
  const signals_before_escalation = firstEscalation
    ? signals.filter((s) => new Date(s.event_time).getTime() < new Date(firstEscalation).getTime()).length
    : signals.length;

  const highOrCritical = signals.filter((s) => /high|critical/i.test(String(s.status || ''))).length;

  const recommendations: string[] = [];
  const learning: string[] = [];

  if (warning_window_days != null && warning_window_days >= 7 && signals_before_escalation >= 2) {
    learning.push(`Warning signs were present for ${warning_window_days} day(s) and across ${signals_before_escalation} signal(s) before escalation.`);
    recommendations.push(`Lower the escalation threshold for "${dominant_theme}" so a forming pattern is escalated sooner.`);
  }
  if (escalations.length === 0 && signals.length >= 3) {
    learning.push('Multiple signals were recorded but none were escalated.');
    recommendations.push('Review why the pattern was not escalated and reinforce the escalation route with the team.');
  }
  if (highOrCritical > 0) {
    recommendations.push(`Confirm the risk assessment and support plan reflect the ${highOrCritical} High/Critical signal(s) seen here.`);
  }
  if (dominant_theme) {
    recommendations.push(`Add "${dominant_theme}" to the next governance review and monitor its trajectory.`);
  }
  // Always-on learning capture prompts.
  recommendations.push('Capture lessons learned and share them across the service.');
  if (learning.length === 0) learning.push('No systemic gap detected — the response tracked the signals as they emerged.');

  return {
    dominant_theme,
    first_signal: firstSignal,
    first_escalation: firstEscalation,
    warning_window_days,
    signals_before_escalation,
    high_or_critical_signals: highOrCritical,
    recommendations: Array.from(new Set(recommendations)),
    learning,
  };
}

export const reconstructionService = new ReconstructionService();
