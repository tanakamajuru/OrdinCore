import { query } from '../config/database';

/**
 * Ordin Core authoritative trajectory engine.
 *
 * IMPORTANT ARCHITECTURAL RULE:
 * This file is the ONLY place that decides whether a concern is Improving,
 * Stable or Deteriorating. Other services/controllers may cache or display
 * the result, but must not apply their own trajectory rules.
 *
 * Refinement of Finding K:
 * - compares two equal 14-day windows (28 days total);
 * - explicitly preserves zero-signal weeks;
 * - keeps risk severity separate from direction of travel;
 * - does not force Safeguarding or historic Critical evidence to Deteriorating;
 * - uses action/control effectiveness as supporting evidence, not an override;
 * - returns a plain-language basis for auditability and UI display.
 *
 * No new tables, routes or parallel trajectory subsystem are introduced.
 */

export type TrajectoryDirection = 'Improving' | 'Stable' | 'Deteriorating';

export interface Trajectory {
  direction: TrajectoryDirection;
  basis: string;
  /** Four consecutive 7-day severity-weighted buckets, oldest -> newest. */
  points: number[];
  /** Optional evidence metadata. Existing consumers can ignore this safely. */
  evidence?: {
    previous14DayWeight: number;
    current14DayWeight: number;
    previous14DaySignals: number;
    current14DaySignals: number;
    latestEffectiveness: string | null;
    sufficientHistory: boolean;
    windowDays: 14;
    calculationVersion: 'trajectory-v3';
  };
}

type SignalEvidence = {
  occurred_at: string | Date;
  severity: string | null;
};

type EffectivenessEvidence = {
  outcome: string;
  reviewed_at: string | Date | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 14;
const TOTAL_DAYS = WINDOW_DAYS * 2;
const CALCULATION_VERSION = 'trajectory-v3' as const;

function severityWeight(severity?: string | null): number {
  switch (String(severity || '').trim().toLowerCase()) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'medium':
    case 'moderate': return 2;
    case 'low': return 1;
    default: return 1;
  }
}

/**
 * Keep the four governance effectiveness outcomes distinct.
 * The value is deliberately smaller than the signal movement contribution:
 * effectiveness informs direction; it cannot unilaterally decide direction.
 */
function effectivenessContribution(outcome?: string | null): number {
  const v = String(outcome || '').trim().toLowerCase();
  if (!v) return 0;
  if (v === 'effective') return -1;
  if (v.includes('partially effective') || v === 'partial' || v === 'partially') return -0.4;
  if (v.includes('too early')) return 0;
  if (v === 'ineffective' || v.includes('not effective')) return 1;
  return 0;
}

function normalizeOutcomeLabel(outcome?: string | null): string | null {
  const v = String(outcome || '').trim().toLowerCase();
  if (!v) return null;
  if (v === 'effective') return 'Effective';
  if (v.includes('partially effective') || v === 'partial' || v === 'partially') return 'Partially Effective';
  if (v.includes('too early')) return 'Too Early To Assess';
  if (v === 'ineffective' || v.includes('not effective')) return 'Not Effective';
  return String(outcome);
}

/**
 * Build four complete rolling 7-day buckets over the last 28 days.
 * Empty periods are deliberately represented as 0; silence is evidence and
 * must not disappear from the series.
 */
export function buildFourWeekSeries(
  signals: SignalEvidence[],
  now: Date = new Date()
): { points: number[]; counts: number[] } {
  const end = now.getTime();
  const start = end - TOTAL_DAYS * DAY_MS;
  const points = [0, 0, 0, 0];
  const counts = [0, 0, 0, 0];

  for (const signal of Array.isArray(signals) ? signals : []) {
    const at = new Date(signal.occurred_at).getTime();
    if (!Number.isFinite(at) || at < start || at > end) continue;

    // at === end belongs to the newest bucket. Clamp protects clock precision.
    const elapsed = Math.min(Math.max(at - start, 0), TOTAL_DAYS * DAY_MS - 1);
    const bucket = Math.min(3, Math.floor(elapsed / (7 * DAY_MS)));
    points[bucket] += severityWeight(signal.severity);
    counts[bucket] += 1;
  }

  return { points, counts };
}

