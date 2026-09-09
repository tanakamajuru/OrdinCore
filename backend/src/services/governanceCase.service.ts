import { query } from '../config/database';

export type GovernanceCaseAnchor = {
  signalId?: string | null;
  patternId?: string | null;
  riskId?: string | null;
  escalationId?: string | null;
  actionId?: string | null;
};

const ids = (rows: any[], key = 'id') => [...new Set(rows.map((r) => r?.[key]).filter(Boolean))];

/**
 * Canonical read-side resolver for the governance case graph.
 *
 * It never creates relationships and never guesses from labels. It follows only stable ids stored
 * on signals, links, decisions, actions, patterns, risks, escalations and interventions. Every role
 * projection should consume this graph rather than inventing its own join rules.
 */
export class GovernanceCaseService {
  async resolve(companyId: string, anchor: GovernanceCaseAnchor) {
    if (!Object.values(anchor).some(Boolean)) throw new Error('A governance case anchor is required.');

    const signals: any[] = [];
    const patterns: any[] = [];
    const risks: any[] = [];
    const escalations: any[] = [];
    const decisions: any[] = [];
    const actions: any[] = [];

    if (anchor.signalId) signals.push(...(await query(
      `SELECT gp.*, h.name AS service_name,
              NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), '') AS recorded_by_name
         FROM governance_pulses gp
         LEFT JOIN houses h ON h.id=gp.house_id AND h.company_id=gp.company_id
         LEFT JOIN users u ON u.id=gp.created_by
        WHERE gp.id=$1 AND gp.company_id=$2`, [anchor.signalId, companyId])).rows);

    if (anchor.patternId) patterns.push(...(await query(
      `SELECT * FROM signal_clusters WHERE id=$1 AND company_id=$2`, [anchor.patternId, companyId])).rows);
    if (anchor.riskId) risks.push(...(await query(
      `SELECT * FROM risks WHERE id=$1 AND company_id=$2`, [anchor.riskId, companyId])).rows);
    if (anchor.escalationId) escalations.push(...(await query(
      `SELECT * FROM escalations WHERE id=$1 AND company_id=$2`, [anchor.escalationId, companyId])).rows);
    if (anchor.actionId) actions.push(...(await query(
      `SELECT * FROM risk_actions WHERE id=$1 AND company_id=$2`, [anchor.actionId, companyId])).rows);

    const seedAction = actions[0];
    const seedEsc = escalations[0];
    const signalSeed = ids(signals);
    const patternSeed = [...new Set([anchor.patternId, seedAction?.source_cluster_id, seedEsc?.source_cluster_id].filter(Boolean))];
    const riskSeed = [...new Set([anchor.riskId, seedAction?.risk_id, seedEsc?.risk_id].filter(Boolean))];
    const escalationSeed = [...new Set([anchor.escalationId, seedAction?.escalation_id].filter(Boolean))];

    if (signalSeed.length) {
      patterns.push(...(await query(
        `SELECT DISTINCT sc.* FROM risk_signal_links rsl
          JOIN signal_clusters sc ON sc.id=rsl.cluster_id
         WHERE rsl.pulse_entry_id=ANY($1::uuid[]) AND sc.company_id=$2`, [signalSeed, companyId])).rows);
      risks.push(...(await query(
        `SELECT DISTINCT r.* FROM risk_signal_links rsl
          JOIN risks r ON r.id=rsl.risk_id
         WHERE rsl.pulse_entry_id=ANY($1::uuid[]) AND r.company_id=$2`, [signalSeed, companyId])).rows);
    }

    const patternIds = [...new Set([...patternSeed, ...ids(patterns)])];
    if (patternIds.length) {
      risks.push(...(await query(
        `SELECT DISTINCT r.* FROM risks r
          LEFT JOIN signal_clusters sc ON sc.linked_risk_id=r.id
         WHERE r.company_id=$2 AND (r.source_cluster_id=ANY($1::uuid[]) OR sc.id=ANY($1::uuid[]))`, [patternIds, companyId])).rows);
      signals.push(...(await query(
        `SELECT DISTINCT gp.* FROM risk_signal_links rsl
          JOIN governance_pulses gp ON gp.id=rsl.pulse_entry_id
         WHERE rsl.cluster_id=ANY($1::uuid[]) AND gp.company_id=$2`, [patternIds, companyId])).rows);
    }

    const riskIds = [...new Set([...riskSeed, ...ids(risks)])];
    if (riskIds.length) {
      patterns.push(...(await query(
        `SELECT DISTINCT sc.* FROM signal_clusters sc
          LEFT JOIN risks r ON r.source_cluster_id=sc.id
         WHERE sc.company_id=$2 AND (sc.linked_risk_id=ANY($1::uuid[]) OR r.id=ANY($1::uuid[]))`, [riskIds, companyId])).rows);
      signals.push(...(await query(
        `SELECT DISTINCT gp.* FROM risk_signal_links rsl
          JOIN governance_pulses gp ON gp.id=rsl.pulse_entry_id
         WHERE rsl.risk_id=ANY($1::uuid[]) AND gp.company_id=$2`, [riskIds, companyId])).rows);
    }

    const signalIds = ids(signals);
    const allPatternIds = ids(patterns);
    const allRiskIds = ids(risks);
    const directEscalationIds = [...new Set(escalationSeed)];
    const linkedEscalations = (await query(
      `SELECT DISTINCT e.* FROM escalations e
        WHERE e.company_id=$1 AND (
          ($2::uuid[] <> '{}' AND e.source_pulse_id=ANY($2::uuid[])) OR
          ($3::uuid[] <> '{}' AND e.source_cluster_id=ANY($3::uuid[])) OR
          ($4::uuid[] <> '{}' AND e.risk_id=ANY($4::uuid[])) OR
          ($5::uuid[] <> '{}' AND e.id=ANY($5::uuid[]))
        )`, [companyId, signalIds, allPatternIds, allRiskIds, directEscalationIds])).rows;
    escalations.push(...linkedEscalations);
    const escalationIds = ids(escalations);

    decisions.push(...(await query(
      `SELECT DISTINCT gr.*,
              NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), '') AS reviewed_by_name
         FROM governance_reviews gr LEFT JOIN users u ON u.id=gr.reviewed_by
        WHERE gr.company_id=$1 AND (
          ($2::uuid[] <> '{}' AND gr.pulse_entry_id=ANY($2::uuid[])) OR
          ($3::uuid[] <> '{}' AND gr.cluster_id=ANY($3::uuid[])) OR
          ($4::uuid[] <> '{}' AND gr.risk_id=ANY($4::uuid[])) OR
          ($5::uuid[] <> '{}' AND gr.escalation_id=ANY($5::uuid[]))
        )`, [companyId, signalIds, allPatternIds, allRiskIds, escalationIds])).rows);
    const decisionIds = ids(decisions);

    actions.push(...(await query(
      `SELECT DISTINCT ra.*,
              NULLIF(TRIM(COALESCE(au.first_name,'') || ' ' || COALESCE(au.last_name,'')), '') AS assigned_to_name,
              NULLIF(TRIM(COALESCE(cu.first_name,'') || ' ' || COALESCE(cu.last_name,'')), '') AS completed_by_name,
              NULLIF(TRIM(COALESCE(eu.first_name,'') || ' ' || COALESCE(eu.last_name,'')), '') AS effectiveness_reviewed_by_name
         FROM risk_actions ra
         LEFT JOIN users au ON au.id=ra.assigned_to
         LEFT JOIN users cu ON cu.id=ra.completed_by
         LEFT JOIN users eu ON eu.id=ra.effectiveness_reviewed_by
        WHERE ra.company_id=$1 AND (
          ra.id=$2 OR
          ($3::uuid[] <> '{}' AND ra.source_pulse_id=ANY($3::uuid[])) OR
          ($4::uuid[] <> '{}' AND ra.source_cluster_id=ANY($4::uuid[])) OR
          ($5::uuid[] <> '{}' AND ra.risk_id=ANY($5::uuid[])) OR
          ($6::uuid[] <> '{}' AND ra.escalation_id=ANY($6::uuid[])) OR
          ($7::uuid[] <> '{}' AND ra.governance_review_id=ANY($7::uuid[]))
        )`, [companyId, anchor.actionId || null, signalIds, allPatternIds, allRiskIds, escalationIds, decisionIds])).rows);

    const interventions = allRiskIds.length || ids(actions).length ? (await query(
      `SELECT DISTINCT i.*,
              NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), '') AS owner_name
         FROM interventions i LEFT JOIN users u ON u.id=i.owner_id
        WHERE i.company_id=$1 AND (
          ($2::uuid[] <> '{}' AND i.linked_risk_id=ANY($2::uuid[])) OR
          ($3::uuid[] <> '{}' AND i.linked_action_id=ANY($3::uuid[]))
        )`, [companyId, allRiskIds, ids(actions)])).rows : [];

    const oversightEvents = ids(interventions).length ? (await query(
      `SELECT ioe.*, NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), '') AS actor_name
         FROM intervention_oversight_events ioe LEFT JOIN users u ON u.id=ioe.actor_id
        WHERE ioe.company_id=$1 AND ioe.intervention_id=ANY($2::uuid[]) ORDER BY ioe.created_at`,
      [companyId, ids(interventions)])).rows : [];

    const closureReviews = (allRiskIds.length || escalationIds.length) ? (await query(
      `SELECT cr.*, NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), '') AS reviewed_by_name
         FROM closure_reviews cr LEFT JOIN users u ON u.id=cr.reviewed_by
        WHERE cr.company_id=$1 AND (
          ($2::uuid[] <> '{}' AND cr.risk_id=ANY($2::uuid[])) OR
          ($3::uuid[] <> '{}' AND cr.escalation_id=ANY($3::uuid[]))
        ) ORDER BY cr.created_at`, [companyId, allRiskIds, escalationIds])).rows : [];

    return {
      anchor,
      ids: { signals: signalIds, patterns: allPatternIds, risks: allRiskIds, escalations: escalationIds, decisions: decisionIds, actions: ids(actions), interventions: ids(interventions) },
      signals: this.unique(signals), patterns: this.unique(patterns), risks: this.unique(risks),
      decisions: this.unique(decisions), actions: this.unique(actions), escalations: this.unique(escalations),
      interventions: this.unique(interventions), intervention_oversight_events: oversightEvents,
      closure_reviews: closureReviews,
    };
  }

