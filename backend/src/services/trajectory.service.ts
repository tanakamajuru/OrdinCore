import { query } from '../config/database';

/**
 * Finding K — one computed, explained trajectory for every role.
 *
 * A single place that turns a risk/cluster's evidence into a direction of travel
 * (Improving / Stable / Deteriorating) WITH a plain-language basis and the weekly
 * signal-weight series (for a sparkline). RM, Director, RI and reports all read this
 * one figure, so the same risk can never look different in two places.
 *
 * The core (`computeTrajectory`) is identical to the RM prototype, so live output
 * matches the design. Inputs are gathered from the real schema:
 *   - signal series: severity-weighted governance_pulses linked to the cluster via
 *     risk_signal_links, bucketed by week;
 *   - effectiveness: recorded control verdicts (effectiveness_outcome), oldest-first.
 */

export type TrajectoryDirection = 'Improving' | 'Stable' | 'Deteriorating';
export interface Trajectory {
  direction: TrajectoryDirection;
  basis: string;
  points: number[];
}

// Map the recorded verdict vocabulary to the three directional buckets.
function normalizeOutcome(o: string): 'Effective' | 'Ineffective' | 'Neutral' {
  const v = String(o || '').toLowerCase();
  if (v === 'effective') return 'Effective';
  if (v.includes('not effective') || v === 'ineffective') return 'Ineffective';
  return 'Neutral'; // Partially Effective / Too Early / Partially — no override
}

/** Pure core — no I/O. Same logic as the RM prototype's `trajectory()`. */
export function computeTrajectory(points: number[], outcomes: string[]): Trajectory {
  const pts = Array.isArray(points) ? points : [];
  const n = pts.length;
  const recent = n ? pts.slice(-2).reduce((a, b) => a + b, 0) / Math.min(2, n) : 0;
  const priorArr = n > 2 ? pts.slice(0, -2) : pts.slice(0, 1);
  const prior = priorArr.length ? priorArr.reduce((a, b) => a + b, 0) / priorArr.length : recent;
  const delta = recent - prior;
  const last = outcomes && outcomes.length ? normalizeOutcome(outcomes[outcomes.length - 1]) : null;

  let direction: TrajectoryDirection = 'Stable';
  let basis = `Signal weight steady (${recent.toFixed(1)} vs ${prior.toFixed(1)} prior).`;
  if (delta > 0.6) { direction = 'Deteriorating'; basis = `Signals rising — recent ${recent.toFixed(1)} vs ${prior.toFixed(1)} prior.`; }
  else if (delta < -0.6) { direction = 'Improving'; basis = `Signals easing — recent ${recent.toFixed(1)} vs ${prior.toFixed(1)} prior.`; }
  if (last === 'Effective' && direction !== 'Deteriorating') { direction = 'Improving'; basis = 'Last control rated effective; signals not rising.'; }
  if (last === 'Ineffective') { direction = 'Deteriorating'; basis = 'Last control rated ineffective — risk not controlled.'; }
  return { direction, basis, points: pts };
}

/** Weekly severity-weighted signal series for a cluster's linked pulses. */
export async function signalSeriesForCluster(cluster_id?: string | null): Promise<number[]> {
  if (!cluster_id) return [];
  const r = await query(
    `SELECT SUM(CASE gp.severity
                  WHEN 'Critical' THEN 4 WHEN 'High' THEN 3
                  WHEN 'Medium' THEN 2 WHEN 'Moderate' THEN 2
                  WHEN 'Low' THEN 1 ELSE 1 END)::float AS weight
       FROM risk_signal_links rsl
       JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id
      WHERE rsl.cluster_id = $1
      GROUP BY date_trunc('week', COALESCE(gp.created_at, gp.entry_date))
      ORDER BY date_trunc('week', COALESCE(gp.created_at, gp.entry_date)) ASC`,
    [cluster_id]
  );
  return r.rows.map((row: any) => Number(row.weight) || 0);
}

/** Recorded control verdicts for a risk, oldest-first (only genuinely-rated actions). */
export async function effectivenessOutcomesForRisk(risk_id?: string | null): Promise<string[]> {
  if (!risk_id) return [];
  // effectiveness_outcome is the canonical rated verdict (written by the rating flow);
  // `effectiveness` (enum) is the mapped fallback. NB: control_effectiveness is NOT a
  // live column on risk_actions despite the handover pack assuming it — verified against
  // the DB.
  const r = await query(
    `SELECT COALESCE(effectiveness_outcome, effectiveness::text) AS outcome
       FROM risk_actions
      WHERE risk_id = $1 AND effectiveness_outcome IS NOT NULL
      ORDER BY COALESCE(effectiveness_reviewed_at, effectiveness_measured_at, completed_at, created_at) ASC`,
    [risk_id]
  );
  return r.rows.map((row: any) => String(row.outcome || '')).filter(Boolean);
}

export async function trajectoryForCluster(cluster_id?: string | null): Promise<Trajectory> {
  return computeTrajectory(await signalSeriesForCluster(cluster_id), []);
}

export async function trajectoryForRisk(risk_id?: string | null, source_cluster_id?: string | null): Promise<Trajectory> {
  const [points, outcomes] = await Promise.all([
    signalSeriesForCluster(source_cluster_id),
    effectivenessOutcomesForRisk(risk_id),
  ]);
  const t = computeTrajectory(points, outcomes);

  // Safety floor — identical to the one the pattern board applies to clusters, so the SAME
  // concern never reads calmer on the risk detail / register than it does as a pattern. An
  // OPEN risk that carries a Critical signal or sits in the Safeguarding domain can never
  // show better than Deteriorating. Closed/Resolved risks are left as computed (a resolved
  // safeguarding risk should be allowed to read Improving).
  if (risk_id && t.direction !== 'Deteriorating') {
    try {
      const f = (await query(
        `SELECT
           (r.status NOT IN ('Closed','Resolved')) AS open,
           (r.risk_domain::text ILIKE '%safeguard%') AS is_safeguarding,
           EXISTS (SELECT 1 FROM risk_signal_links rsl
                     JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id
                    WHERE rsl.risk_id = r.id AND gp.severity = 'Critical') AS has_critical
           FROM risks r WHERE r.id = $1`,
        [risk_id]
      )).rows[0];
      if (f && f.open && (f.has_critical || f.is_safeguarding)) {
        return {
          direction: 'Deteriorating',
          basis: f.has_critical
            ? 'Critical signal on this risk — held at Deteriorating until controlled.'
            : 'Safeguarding domain — held at Deteriorating until controlled.',
          points: t.points,
        };
      }
    } catch { /* floor is best-effort — never let it break a trajectory read */ }
  }
  return t;
}