/**
 * Pure trajectory decision core.
 *
 * `points` must be four consecutive 7-day weighted buckets, oldest -> newest.
 * The first two buckets form the previous 14-day window and the last two form
 * the current 14-day window.
 *
 * Existing callers/tests that supply fewer buckets are padded with zeroes to
 * preserve backwards compatibility while keeping the corrected equal-window
 * behaviour.
 */
export function computeTrajectory(
  points: number[],
  outcomes: string[],
  counts: number[] = [],
): Trajectory {
  const p = [0, 0, 0, 0];
  const c = [0, 0, 0, 0];
  const inputPoints = Array.isArray(points) ? points.slice(-4) : [];
  const inputCounts = Array.isArray(counts) ? counts.slice(-4) : [];

  for (let i = 0; i < inputPoints.length; i++) p[4 - inputPoints.length + i] = Number(inputPoints[i]) || 0;
  for (let i = 0; i < inputCounts.length; i++) c[4 - inputCounts.length + i] = Number(inputCounts[i]) || 0;

  const previousWeight = p[0] + p[1];
  const currentWeight = p[2] + p[3];
  const previousCount = c[0] + c[1];
  const currentCount = c[2] + c[3];
  const delta = currentWeight - previousWeight;

  // A movement is material when it is at least one severity-weight point and
  // at least 20% of the prior burden. When the prior burden is zero, any new
  // weighted evidence is a material deterioration signal.
  const materialThreshold = previousWeight === 0 ? 1 : Math.max(1, previousWeight * 0.20);

  let signalDirectionScore = 0;
  if (delta >= materialThreshold) signalDirectionScore = 2;
  else if (delta <= -materialThreshold) signalDirectionScore = -2;

  const latestRaw = outcomes && outcomes.length ? outcomes[outcomes.length - 1] : null;
  const latestLabel = normalizeOutcomeLabel(latestRaw);
  const effectivenessScore = effectivenessContribution(latestRaw);

  // Signal movement deliberately has greater influence (±2) than one control
  // rating (±1). This prevents a single effectiveness judgement from flipping
  // clear contradictory longitudinal evidence.
  const combined = signalDirectionScore + effectivenessScore;

  let direction: TrajectoryDirection = 'Stable';
  if (combined >= 1) direction = 'Deteriorating';
  else if (combined <= -1) direction = 'Improving';

  const signalPhrase = currentWeight > previousWeight
    ? `weighted signal burden increased from ${previousWeight.toFixed(1)} to ${currentWeight.toFixed(1)} over equal 14-day periods`
    : currentWeight < previousWeight
      ? `weighted signal burden reduced from ${previousWeight.toFixed(1)} to ${currentWeight.toFixed(1)} over equal 14-day periods`
      : `weighted signal burden remained ${currentWeight.toFixed(1)} across the two 14-day periods`;

  const countPhrase = (previousCount || currentCount)
    ? ` (${previousCount} signals previously; ${currentCount} currently)`
    : '';

  const effectivenessPhrase = latestLabel
    ? ` Latest control effectiveness: ${latestLabel}.`
    : '';

  // With no evidence in either period and no effectiveness review, the existing
  // three-state UI is preserved by returning Stable while the basis makes clear
  // that no directional conclusion should be inferred. This avoids a new UI
  // state and therefore avoids behavioural/UI deviation in this refinement patch.
  const sufficientHistory = previousWeight > 0 || currentWeight > 0 || !!latestLabel;
  const basis = sufficientHistory
    ? `${signalPhrase}${countPhrase}.${effectivenessPhrase}`
    : 'No linked signal or effectiveness evidence is available in the 28-day comparison window; trajectory remains Stable pending evidence.';

  return {
    direction,
    basis,
    points: p,
    evidence: {
      previous14DayWeight: previousWeight,
      current14DayWeight: currentWeight,
      previous14DaySignals: previousCount,
      current14DaySignals: currentCount,
      latestEffectiveness: latestLabel,
      sufficientHistory,
      windowDays: WINDOW_DAYS,
      calculationVersion: CALCULATION_VERSION,
    },
  };
}

