import { query } from '../config/database';
import { TrajectoryDirection } from './trajectory.service';
import { risksService } from './risks.service';
import { canonicalGovernanceStateService } from './canonicalGovernanceState.service';
import { emitToCompany } from '../websocket/socket.server';
import { EffectivenessOutcome, normalizeEffectiveness } from '../domain/effectiveness';
import { closurePosition } from '../domain/closurePosition';

/**
 * Intervention Effectiveness — refinement of the existing Intervention Panel.
 *
 * IMPORTANT ARCHITECTURAL RULES
 * -----------------------------
 * 1. This service does NOT calculate a second trajectory.
 *    Every underlying risk trajectory is obtained from trajectoryForRisk(), the existing
 *    authoritative trajectory service. The theme card only rolls those authoritative risk
 *    directions up for exception display.
 * 2. Action completion is implementation evidence, NOT effectiveness.
 * 3. Effectiveness is the existing human-reviewed risk_actions.effectiveness_outcome and its
 *    recorded evidence. No percentage effectiveness score is created here.
 * 4. The six-week chart is evidence context only: severity-weighted relevant signals by week.
 * 5. Existing interventions, routes, action links and governance workflow are preserved.
 */

const SEV_WEIGHT = `CASE gp.severity::text WHEN 'Critical' THEN 4 WHEN 'High' THEN 3 WHEN 'Medium' THEN 2 WHEN 'Moderate' THEN 2 ELSE 1 END`;

interface RiskRef {
  id: string;
  source_cluster_id?: string | null;
}

interface ThemeTrajectorySummary {
  direction: TrajectoryDirection;
  label: TrajectoryDirection;
  basis: string;
  counts: {
    improving: number;
    stable: number;
    deteriorating: number;
  };
}

/**
 * This is NOT a trajectory algorithm. It is a display roll-up of already-computed,
 * authoritative risk trajectories so a multi-risk theme can be shown on one card.
 *
 * Exception logic:
 * - any Deteriorating risk -> theme card surfaces Deteriorating;
 * - all risks Improving -> Improving;
 * - otherwise -> Stable/mixed.
 *
 * The underlying risk-level result remains the source of truth and is returned in
 * risk_trajectories for auditability.
 */
function summariseRiskTrajectories(
  items: Array<{ risk_id: string; direction: TrajectoryDirection; basis: string }>
): ThemeTrajectorySummary {
  const counts = {
    improving: items.filter((i) => i.direction === 'Improving').length,
    stable: items.filter((i) => i.direction === 'Stable').length,
    deteriorating: items.filter((i) => i.direction === 'Deteriorating').length,
  };

  let direction: TrajectoryDirection = 'Stable';
  if (counts.deteriorating > 0) direction = 'Deteriorating';
  else if (items.length > 0 && counts.improving === items.length) direction = 'Improving';

  const parts: string[] = [];
  if (counts.deteriorating) parts.push(`${counts.deteriorating} deteriorating`);
  if (counts.stable) parts.push(`${counts.stable} stable`);
  if (counts.improving) parts.push(`${counts.improving} improving`);

  return {
    direction,
    label: direction,
    basis: items.length
      ? `Authoritative risk trajectories: ${parts.join(', ')}.`
      : 'No active risk trajectory is available for this theme.',
    counts,
  };
}

function isClosedRiskStatus(status?: string | null): boolean {
  return ['closed', 'resolved'].includes(String(status || '').trim().toLowerCase());
}

