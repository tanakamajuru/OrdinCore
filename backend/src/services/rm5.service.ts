/**
 * rm5.service.ts — read backend-for-frontend for the RM 5-screen interface (Stage 4).
 * Grounded in the LIVE schema (governance_pulses / risk_signal_links / effectiveness_outcome
 * / signal_clusters.scope), not the handover pack's assumed names. Trajectory comes from the
 * one computed source (Finding K). Read-only; mutations/detail reuse existing endpoints.
 */
import { query } from '../config/database';
import { trajectoryForCluster, trajectoryForRisk, Trajectory } from './trajectory.service';
import { PROMOTION_THRESHOLD } from '../config/governance.constants';
import { risksService } from './risks.service';

const ACTIVE_CLUSTER = `('Emerging','Escalated','Confirmed')`;
const OPEN_ACTION = `NOT IN ('Complete','Completed','Cancelled')`;
const CLOSED_RISK = `('Closed','Resolved')`;

const traj = (t: Trajectory) => ({ dir: t.direction, basis: t.basis, points: t.points });

export const rm5Service = {
  // TODAY — "What needs me now?"
  async today(company_id: string) {
    // Show the whole recent signal inflow (last 7 days, ALL severities), not just High/Critical
    // — every signal should be viewable in the pipeline before/as it forms a pattern, so the
    // RM can see them arriving rather than only discovering them once they cluster. High and
    // Critical are ordered to the top (and carry their severity badge in the UI).
    const todaySignals = (await query(
      `SELECT p.id, h.name AS house, COALESCE(p.related_person, '—') AS person, p.severity::text AS sev,
              to_char(COALESCE(p.created_at, p.entry_date), 'DD Mon') AS d, p.description AS note
         FROM governance_pulses p
         LEFT JOIN houses h ON h.id = p.house_id
        WHERE p.company_id = $1
          AND COALESCE(p.created_at, p.entry_date) >= NOW() - INTERVAL '7 days'
        ORDER BY CASE p.severity::text WHEN 'Critical' THEN 0 WHEN 'High' THEN 1
                   WHEN 'Medium' THEN 2 WHEN 'Moderate' THEN 2 ELSE 3 END,
                 COALESCE(p.created_at, p.entry_date) DESC
        LIMIT 50`,
      [company_id]
    )).rows;
    const actionsDue = (await query(
      `SELECT a.id, a.risk_id AS "riskId", a.title,
              COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned') AS assignee,
              to_char(a.due_date, 'DD Mon') AS due, a.status
         FROM risk_actions a LEFT JOIN users u ON u.id = a.assigned_to
        WHERE a.company_id = $1 AND a.status ${OPEN_ACTION}
        ORDER BY a.due_date ASC NULLS LAST LIMIT 25`,
      [company_id]
    )).rows;
    return { todaySignals, actionsDue };
  },

  // Ribbon counts
  async counts(company_id: string) {
    const one = async (sql: string) => Number((await query(sql, [company_id])).rows[0]?.n || 0);
    return {
      signals: await one(`SELECT COUNT(*) n FROM governance_pulses WHERE company_id=$1 AND COALESCE(created_at, entry_date) >= NOW() - INTERVAL '7 days'`),
      patterns: await one(`SELECT COUNT(*) n FROM signal_clusters WHERE company_id=$1 AND cluster_status IN ${ACTIVE_CLUSTER} AND linked_risk_id IS NULL AND scope='person'`),
      risks: await one(`SELECT COUNT(*) n FROM risks WHERE company_id=$1 AND status NOT IN ${CLOSED_RISK}`),
      actions: await one(`SELECT COUNT(*) n FROM risk_actions WHERE company_id=$1 AND status ${OPEN_ACTION}`),
      effectiveness: await one(`SELECT COUNT(*) n FROM risk_actions WHERE company_id=$1 AND completed_at IS NOT NULL AND effectiveness_outcome IS NULL`),
      escalations: await one(`SELECT COUNT(*) n FROM escalations WHERE company_id=$1 AND COALESCE(lifecycle_status::text, status) NOT IN ('Closed','Resolved','resolved','closed')`),
    };
  },

  // Patterns — within a service + across services (systemic), each with computed trajectory.
  async patterns(company_id: string) {
    const rows = (await query(
      `SELECT c.id, c.risk_domain AS domain, COALESCE(c.linked_person, '—') AS person,
              c.scope, c.signal_count AS "signalCount", c.linked_risk_id AS "promotedRiskId",
              h.name AS house_name, c.affected_house_ids,
              (SELECT array_agg(hh.name ORDER BY hh.name) FROM houses hh WHERE hh.id = ANY(c.affected_house_ids)) AS affected_house_names,
              EXISTS (SELECT 1 FROM risk_signal_links l JOIN governance_pulses p ON p.id = l.pulse_entry_id
                        WHERE l.cluster_id = c.id AND p.severity = 'Critical') AS "hasCritical"
         FROM signal_clusters c LEFT JOIN houses h ON h.id = c.house_id
        WHERE c.company_id = $1 AND c.cluster_status IN ${ACTIVE_CLUSTER}
          -- Decision board = patterns still awaiting a decision. Once a pattern is promoted
          -- to a risk it lives in the register; keeping it here just clogs the board.
          AND c.linked_risk_id IS NULL
        ORDER BY (c.scope = 'cross_service') DESC, c.last_signal_date DESC`,
      [company_id]
    )).rows;
    const shape = async (c: any) => {
      // Same safety floor the cluster board applies: a Safeguarding theme or an in-window
      // Critical can never read calmer than Deteriorating.
      const tr0 = await trajectoryForCluster(c.id);
      const floored = (c.hasCritical || String(c.domain || '').toLowerCase().includes('safeguard'))
        ? 'Deteriorating' : tr0.direction;
      return {
        id: c.id, domain: c.domain, person: c.person,
        scope: c.scope === 'cross_service' ? 'cross_service' : 'service',
        houses: c.scope === 'cross_service' ? (c.affected_house_names || []) : [c.house_name].filter(Boolean),
        signalCount: Number(c.signalCount) || 0, threshold: PROMOTION_THRESHOLD,
        isWatch: (Number(c.signalCount) || 0) < 2, // Finding D display floor
        hasCritical: c.hasCritical, promotedRiskId: c.promotedRiskId || null,
        trajectory: { dir: floored, basis: tr0.basis, points: tr0.points },
      };
    };
    const within: any[] = [], across: any[] = [];
    for (const c of rows) (c.scope === 'cross_service' ? across : within).push(await shape(c));
    return { within, across };
  },

  // Register — risks by type, each with computed trajectory.
  async register(company_id: string, type: 'active' | 'strategic' | 'closed') {
    const where = type === 'closed' ? `r.status IN ${CLOSED_RISK}`
      : type === 'strategic' ? `r.status NOT IN ${CLOSED_RISK} AND r.strategic_theme IS NOT NULL`
      : `r.status NOT IN ${CLOSED_RISK} AND r.strategic_theme IS NULL`;
    const rows = (await query(
      `SELECT r.id, COALESCE(r.strategic_theme, r.title) AS theme, COALESCE(r.linked_person, '—') AS person,
              h.name AS house, r.source_cluster_id AS "sourceClusterId",
              (SELECT COUNT(*) FROM risk_actions a WHERE a.risk_id = r.id AND a.status ${OPEN_ACTION}) AS "openActions"
         FROM risks r LEFT JOIN houses h ON h.id = r.house_id
        WHERE r.company_id = $1 AND ${where}
        ORDER BY r.updated_at DESC NULLS LAST`,
      [company_id]
    )).rows;
    return Promise.all(rows.map(async (r: any) => ({
      id: r.id, theme: r.theme, person: r.person, houses: [r.house].filter(Boolean), type,
      openActions: Number(r.openActions || 0),
      trajectory: traj(await trajectoryForRisk(r.id, r.sourceClusterId)),
    })));
  },

  // Lenses — views that link back to the owning risk (never a second copy).
  async actionsLens(company_id: string) {
    return (await query(
      `SELECT a.id AS key, a.risk_id AS "riskId", a.title,
              (COALESCE(r.strategic_theme, r.title) || ' · '
                || COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned')
                || ' · due ' || COALESCE(to_char(a.due_date,'DD Mon'),'—')) AS meta, a.status
         FROM risk_actions a JOIN risks r ON r.id = a.risk_id
         LEFT JOIN users u ON u.id = a.assigned_to
        WHERE a.company_id = $1 AND a.status ${OPEN_ACTION}
        ORDER BY a.due_date ASC NULLS LAST`,
      [company_id]
    )).rows;
  },

  async effectivenessLens(company_id: string) {
    return (await query(
      `SELECT a.id AS key, a.risk_id AS "riskId", a.title,
              (COALESCE(r.strategic_theme, r.title) || ' · completed '
                || COALESCE(to_char(a.completed_at,'DD Mon'),'—')) AS meta
         FROM risk_actions a JOIN risks r ON r.id = a.risk_id
        WHERE a.company_id = $1 AND a.completed_at IS NOT NULL AND a.effectiveness_outcome IS NULL
        ORDER BY a.completed_at ASC`,
      [company_id]
    )).rows;
  },

  // Escalations lens — open escalations the RM must resolve, each linking back to its risk.
  async escalationsLens(company_id: string) {
    return (await query(
      `SELECT e.id AS key, e.risk_id AS "riskId",
              COALESCE(r.strategic_theme, r.title, i.title, 'Escalation') AS title,
              (COALESCE(h.name, '—')
                || ' · ' || COALESCE(NULLIF(e.priority,''), 'Standard')
                || ' · raised ' || COALESCE(to_char(e.created_at,'DD Mon'),'—')
                || COALESCE(' · ' || NULLIF(u.first_name || ' ' || u.last_name, ' '), '')) AS meta,
              COALESCE(e.lifecycle_status::text, e.status) AS status,
              (e.due_by IS NOT NULL AND e.due_by < NOW() AND e.lifecycle_status <> 'Closed') AS overdue
         FROM escalations e
         LEFT JOIN risks r ON r.id = e.risk_id
         LEFT JOIN incidents i ON i.id = e.incident_id
         LEFT JOIN houses h ON h.id = COALESCE(e.house_id, r.house_id, i.house_id)
         LEFT JOIN users u ON u.id = e.escalated_to
        WHERE e.company_id = $1
          AND COALESCE(e.lifecycle_status::text, e.status) NOT IN ('Closed','Resolved','resolved','closed')
        ORDER BY (e.due_by IS NOT NULL AND e.due_by < NOW()) DESC, e.created_at DESC`,
      [company_id]
    )).rows;
  },

  // Promote a person-level cluster to a formal risk from mobile. The server owns the cluster's
  // data; risksService.promoteFromCluster enforces the promotion floor (>=3 signals or one
  // Critical) and carries the signals across as evidence. The RM's reason is recorded as an event.
  async promotePattern(company_id: string, user_id: string, cluster_id: string, reason?: string) {
    const cl = (await query(
      `SELECT id, risk_domain, linked_person, house_id, scope, cluster_label FROM signal_clusters
        WHERE id = $1 AND company_id = $2`,
      [cluster_id, company_id]
    )).rows[0];
    if (!cl) throw new Error('Pattern not found.');
    if (cl.scope === 'cross_service') throw new Error('Systemic (cross-service) patterns are promoted on the web.');
    if (!cl.house_id) throw new Error('This pattern has no service and cannot be promoted here.');

    const person = cl.linked_person && String(cl.linked_person).toLowerCase() !== 'null' ? cl.linked_person : null;
    const title = cl.cluster_label || `${cl.risk_domain}${person ? ` — ${person}` : ''}`;

    const risk = await risksService.promoteFromCluster(company_id, user_id, {
      cluster_id, title, severity: 'Medium', trajectory: 'Stable',
      description: 'Promoted from pattern (mobile).', house_id: cl.house_id,
      category_id: undefined as any, likelihood: 3, impact: 3,
    });

    const r = String(reason || '').trim();
    if (r) {
      try { await risksService.addEvent(risk.id, company_id, user_id, { event_type: 'promotion_reason', description: `RM reason (mobile): ${r}` }); } catch { /* non-fatal */ }
    }
    return risk;
  },
};