/** Return linked signal evidence for a cluster for the authoritative 28-day window. */
async function signalEvidenceForCluster(cluster_id?: string | null): Promise<SignalEvidence[]> {
  if (!cluster_id) return [];
  const r = await query(
    `SELECT DISTINCT gp.id,
            COALESCE(gp.created_at, gp.entry_date::timestamptz) AS occurred_at,
            gp.severity
       FROM risk_signal_links rsl
       JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id
      WHERE rsl.cluster_id = $1
        AND COALESCE(gp.created_at, gp.entry_date::timestamptz) >= NOW() - INTERVAL '28 days'
        AND COALESCE(gp.created_at, gp.entry_date::timestamptz) <= NOW()
      ORDER BY occurred_at ASC`,
    [cluster_id]
  );
  return r.rows;
}

/**
 * Return all evidence linked to the risk. The OR preserves cluster-promoted risks
 * and also covers critical-exception/single-signal risks that have direct risk links.
 * DISTINCT prevents double weighting where the same pulse is linked both ways.
 */
async function signalEvidenceForRisk(
  risk_id?: string | null,
  source_cluster_id?: string | null,
): Promise<SignalEvidence[]> {
  if (!risk_id && !source_cluster_id) return [];
  const r = await query(
    `SELECT DISTINCT gp.id,
            COALESCE(gp.created_at, gp.entry_date::timestamptz) AS occurred_at,
            gp.severity
       FROM risk_signal_links rsl
       JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id
      WHERE (($1::uuid IS NOT NULL AND rsl.risk_id = $1::uuid)
          OR ($2::uuid IS NOT NULL AND rsl.cluster_id = $2::uuid))
        AND COALESCE(gp.created_at, gp.entry_date::timestamptz) >= NOW() - INTERVAL '28 days'
        AND COALESCE(gp.created_at, gp.entry_date::timestamptz) <= NOW()
      ORDER BY occurred_at ASC`,
    [risk_id || null, source_cluster_id || null]
  );
  return r.rows;
}

/** Recorded control verdicts for a risk, oldest-first. */
async function effectivenessEvidenceForRisk(risk_id?: string | null): Promise<EffectivenessEvidence[]> {
  if (!risk_id) return [];
  const r = await query(
    `SELECT COALESCE(effectiveness_outcome, effectiveness::text) AS outcome,
            COALESCE(effectiveness_reviewed_at, effectiveness_measured_at, completed_at, created_at) AS reviewed_at
       FROM risk_actions
      WHERE risk_id = $1
        AND (effectiveness_outcome IS NOT NULL OR effectiveness IS NOT NULL)
      ORDER BY COALESCE(effectiveness_reviewed_at, effectiveness_measured_at, completed_at, created_at) ASC`,
    [risk_id]
  );
  return r.rows
    .map((row: any) => ({ outcome: String(row.outcome || ''), reviewed_at: row.reviewed_at || null }))
    .filter((row: EffectivenessEvidence) => !!row.outcome);
}

/**
 * Compatibility export retained for callers that use the old helper.
 * It now returns the corrected complete four-week series including zero periods.
 */
export async function signalSeriesForCluster(cluster_id?: string | null): Promise<number[]> {
  const evidence = await signalEvidenceForCluster(cluster_id);
  return buildFourWeekSeries(evidence).points;
}

/** Compatibility export retained; returns canonical outcomes oldest-first. */
export async function effectivenessOutcomesForRisk(risk_id?: string | null): Promise<string[]> {
  return (await effectivenessEvidenceForRisk(risk_id)).map(x => x.outcome);
}

export async function trajectoryForCluster(cluster_id?: string | null): Promise<Trajectory> {
  const evidence = await signalEvidenceForCluster(cluster_id);
  const series = buildFourWeekSeries(evidence);
  return computeTrajectory(series.points, [], series.counts);
}

export async function trajectoryForRisk(
  risk_id?: string | null,
  source_cluster_id?: string | null,
): Promise<Trajectory> {
  const [signals, effectiveness] = await Promise.all([
    signalEvidenceForRisk(risk_id, source_cluster_id),
    effectivenessEvidenceForRisk(risk_id),
  ]);

  const series = buildFourWeekSeries(signals);
  return computeTrajectory(series.points, effectiveness.map(x => x.outcome), series.counts);
}
