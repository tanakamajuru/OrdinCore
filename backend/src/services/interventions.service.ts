import { query } from '../config/database';
import { trajectoryForRisk, TrajectoryDirection } from './trajectory.service';
import { risksService } from './risks.service';

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

type EffectivenessOutcome = 'Effective' | 'Partially Effective' | 'Not Effective' | 'Too Early To Assess';

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

function normalizeEffectiveness(value: unknown): EffectivenessOutcome | null {
  const v = String(value || '').trim();
  if (v === 'Effective') return 'Effective';
  if (v === 'Partially Effective' || v === 'Neutral') return 'Partially Effective';
  if (v === 'Not Effective' || v === 'Ineffective') return 'Not Effective';
  if (v === 'Too Early To Assess') return 'Too Early To Assess';
  return null;
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

export const interventionsService = {
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
                                  'open_actions', open_actions)
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
                  (SELECT COUNT(*) FROM risk_actions ra
                    WHERE ra.risk_id = r.id
                      AND ra.status NOT IN ('Complete','Completed','Cancelled')) AS open_actions,
                  (SELECT COUNT(*) FROM risk_actions ra
                    WHERE ra.risk_id = r.id
                      AND ra.status IN ('Complete','Completed')) AS completed_actions,
                  (SELECT COUNT(*) FROM risk_actions ra
                    WHERE ra.risk_id = r.id
                      AND ra.status NOT IN ('Complete','Completed','Cancelled')
                      AND ra.due_date IS NOT NULL
                      AND ra.due_date::date < CURRENT_DATE) AS overdue_actions
             FROM risks r
            WHERE r.company_id = $1
              AND LOWER(r.status::text) NOT IN ('closed','resolved')
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
              ira.effectiveness_reviewed_by
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
          const tr = await trajectoryForRisk(ref.id, ref.source_cluster_id || null);
          riskTrajectories.push({ risk_id: ref.id, direction: tr.direction, basis: tr.basis });
        } catch {
          // A failed trajectory read must not create an alternative trajectory.
          // Omit that item and let the authoritative risk surface remain the source of truth.
        }
      }

      const trajectory = summariseRiskTrajectories(riskTrajectories);
      const timeline = await this.themeTimeline(company_id, t.theme, 6);
      const intv = intvByTheme.get(String(t.theme).toLowerCase()) || null;

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

      out.push({
        theme: t.theme,
        services: Number(t.services) || 0,
        risks: Number(t.risks) || 0,
        primary_risk_id: t.primary_risk_id || null,

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
        concern: concernOf(reasons, trajectory, effectiveness),

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
              last_reviewed_at: intv.effectiveness_reviewed_at || intv.updated_at,
              linked_risk_id: intv.linked_risk_id,
              linked_action_id: intv.linked_action_id,
              linked_action_status: intv.linked_action_status,
              linked_action_due_date: intv.linked_action_due_date,

              // Formal effectiveness is reused from existing action-effectiveness governance.
              effectiveness_review: {
                outcome: effectiveness,
                evidence: intv.effectiveness_evidence || null,
                reviewed_at: intv.effectiveness_reviewed_at || null,
                reviewed_by: intv.effectiveness_reviewed_by || null,
              },

              // Observable pre/post evidence; no invented risk percentage.
              evidence_comparison: evidenceComparison,
            }
          : null,
      });
    }

    return out;
  },

  /**
   * Six-week context chart. Each bar is severity-weighted RELEVANT SIGNAL BURDEN for the theme.
   * Zero weeks are retained. This chart is evidence context only and never decides trajectory.
   */
  async themeTimeline(company_id: string, theme: string, weeks = 6) {
    const rows = (await query(
      `SELECT date_trunc('week', COALESCE(gp.created_at, gp.entry_date::timestamptz)) AS wk,
              SUM(${SEV_WEIGHT})::float AS weight
         FROM governance_pulses gp
        WHERE gp.company_id = $1
          AND gp.risk_domain && ARRAY[$2]::text[]
          AND COALESCE(gp.created_at, gp.entry_date::timestamptz)
              >= date_trunc('week', NOW()) - ($3::int - 1) * INTERVAL '1 week'
        GROUP BY wk
        ORDER BY wk ASC`,
      [company_id, theme, weeks]
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
        `SELECT id FROM risks
          WHERE company_id = $1
            AND LOWER(status::text) NOT IN ('closed','resolved')
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
        } catch {
          // Non-fatal: the intervention record itself remains saved.
        }
      }
    }

    return intv;
  },
};