  async timeline(companyId: string, anchor: GovernanceCaseAnchor) {
    const c = await this.resolve(companyId, anchor);
    const rows: any[] = [];
    const push = (record: string, relationship: string, item: any, label: string, status: any, at: any, link: string | null, evidence?: any) => {
      rows.push({ record, relationship, id: item.id, label, status, at, link, evidence: evidence || null });
    };
    c.signals.forEach((x: any) => push('Signal', 'Source evidence', x, x.description, x.review_status || x.severity, x.created_at || x.entry_date, `/signals/${x.id}`, x.immediate_action));
    c.decisions.forEach((x: any) => push('Governance Decision', 'Management decision', x, x.what_is_happening, x.decision_status || x.decision, x.created_at, null, x.evidence));
    c.actions.forEach((x: any) => {
      push('Action', 'Assigned corrective work', x, x.title, x.status, x.created_at, '/my-actions', x.completion_evidence);
      if (x.completed_at) push('Action Completion', 'Completion evidence', { id: `${x.id}:completion` }, x.title, x.status, x.completed_at, '/my-actions', x.completion_evidence);
      if (x.effectiveness_reviewed_at) push('Effectiveness Review', 'Outcome evidence', { id: `${x.id}:effectiveness` }, x.title, x.effectiveness_outcome || x.effectiveness, x.effectiveness_reviewed_at, '/effectiveness', x.effectiveness_evidence);
    });
    c.patterns.forEach((x: any) => push('Pattern', 'Systematic governance pattern', x, x.cluster_label || x.risk_domain, x.review_outcome || x.cluster_status, x.created_at, '/rm5'));
    c.risks.forEach((x: any) => push('Risk', 'Formal oversight risk', x, x.strategic_theme || x.title, x.status, x.created_at, `/risk-register/${x.id}`));
    c.escalations.forEach((x: any) => push('Escalation', 'Time-bound escalation', x, x.reason, x.lifecycle_status || x.status, x.created_at, `/escalation-log?focus=${x.id}`, x.closure_evidence));
    c.interventions.forEach((x: any) => push('Intervention', 'Leadership intervention', x, x.intervention, x.status, x.created_at, '/interventions', x.expected_outcome));
    c.intervention_oversight_events.forEach((x: any) => push('Oversight Event', 'Intervention oversight', x, x.narrative, x.event_type, x.created_at, '/interventions'));
    c.closure_reviews.forEach((x: any) => push('Closure Review', 'Evidence-based closure decision', x, x.evidence, x.closure_decision, x.created_at, null));
    return rows.sort((a, b) => new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime());
  }

  private unique(rows: any[]) {
    const seen = new Set<string>();
    return rows.filter((r) => r?.id && !seen.has(r.id) && seen.add(r.id));
  }
}

export const governanceCaseService = new GovernanceCaseService();