function isPastDate(value: unknown): boolean {
  if (!value) return false;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return false;
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

function attentionReasons(input: {
  trajectory: ThemeTrajectorySummary;
  effectiveness: EffectivenessOutcome | null;
  reviewDate?: string | Date | null;
  overdueActions: number;
}): string[] {
  const reasons: string[] = [];
  if (input.trajectory.direction === 'Deteriorating') reasons.push('Deteriorating trajectory');
  if (input.effectiveness === 'Not Effective') reasons.push('Intervention rated Not Effective');
  if (isPastDate(input.reviewDate) && !input.effectiveness) reasons.push('Effectiveness review overdue');
  if (input.overdueActions > 0) reasons.push(`${input.overdueActions} overdue action${input.overdueActions === 1 ? '' : 's'}`);
  return reasons;
}

function concernOf(
  reasons: string[],
  trajectory: ThemeTrajectorySummary,
  effectiveness: EffectivenessOutcome | null
): string {
  if (effectiveness === 'Not Effective') return 'Review required';
  if (reasons.length > 0) return 'Attention';
  if (trajectory.direction === 'Improving' && effectiveness === 'Effective') return 'Controlled';
  return 'Monitor';
}

// 27 Oct developer instructions ("Correct the closed-risk destination defect"): the single
// place every navigation target (Action button, historical card) resolves its status, by exact
// ID against canonical risk state -- never inferred from membership in a theme's active-risk
// list, which only ever lists CURRENTLY active risks and silently omits an older closed one.
async function resolveActionTargetFor(company_id: string, risk_id: string | null) {
  if (!risk_id) return { risk_id: null, status: null, is_open: false, available: false };
  // 27 Oct developer review: this read raw risks.status directly, despite its own comments
  // describing "canonical risk state" -- a raw status string misses a closure/reopening that
  // changed canonical state without the column itself reflecting it (the same class of drift
  // Services Overview was corrected for). canonical_risk_state_v.is_active/is_closed is the
  // SAME definition every other consumer (themes(), the heat map, Services Overview) uses.
  const row = (await query(
    `SELECT status::text AS status, is_active, is_closed FROM canonical_risk_state_v WHERE id = $1 AND company_id = $2`,
    [risk_id, company_id]
  )).rows[0];
  if (!row) {
    // Missing/unavailable (deleted, cross-tenant id, or a read failure) is its own explicit
    // state -- never silently substituted for another risk or defaulted to "active".
    return { risk_id, status: null, is_open: false, available: false, status_unknown: false };
  }
  // A canonical row that is neither definitively active nor definitively closed (an unmodelled
  // in-between state) is never defaulted to open -- "null/unknown status must remain unknown,
  // not become active" -- but the record itself was genuinely found, so `available` stays true;
  // status_unknown flags the ambiguity separately rather than conflating "not found" with
  // "found but ambiguous".
  const statusUnknown = row.is_active !== true && row.is_closed !== true;
  return { risk_id, status: row.status, is_open: row.is_active === true, available: true, status_unknown: statusUnknown };
}

export const interventionsService = {
  async resolveActionTarget(company_id: string, risk_id: string | null) {
    return resolveActionTargetFor(company_id, risk_id);
  },

  // 27 Oct developer instructions (P1, "Reconcile historical plans without reopening risks").
  // READ-ONLY classification inventory -- deliberately does not transfer work, create tasks or
  // touch any record. "Transfer only unique work into the existing task pathway once... with an
  // idempotent migration mapping so reruns cannot duplicate tasks" needs its own migration/table
  // and careful design review before being automated in a safety-critical governance system; this
  // inventory is the first half (classification) so an RM can see the true position and follow
  // through via the existing My Work / RM Decisions Due queues, which already derive from the
  // same canonical action/effectiveness state used here -- never reopens a risk or creates one.
  async reconciliationInventory(company_id: string) {
    const interventions = (await query(
      `SELECT i.id, i.theme, i.status, i.owner_id, i.review_date, i.started_at, i.updated_at,
              i.linked_risk_id, i.linked_action_id,
              (u.first_name || ' ' || u.last_name) AS owner_name,
              r.status::text AS linked_risk_status,
              ira.status::text AS linked_action_status, ira.completed_at AS linked_action_completed_at,
              COALESCE(ira.effectiveness_outcome, CASE ira.effectiveness::text
                WHEN 'Effective' THEN 'Effective' WHEN 'Neutral' THEN 'Partially Effective'
                WHEN 'Ineffective' THEN 'Not Effective' ELSE NULL END) AS effectiveness_outcome,
              ira.effectiveness_evidence
         FROM interventions i
         LEFT JOIN users u ON u.id = i.owner_id
         LEFT JOIN risks r ON r.id = i.linked_risk_id
         LEFT JOIN risk_actions ira ON ira.id = i.linked_action_id AND ira.company_id = i.company_id
        WHERE i.company_id = $1 AND i.house_id IS NULL
        ORDER BY i.theme`,
      [company_id]
    )).rows;

    const out: any[] = [];
    for (const intv of interventions) {
      const explicitLinks = (await query(
        `SELECT l.action_id, ra.title, ra.status::text AS status, ra.is_completed,
                COALESCE(ra.effectiveness_outcome, ra.effectiveness::text) AS effectiveness,
                ra.due_date
           FROM intervention_action_links l
           JOIN canonical_action_state_v ra ON ra.id = l.action_id AND ra.company_id = l.company_id
          WHERE l.company_id = $1 AND l.intervention_id = $2 AND l.removed_at IS NULL`,
        [company_id, intv.id]
      )).rows;

      const riskClosed = intv.linked_risk_id ? isClosedRiskStatus(intv.linked_risk_status) : null;
      const openLinkedActions = explicitLinks.filter((a: any) => !a.is_completed);
      const awaitingEffectiveness = [
        ...(intv.linked_action_id && intv.linked_action_completed_at && !intv.effectiveness_outcome ? [{ action_id: intv.linked_action_id, title: 'Primary linked action' }] : []),
        ...explicitLinks.filter((a: any) => a.is_completed && !a.effectiveness),
      ];
      const outstandingWork = openLinkedActions.length > 0 || awaitingEffectiveness.length > 0;

      let classification: string;
      if (!intv.linked_risk_id && !intv.linked_action_id && explicitLinks.length === 0) {
        classification = 'unlinked_plan';
      } else if (riskClosed === false) {
        // Linked risk still active -- not this inventory's concern (current, not historical).
        classification = 'current';
      } else if (riskClosed === null) {
        classification = 'ambiguous_review_required'; // no linked risk, but has linked action(s)
      } else if (outstandingWork) {
        classification = 'historical_outstanding_work';
      } else if (intv.effectiveness_outcome || intv.status === 'Complete') {
        classification = 'historical_completed_no_work';
      } else {
        classification = 'ambiguous_review_required';
      }

      out.push({
        intervention_id: intv.id,
        theme: intv.theme,
        plan_status: intv.status,
        owner_id: intv.owner_id,
        owner_name: intv.owner_name,
        review_date: intv.review_date,
        started_at: intv.started_at,
        updated_at: intv.updated_at,
        linked_risk_id: intv.linked_risk_id,
        linked_risk_status: intv.linked_risk_status,
        linked_action_id: intv.linked_action_id,
        linked_action_status: intv.linked_action_status,
        effectiveness_outcome: intv.effectiveness_outcome,
        effectiveness_evidence: intv.effectiveness_evidence,
        explicit_links: explicitLinks,
        classification,
        outstanding_work: outstandingWork
          ? { open_linked_actions: openLinkedActions.map((a: any) => ({ action_id: a.action_id, title: a.title, due_date: a.due_date })),
              awaiting_effectiveness: awaitingEffectiveness }
          : null,
      });
    }
    return out.filter((r) => r.classification !== 'current');
  },

  /**
   * Every active governance theme with:
   * - authoritative risk trajectory roll-up;
   * - clearly-labelled weekly signal evidence;
   * - intervention implementation status;
   * - existing formal effectiveness review/evidence;
   * - explicit exception reasons.
   */
  async themes(company_id: string) {
    const themeRows = (await query(
      `SELECT theme,
              COUNT(DISTINCT risk_id) AS risks,
              COUNT(DISTINCT house_id) FILTER (WHERE house_id IS NOT NULL) AS services,
              COALESCE(SUM(open_actions), 0) AS open_actions,
              COALESCE(SUM(completed_actions), 0) AS completed_actions,
              COALESCE(SUM(overdue_actions), 0) AS overdue_actions,
              (ARRAY_AGG(risk_id ORDER BY risk_created_at DESC NULLS LAST))[1] AS primary_risk_id,
              JSON_AGG(
                JSON_BUILD_OBJECT('id', risk_id, 'source_cluster_id', source_cluster_id,
                                  'title', risk_title, 'status', risk_status,
                                  'impact_rating', risk_impact, 'house_name', house_name,
                                  'open_actions', open_actions, 'created_at', risk_created_at)
                ORDER BY risk_created_at DESC NULLS LAST
              ) AS risk_refs
         FROM (
           SELECT r.id AS risk_id,
                  r.house_id,
                  r.title AS risk_title,
                  r.status::text AS risk_status,
                  r.impact_rating AS risk_impact,
                  (SELECT h.name FROM houses h WHERE h.id = r.house_id) AS house_name,
                  r.created_at AS risk_created_at,
                  r.source_cluster_id,
                  COALESCE(NULLIF(TRIM(r.risk_domain), ''), NULLIF(TRIM(r.strategic_theme), ''), r.title) AS theme,
                  (SELECT COUNT(*) FROM canonical_action_state_v ra
                    WHERE ra.risk_id = r.id
                      AND ra.is_open) AS open_actions,
                  (SELECT COUNT(*) FROM canonical_action_state_v ra
                    WHERE ra.risk_id = r.id
                      AND ra.is_completed) AS completed_actions,
                  (SELECT COUNT(*) FROM canonical_action_state_v ra
                    WHERE ra.risk_id = r.id
                      AND ra.is_open
                      AND ra.due_date IS NOT NULL
                      AND ra.due_date::date < CURRENT_DATE) AS overdue_actions
             FROM canonical_risk_state_v r
            WHERE r.company_id = $1
              AND r.is_active
         ) t
        WHERE theme IS NOT NULL AND TRIM(theme) <> ''
        GROUP BY theme
        ORDER BY services DESC, risks DESC`,
      [company_id]
    )).rows;

    // Reuse the existing intervention row and its existing linked risk action.
    // The action effectiveness outcome is the formal human-reviewed effectiveness judgement.
    const interventions = (await query(
      `SELECT i.*,
              (u.first_name || ' ' || u.last_name) AS owner_name,
              ira.status AS linked_action_status,
              ira.due_date AS linked_action_due_date,
              ira.completed_at AS linked_action_completed_at,
              ira.assigned_to AS linked_action_assigned_to,
              COALESCE(
                ira.effectiveness_outcome,
                CASE ira.effectiveness::text
                  WHEN 'Effective' THEN 'Effective'
                  WHEN 'Neutral' THEN 'Partially Effective'
                  WHEN 'Ineffective' THEN 'Not Effective'
                  ELSE NULL
                END
              ) AS effectiveness_outcome,
              ira.effectiveness_evidence,
              ira.effectiveness_reviewed_at,
              ira.effectiveness_reviewed_by,
              COALESCE((
                SELECT JSON_AGG(JSON_BUILD_OBJECT(
                  'id', ioe.id, 'actor_role', ioe.actor_role, 'event_type', ioe.event_type,
                  'narrative', ioe.narrative, 'created_at', ioe.created_at,
                  'actor_name', NULLIF(TRIM(COALESCE(eu.first_name,'') || ' ' || COALESCE(eu.last_name,'')), '')
                ) ORDER BY ioe.created_at DESC)
                FROM intervention_oversight_events ioe
                LEFT JOIN users eu ON eu.id = ioe.actor_id
                WHERE ioe.intervention_id = i.id AND ioe.company_id = i.company_id
              ), '[]'::json) AS oversight_events
         FROM interventions i
         LEFT JOIN users u ON u.id = i.owner_id
         LEFT JOIN risk_actions ira
           ON ira.id = i.linked_action_id
          AND ira.company_id = i.company_id
        WHERE i.company_id = $1
          AND i.house_id IS NULL`,
      [company_id]
    )).rows;

    const intvByTheme = new Map<string, any>();
    for (const i of interventions) intvByTheme.set(String(i.theme).toLowerCase(), i);

    const out: any[] = [];

    for (const t of themeRows) {
      const riskRefs: RiskRef[] = Array.isArray(t.risk_refs) ? t.risk_refs : [];

      // Consume the existing authoritative trajectory service. No computeTrajectory() here.
      const riskTrajectories: Array<{ risk_id: string; direction: TrajectoryDirection; basis: string }> = [];
      for (const ref of riskRefs) {
        if (!ref?.id) continue;
        try {
          const tr = await canonicalGovernanceStateService.trajectory(ref.id, ref.source_cluster_id || null);
          riskTrajectories.push({ risk_id: ref.id, direction: tr.direction, basis: tr.basis });
        } catch {
          // A failed trajectory read must not create an alternative trajectory.
          // Omit that item and let the authoritative risk surface remain the source of truth.
        }
      }

      const intv = intvByTheme.get(String(t.theme).toLowerCase()) || null;
      const trajectory = summariseRiskTrajectories(riskTrajectories);
      const linkedPattern = intv?.linked_risk_id
        ? riskRefs.find((r) => r.id === intv.linked_risk_id)?.source_cluster_id || null
        : null;
      const timeline = await this.themeTimeline(company_id, t.theme, 6, linkedPattern);

      if (intv?.started_at) {
        const started = new Date(intv.started_at).getTime();
        let best = -1;
        let bestDelta = Infinity;
        timeline.forEach((w: any, idx: number) => {
          const d = Math.abs(new Date(w.weekStart).getTime() - started);
          if (d < bestDelta) {
            bestDelta = d;
            best = idx;
          }
        });
        if (best >= 0) timeline[best].interventionStarted = true;
      }

      const effectiveness = normalizeEffectiveness(intv?.effectiveness_outcome);
      const overdueActions = Number(t.overdue_actions) || 0;
      const reasons = attentionReasons({
        trajectory,
        effectiveness,
        reviewDate: intv?.review_date || null,
        overdueActions,
      });

      const evidenceComparison = intv?.started_at
        ? await this.themeEvidenceComparison(company_id, t.theme, intv.started_at)
        : null;

      // Theme readiness is a roll-up of the authoritative risk-level closure reviews. It must
      // never invent a looser rule or confuse "no new risk record" with "no linked signal".
      const openRiskRefs = riskRefs.filter((r: any) => !['closed', 'resolved'].includes(String(r.status || '').toLowerCase()));
      const riskClosureReviews: Array<{ risk_id: string; eligible: boolean; blockers: string[] }> = [];
      for (const ref of openRiskRefs) {
        try {
          const review = await canonicalGovernanceStateService.closure(ref.id, company_id);
          riskClosureReviews.push({ risk_id: ref.id, eligible: review.eligible, blockers: review.blockers });
        } catch {
          riskClosureReviews.push({ risk_id: ref.id, eligible: false, blockers: ['Closure evidence could not be verified.'] });
        }
      }
      const readyToClose = effectiveness === 'Effective'
        && openRiskRefs.length > 0
        && riskClosureReviews.every((review) => review.eligible);
      const readyToCloseReason = readyToClose
        ? 'Intervention effective · every open risk passed its canonical closure review — ready for an RM closure decision.'
        : null;
      const uniqueBlockers = Array.from(new Set(riskClosureReviews.flatMap((r) => r.blockers || [])));
      const canonicalClosurePosition = closurePosition({
        interventionExists: !!intv,
        effectiveness,
        blockers: uniqueBlockers,
      });

      // 27 Oct developer instructions ("Correct the closed-risk destination defect"): the prior
      // version resolved the Action button's target by looking it up in riskRefs, which lists
      // ONLY this theme's currently-ACTIVE risks. If the intervention's linked_risk_id is an
      // OLDER risk that has since closed, it is no longer active for this theme and is simply
      // absent from riskRefs -- actionRiskStatus fell through to null, and
      // !isClosedRiskStatus(null) evaluated to true, so a genuinely closed risk read as "Open
      // active risk". Resolve every target by its exact ID against canonical risk state,
      // independent of the active theme list, and never infer active from a missing status.
      const actionRiskId = intv?.linked_risk_id || t.primary_risk_id || null;
      const actionTarget = await this.resolveActionTarget(company_id, actionRiskId);
      // Per brief: if the intervention's own linked risk differs from the theme's current
      // primary risk, expose both with their distinct statuses rather than silently picking one.
      const currentRiskTarget = (intv?.linked_risk_id && t.primary_risk_id && intv.linked_risk_id !== t.primary_risk_id)
        ? await this.resolveActionTarget(company_id, t.primary_risk_id)
        : null;

      out.push({
        theme: t.theme,
        services: Number(t.services) || 0,
        risks: Number(t.risks) || 0,
        primary_risk_id: t.primary_risk_id || null,
        action_target: actionTarget,
        current_risk_target: currentRiskTarget,

        // Implementation evidence — deliberately separate from effectiveness.
        openActions: Number(t.open_actions) || 0,
        completedActions: Number(t.completed_actions) || 0,
        overdueActions,
        implementation: {
          completed: Number(t.completed_actions) || 0,
          total: (Number(t.open_actions) || 0) + (Number(t.completed_actions) || 0),
          overdue: overdueActions,
        },

        // Display roll-up only; each risk-level item is authoritative.
        trajectory,
        risk_trajectories: riskTrajectories,

        // Explicitly label what the chart measures. It is NOT trajectory calculation output.
        timeline_metric: 'Weighted signal burden',
        timeline,

        needsAttention: reasons.length > 0,
        attentionReasons: reasons,
        concern: readyToClose ? 'Ready for closure review' : concernOf(reasons, trajectory, effectiveness),
        readyToClose,
        readyToCloseReason,
        closure_position: canonicalClosurePosition,
        closure_readiness: { eligible: readyToClose, source: 'risk-closure-review', risks: riskClosureReviews },

        intervention: intv
          ? {
              id: intv.id,
              intervention: intv.intervention,
              status: intv.status,
              owner_id: intv.owner_id,
              owner_name: intv.owner_name,
              owner_role: intv.owner_role,
              expected_outcome: intv.expected_outcome,
              review_date: intv.review_date,
              started_at: intv.started_at,
              // 25 Oct brief ("Dates"): last_reviewed_at must come from an applicable REVIEW
              // event only — it previously fell back to updated_at, so an unrelated text edit
              // (e.g. changing the owner) silently relabelled itself as a review having
              // happened. last_updated_at is now its own explicit field.
              last_reviewed_at: intv.effectiveness_reviewed_at || null,
              last_updated_at: intv.updated_at || null,
              linked_risk_id: intv.linked_risk_id,
              linked_action_id: intv.linked_action_id,
              linked_action_status: intv.linked_action_status,
              linked_action_due_date: intv.linked_action_due_date,
              linked_action_completed_at: intv.linked_action_completed_at,
              // Where the assigned work is in its lifecycle, so the RM can see it has been done and
              // is awaiting an effectiveness verdict: assigned → completed → effectiveness rated.
              linked_action_stage: !intv.linked_action_id ? null
                : intv.linked_action_completed_at
                  ? (intv.effectiveness_outcome ? 'Effectiveness rated' : 'Completed · awaiting effectiveness')
                  : 'Assigned · in progress',

              // Formal effectiveness is reused from existing action-effectiveness governance.
              effectiveness_review: {
                outcome: effectiveness,
                evidence: intv.effectiveness_evidence || null,
                reviewed_at: intv.effectiveness_reviewed_at || null,
                reviewed_by: intv.effectiveness_reviewed_by || null,
              },

              // Observable pre/post evidence; no invented risk percentage.
              evidence_comparison: evidenceComparison,
              oversight_events: Array.isArray(intv.oversight_events) ? intv.oversight_events : [],
            }
          : null,
      });
    }

    // Bug fix (24 Oct developer corrections, "Existing plans disappear when active risks end"):
    // themeRows above is built ONLY from active risks (line ~166 "r.is_active"), and this loop
    // only ever iterates themeRows — so the moment a theme's last active risk closes, its theme
    // entirely stops existing here and the loop above never reaches it, even though the
    // intervention row (already fetched into `interventions`/`intvByTheme`) is still there.
    // Surface those orphaned interventions as their own historical cards: risks=0 and
    // services=0 are honest (none are active), never fabricated; the intervention and its
    // linked-action history stay retrievable. Never reopens a risk or relabels a closed one active.
    const coveredThemes = new Set(themeRows.map((t: any) => String(t.theme).toLowerCase()));
    const orphaned = interventions.filter((intv) => !coveredThemes.has(String(intv.theme).toLowerCase()));

    // 25 Oct brief (P1, "Derive historical status from actual records"): a missing active-theme
    // match only proves no ACTIVE risk remains under this theme — it does not prove the
    // intervention's own linked risk is closed, or that it was ever linked at all. Look up the
    // real status of each one in a single batch so the card and its Action button can say which
    // case this is, instead of a single blanket "No active risk" label for all three.
    // 27 Oct developer review: "Handle historical targets through the same resolver" -- this
    // used to run its own ad-hoc batch query against raw risks.status; now reuses the SAME
    // resolveActionTargetFor() the active-theme branch uses, so a historical card's status can
    // never drift from the canonical definition the rest of the screen relies on.
    const orphanedTargets = new Map<string, Awaited<ReturnType<typeof resolveActionTargetFor>>>();
    for (const intv of orphaned) {
      if (intv.linked_risk_id && !orphanedTargets.has(intv.linked_risk_id)) {
        orphanedTargets.set(intv.linked_risk_id, await resolveActionTargetFor(company_id, intv.linked_risk_id));
      }
    }

    for (const intv of orphaned) {
      const key = String(intv.theme).toLowerCase();
      coveredThemes.add(key); // interventions is already one row per theme (house_id IS NULL)

      const effectiveness = normalizeEffectiveness(intv.effectiveness_outcome);
      const actionTarget = intv.linked_risk_id
        ? (orphanedTargets.get(intv.linked_risk_id) || { risk_id: intv.linked_risk_id, status: null, is_open: false, available: false, status_unknown: false })
        : { risk_id: null, status: null, is_open: false, available: false, status_unknown: false };
      const historicalReason = !intv.linked_risk_id
        ? 'This plan was never linked to a delivery risk — no active risk exists for this theme.'
        : !actionTarget.available
          ? 'The linked risk for this theme could not be found — it may have been removed.'
          : actionTarget.status_unknown
            ? 'The linked risk for this theme has an unrecognised status — treat as unresolved and review manually.'
            : !actionTarget.is_open
              ? 'The linked risk for this theme is closed — the plan and its history are retained.'
              : 'No active risk remains for this theme — the plan and its history are retained.';
      out.push({
        theme: intv.theme,
        services: 0,
        risks: 0,
        primary_risk_id: intv.linked_risk_id || null,
        action_target: actionTarget,
        historical: true,
        historical_reason: historicalReason,
        openActions: 0, completedActions: 0, overdueActions: 0,
        implementation: { completed: 0, total: 0, overdue: 0 },
        // Full ThemeTrajectorySummary shape (25 Oct developer brief, "Trajectory" fix): the
        // frontend reads `trajectory.label`, and a historical card previously supplied only
        // `direction`, so the UI's `|| fallback` silently rendered "Stable" for a theme the
        // engine explicitly has no evidence for. Supply the real label so that fallback never
        // fires here.
        trajectory: { direction: 'Insufficient evidence', label: 'Insufficient evidence', basis: 'No active risk — theme closed.', counts: { improving: 0, stable: 0, deteriorating: 0 } },
        risk_trajectories: [],
        timeline_metric: 'Weighted signal burden', timeline: [],
        needsAttention: false, attentionReasons: [],
        concern: 'Historical — no active risk', readyToClose: false, readyToCloseReason: null,
        closure_position: 'closed', closure_readiness: { eligible: false, source: 'risk-closure-review', risks: [] },
        intervention: {
          id: intv.id, intervention: intv.intervention, status: intv.status,
          owner_id: intv.owner_id, owner_name: intv.owner_name, owner_role: intv.owner_role,
          expected_outcome: intv.expected_outcome, review_date: intv.review_date, started_at: intv.started_at,
          last_reviewed_at: intv.effectiveness_reviewed_at || null,
          last_updated_at: intv.updated_at || null,
          linked_risk_id: intv.linked_risk_id, linked_action_id: intv.linked_action_id,
          linked_action_status: intv.linked_action_status, linked_action_due_date: intv.linked_action_due_date,
          linked_action_completed_at: intv.linked_action_completed_at,
          linked_action_stage: !intv.linked_action_id ? null
            : intv.linked_action_completed_at
              ? (intv.effectiveness_outcome ? 'Effectiveness rated' : 'Completed · awaiting effectiveness')
              : 'Assigned · in progress',
          effectiveness_review: {
            outcome: effectiveness, evidence: intv.effectiveness_evidence || null,
            reviewed_at: intv.effectiveness_reviewed_at || null, reviewed_by: intv.effectiveness_reviewed_by || null,
          },
          evidence_comparison: null,
          oversight_events: Array.isArray(intv.oversight_events) ? intv.oversight_events : [],
        },
      });
    }

    return out;
  },

  /**
   * Six-week context chart. Each bar is severity-weighted RELEVANT SIGNAL BURDEN for the theme.
   * Zero weeks are retained. This chart is evidence context only and never decides trajectory.
   */
  async themeTimeline(company_id: string, theme: string, weeks = 6, source_cluster_id?: string | null) {
    const rows = (await query(
      `SELECT date_trunc('week', COALESCE(
                (gp.entry_date::date+COALESCE(gp.entry_time,TIME '00:00')) AT TIME ZONE 'Europe/London',gp.created_at
              ) AT TIME ZONE 'Europe/London') AS wk,
              SUM(${SEV_WEIGHT})::float AS weight
         FROM governance_pulses gp
        WHERE gp.company_id = $1
          AND gp.risk_domain && ARRAY[$2]::text[]
          AND ($4::uuid IS NULL OR EXISTS (
                SELECT 1 FROM risk_signal_links rsl
                 WHERE rsl.cluster_id=$4::uuid AND rsl.pulse_entry_id=gp.id))
          AND COALESCE((gp.entry_date::date+COALESCE(gp.entry_time,TIME '00:00')) AT TIME ZONE 'Europe/London',gp.created_at)
              >= date_trunc('week', NOW() AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London' - ($3::int - 1) * INTERVAL '1 week'
        GROUP BY wk
        ORDER BY wk ASC`,
      [company_id, theme, weeks, source_cluster_id || null]
    )).rows;

    const byWeek = new Map<string, number>();
    for (const r of rows) {
      byWeek.set(new Date(r.wk).toISOString().slice(0, 10), Number(r.weight) || 0);
    }

    const frame: any[] = [];
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    for (let i = weeks - 1; i >= 0; i--) {
      const ws = new Date(monday);
      ws.setDate(monday.getDate() - i * 7);
      const key = ws.toISOString().slice(0, 10);
      frame.push({
        weekStart: key,
        label: `Week ${weeks - i}`,
        weight: byWeek.get(key) || 0,
        interventionStarted: false,
      });
    }

    return frame;
  },

  /**
   * Observable before/after evidence around the intervention start date.
   *
   * BEFORE: full 14 days immediately before started_at.
   * AFTER: up to 14 days from started_at, capped at now.
   *
   * If fewer than 14 post-intervention days have elapsed, the payload explicitly marks the
   * window incomplete. We show evidence but do not turn it into a percentage claim.
   */
  async themeEvidenceComparison(company_id: string, theme: string, started_at: string | Date) {
    const result = (await query(
      `WITH bounds AS (
         SELECT $3::timestamptz AS started_at,
                $3::timestamptz - INTERVAL '14 days' AS before_start,
                LEAST(NOW(), $3::timestamptz + INTERVAL '14 days') AS after_end
       )
       SELECT
         COUNT(*) FILTER (
           WHERE COALESCE(gp.created_at, gp.entry_date::timestamptz) >= b.before_start
             AND COALESCE(gp.created_at, gp.entry_date::timestamptz) < b.started_at
         )::int AS before_count,
         COALESCE(SUM(${SEV_WEIGHT}) FILTER (
           WHERE COALESCE(gp.created_at, gp.entry_date::timestamptz) >= b.before_start
             AND COALESCE(gp.created_at, gp.entry_date::timestamptz) < b.started_at
         ), 0)::float AS before_weight,
         COUNT(*) FILTER (
           WHERE COALESCE(gp.created_at, gp.entry_date::timestamptz) >= b.started_at
             AND COALESCE(gp.created_at, gp.entry_date::timestamptz) < b.after_end
         )::int AS after_count,
         COALESCE(SUM(${SEV_WEIGHT}) FILTER (
           WHERE COALESCE(gp.created_at, gp.entry_date::timestamptz) >= b.started_at
             AND COALESCE(gp.created_at, gp.entry_date::timestamptz) < b.after_end
         ), 0)::float AS after_weight,
         COUNT(*) FILTER (
           WHERE gp.severity::text IN ('Critical','High')
             AND COALESCE(gp.created_at, gp.entry_date::timestamptz) >= b.before_start
             AND COALESCE(gp.created_at, gp.entry_date::timestamptz) < b.started_at
         )::int AS before_high_critical,
         COUNT(*) FILTER (
           WHERE gp.severity::text IN ('Critical','High')
             AND COALESCE(gp.created_at, gp.entry_date::timestamptz) >= b.started_at
             AND COALESCE(gp.created_at, gp.entry_date::timestamptz) < b.after_end
         )::int AS after_high_critical,
         b.started_at,
         b.after_end,
         (NOW() >= b.started_at + INTERVAL '14 days') AS after_window_complete,
         GREATEST(0, LEAST(14, CEIL(EXTRACT(EPOCH FROM (LEAST(NOW(), b.started_at + INTERVAL '14 days') - b.started_at)) / 86400.0)))::int AS after_days_observed
       FROM governance_pulses gp
       CROSS JOIN bounds b
       WHERE gp.company_id = $1
         AND gp.risk_domain && ARRAY[$2]::text[]
         AND COALESCE(gp.created_at, gp.entry_date::timestamptz) >= b.before_start
         AND COALESCE(gp.created_at, gp.entry_date::timestamptz) < b.after_end
       GROUP BY b.started_at, b.after_end`,
      [company_id, theme, started_at]
    )).rows[0];

    // When there are no matching pulses at all, PostgreSQL's WHERE + aggregate still returns
    // one grouped row because bounds is present only when rows survive. Build a safe zero result.
    if (!result) {
      const started = new Date(started_at);
      const now = new Date();
      const elapsedDays = Math.max(0, Math.min(14, Math.ceil((now.getTime() - started.getTime()) / 86400000)));
      return {
        before: { days: 14, signal_count: 0, weighted_burden: 0, high_or_critical: 0 },
        after: { days_observed: elapsedDays, signal_count: 0, weighted_burden: 0, high_or_critical: 0 },
        after_window_complete: now.getTime() >= started.getTime() + 14 * 86400000,
      };
    }

    return {
      before: {
        days: 14,
        signal_count: Number(result.before_count) || 0,
        weighted_burden: Number(result.before_weight) || 0,
        high_or_critical: Number(result.before_high_critical) || 0,
      },
      after: {
        days_observed: Number(result.after_days_observed) || 0,
        signal_count: Number(result.after_count) || 0,
        weighted_burden: Number(result.after_weight) || 0,
        high_or_critical: Number(result.after_high_critical) || 0,
      },
      after_window_complete: Boolean(result.after_window_complete),
    };
  },

  /**
   * Existing intervention upsert flow retained.
   *
   * The old risk_index_before snapshot is intentionally no longer written for new/updated
   * interventions because the UI no longer claims a percentage change in a synthetic Risk Index.
   * Existing historic risk_index_before values remain untouched in the database for audit/history.
   */
  async upsertIntervention(company_id: string, user_id: string, data: {
    theme: string;
    house_id?: string | null;
    intervention: string;
    status?: string;
    owner_id?: string | null;
    owner_role?: string | null;
    expected_outcome?: string | null;
    review_date?: string | null;
    started?: boolean;
  }) {
    if (!data.theme || !String(data.theme).trim()) throw new Error('A theme is required.');
    if (!data.intervention || !String(data.intervention).trim()) throw new Error('Describe the intervention.');

    const status =
      ['Planned', 'In Progress', 'Complete', 'On Hold'].find(
        (s) => s.toLowerCase() === String(data.status || '').toLowerCase()
      ) || 'Planned';

    const starting = Boolean(data.started || status === 'In Progress');
    const startedAt = starting ? new Date() : null;

    // Activating a plan commits leadership to delivering it, so it must have an accountable owner and
    // an expected outcome before it goes active (intervention brief §4). Draft states (Planned / On
    // Hold) stay permissive so incomplete legacy plans remain visible with their gaps, rather than
    // being blocked or silently "activated" without accountability.
    if (starting || status === 'Complete') {
      if (!data.owner_id) throw new Error('Assign an accountable owner before activating this plan.');
      if (!data.expected_outcome || !String(data.expected_outcome).trim()) {
        throw new Error('Record the expected outcome before activating this plan.');
      }
    }

    const res = await query(
      `INSERT INTO interventions
         (company_id, theme, house_id, owner_id, owner_role, intervention, status,
          expected_outcome, review_date, started_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (company_id, theme, COALESCE(house_id, '00000000-0000-0000-0000-000000000000'::uuid))
       DO UPDATE SET
         owner_id = EXCLUDED.owner_id,
         owner_role = EXCLUDED.owner_role,
         intervention = EXCLUDED.intervention,
         status = EXCLUDED.status,
         expected_outcome = EXCLUDED.expected_outcome,
         review_date = EXCLUDED.review_date,
         started_at = COALESCE(interventions.started_at, EXCLUDED.started_at),
         updated_at = NOW()
       RETURNING *`,
      [
        company_id,
        String(data.theme).trim(),
        data.house_id || null,
        data.owner_id || null,
        data.owner_role || null,
        String(data.intervention).trim(),
        status,
        data.expected_outcome || null,
        data.review_date || null,
        startedAt,
        user_id,
      ]
    );

    const intv = res.rows[0];

    // Existing doctrine-safe action linkage is preserved unchanged:
    // intervention -> existing systemic risk, or promotion from a qualifying cross-service
    // pattern only. Never fabricate a risk without provenance.
    if (starting && intv && !intv.linked_action_id) {
      let topRisk = (await query(
        `SELECT id FROM canonical_risk_state_v
          WHERE company_id = $1
            AND is_active
            AND COALESCE(services_affected_count, 1) > 1
            AND COALESCE(NULLIF(TRIM(risk_domain), ''), NULLIF(TRIM(strategic_theme), ''), title) = $2
          ORDER BY COALESCE(risk_index, 0) DESC
          LIMIT 1`,
        [company_id, String(data.theme).trim()]
      )).rows[0];

      if (!topRisk) {
        const cluster = (await query(
          `SELECT id FROM signal_clusters
            WHERE company_id = $1
              AND scope = 'cross_service'
              AND linked_risk_id IS NULL
              AND cluster_status <> 'Dismissed'
              AND risk_domain::text = $2
            ORDER BY signal_count DESC NULLS LAST
            LIMIT 1`,
          [company_id, String(data.theme).trim()]
        )).rows[0];

        if (cluster) {
          try {
            const promoted = await risksService.promoteFromCluster(company_id, user_id, {
              cluster_id: cluster.id,
              title: `Systemic ${String(data.theme).trim()}`,
              severity: 'Medium',
              trajectory: 'Stable',
              description: `Systemic (cross-service) risk promoted while setting a leadership intervention for the ${data.theme} theme.`,
              house_id: null as any,
              category_id: undefined as any,
              likelihood: 3,
              impact: 3,
            });
            if (promoted?.id) topRisk = { id: promoted.id };
          } catch {
            // Promotion floor not met: preserve the standalone intervention.
          }
        }
      }

      if (topRisk) {
        try {
          const action = await risksService.addAction(topRisk.id, company_id, user_id, {
            title: `Intervention: ${String(data.intervention).trim()}`,
            description: data.expected_outcome
              ? `Expected outcome: ${data.expected_outcome}`
              : `Leadership intervention for the ${data.theme} theme.`,
            assigned_to: data.owner_id || undefined,
            due_date: data.review_date ? new Date(data.review_date) : undefined,
            intended_outcome: data.expected_outcome || undefined,
            review_requirement: 'EFFECTIVENESS_REQUIRED',
          });

          await query(
            `UPDATE interventions
                SET linked_risk_id = $1,
                    linked_action_id = $2
              WHERE id = $3`,
            [topRisk.id, action.id, intv.id]
          );

          intv.linked_risk_id = topRisk.id;
          intv.linked_action_id = action.id;
      } catch (error) {
        // Do not report a closed loop when its actionable link failed.
        throw new Error(`Intervention saved but its required risk action could not be created: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      }
    }

    // Propagate intervention edits to the risk register: keep the linked risk action in step with
    // the intervention (title, expected outcome, owner and review/due date) so "Update intervention"
    // updates the risk record too — not just the intervention row. Action COMPLETION is separate
    // evidence and is never auto-set here.
    if (intv?.linked_action_id) {
      try {
        // Bug fix (24 Oct developer corrections, "Clearing review date leaves stale action
        // deadline"): the intervention's own upsert (line ~558) clears review_date to NULL when
        // blank, matching EXCLUDED.review_date directly. This sync used COALESCE($5, due_date)
        // for the linked action's due_date -- COALESCE falls through to the EXISTING due_date
        // whenever $5 is null, so clearing the intervention's review date never actually cleared
        // the linked action's deadline; the two records silently disagreed from then on. due_date
        // now always takes exactly what the intervention's review_date resolves to (null when
        // cleared), the same direct-assignment rule already used for title/description above.
        await query(
          `UPDATE risk_actions
              SET title = $1,
                  description = $2,
                  intended_outcome = COALESCE($3, intended_outcome),
                  assigned_to = COALESCE($4, assigned_to),
                  due_date = $5,
                  updated_at = NOW()
            WHERE id = $6 AND company_id = $7`,
          [
            `Intervention: ${String(data.intervention).trim()}`,
            data.expected_outcome ? `Expected outcome: ${data.expected_outcome}` : `Leadership intervention for the ${data.theme} theme.`,
            data.expected_outcome ? String(data.expected_outcome).trim() : null,
            data.owner_id || null,
            data.review_date ? new Date(data.review_date) : null,
            intv.linked_action_id,
            company_id,
          ]
        );
      } catch (error) {
        // A linked intervention and action are one governance pathway. Silent divergence is not
        // acceptable: surface the failure so the caller cannot show a false success message.
        throw new Error(`Intervention/action synchronisation failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    // Bug fix (24 Oct developer corrections, "Delivery task missing despite assignment
    // notification"): starting a plan only creates a linked_action_id when an eligible
    // cross-service risk exists or a qualifying pattern successfully promotes (lines 582-655
    // above) — neither is guaranteed. This notification previously fired unconditionally
    // whenever an owner was set, claiming "a governance action was assigned" and linking to
    // My Actions even when linked_action_id stayed null, so the owner opened My Actions to find
    // nothing there. Only send the real task-assigned notification when a delivery action
    // genuinely exists; otherwise tell the owner honestly that a plan was saved without one.
    if (data.owner_id && intv) {
      try {
        const { notificationsService } = await import('./notifications.service');
        if (intv.linked_action_id) {
          await notificationsService.create({
            company_id,
            user_id: data.owner_id,
            type: 'task_assigned',
            title: 'Governance action assigned to you',
            body: `Intervention: ${String(data.intervention).trim()}${data.review_date ? ` · due ${new Date(data.review_date).toLocaleDateString('en-GB')}` : ''}`,
            link: '/my-actions',
            metadata: { intervention_id: intv.id, risk_id: intv.linked_risk_id || null, action_id: intv.linked_action_id },
          });
        } else {
          await notificationsService.create({
            company_id,
            user_id: data.owner_id,
            type: 'intervention_plan_saved',
            title: 'An intervention plan was saved for you',
            body: `${String(data.theme).trim()}: ${String(data.intervention).trim()} — saved as a plan; no delivery action could be linked yet.`,
            link: '/interventions',
            metadata: { intervention_id: intv.id, risk_id: intv.linked_risk_id || null },
          });
        }
      } catch {
        // best-effort — the intervention is saved regardless of notification delivery.
      }
    }

    emitToCompany(company_id, 'intervention.updated', {
      intervention_id: intv.id,
      theme: intv.theme,
      linked_risk_id: intv.linked_risk_id || null,
      linked_action_id: intv.linked_action_id || null,
      updated_by: user_id,
    });

    return intv;
  },
};
