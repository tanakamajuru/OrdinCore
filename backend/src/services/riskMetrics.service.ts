import { query } from '../config/database';

/**
 * Risk Metrics engine — the mathematically-defensible, fully-computed governance model.
 *
 * Every figure is derived by the system from data it already holds; NO manager sets a score
 * by hand. Each metric answers a different governance question (level / direction / priority /
 * reliability), so nothing is an opaque "black box".
 *
 *   Risk Index = (0.40·S + 0.25·F + 0.20·V + 0.15·C) × 20            (0–100)
 *   Trajectory = (CurrentWeek − PreviousWeek) / PreviousWeek × 100    (%)
 *   Priority   = 0.50·R + 0.30·Tscore + 0.20·OverdueActions%          (0–100)
 *   Confidence = DaysWithEntries / ExpectedDays × 100                 (%)
 *
 * Data mapping (each 1–5), all automatic:
 *   S  Severity           Critical 5 · High 4 · Medium 3 · Low 2 · negligible 1
 *   F  Frequency          #signals behind the risk → 1..5
 *   V  Vulnerability      NOT yet captured per person → neutral 3 (single knob to change)
 *   C  Control effect.    Effective 1 · Partially 3 · Not effective 5 · untested 4
 */

// The only non-automatic input: OrdinCore does not yet hold a per-person vulnerability score,
// so it defaults to neutral. When a per-person value exists, pass it here instead.
export const VULNERABILITY_DEFAULT = 3;

const SEV_WEIGHT_SQL = `CASE gp.severity::text WHEN 'Critical' THEN 4 WHEN 'High' THEN 3 WHEN 'Medium' THEN 2 WHEN 'Moderate' THEN 2 ELSE 1 END`;

function severityToS(sev?: string): number {
  switch (String(sev || '').toLowerCase()) {
    case 'critical': return 5;
    case 'high': return 4;
    case 'medium': case 'moderate': return 3;
    case 'low': return 2;
    default: return 1;
  }
}
function frequencyToF(count: number): number {
  if (count >= 6) return 5;
  if (count >= 4) return 4;
  if (count >= 3) return 3;
  if (count >= 2) return 2;
  return 1;
}
function controlToC(outcome?: string, hasControls?: boolean): number {
  const v = String(outcome || '').toLowerCase();
  if (v === 'effective') return 1;
  if (v.includes('partial') || v === 'neutral') return 3;
  if (v.includes('not effective') || v === 'ineffective') return 5;
  return hasControls ? 4 : 4; // untested / no controls proven yet
}
export function gradeOf(index: number): string {
  if (index < 25) return 'Low';
  if (index < 50) return 'Medium';
  if (index < 75) return 'High';
  return 'Critical';
}
function trajectoryGradeOf(pct: number): string {
  if (pct <= -30) return 'Strong Improvement';
  if (pct <= -10) return 'Improving';
  if (pct <= 10) return 'Stable';
  if (pct <= 30) return 'Deteriorating';
  return 'Rapid Deterioration';
}
function trajectoryScoreOf(grade: string): number {
  if (grade === 'Stable') return 40;
  if (grade === 'Deteriorating') return 70;
  if (grade === 'Rapid Deterioration') return 100;
  return 20; // Improving / Strong Improvement
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export const riskMetricsService = {
  async forRisk(risk_id: string, company_id: string) {
    const r = (await query(
      `SELECT id, severity, source_cluster_id FROM risks WHERE id = $1 AND company_id = $2`,
      [risk_id, company_id]
    )).rows[0];
    if (!r) return null;
    const cluster = r.source_cluster_id;

    // Signals behind the risk (via its source cluster's links).
    const sigCount = Number((await query(
      `SELECT COUNT(*) n FROM risk_signal_links rsl JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id WHERE rsl.cluster_id = $1`,
      [cluster]
    )).rows[0]?.n || 0);
    const maxSev = Number((await query(
      `SELECT COALESCE(MAX(${SEV_WEIGHT_SQL} + 1), 0) m
         FROM risk_signal_links rsl JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id WHERE rsl.cluster_id = $1`,
      [cluster]
    )).rows[0]?.m || 0); // weight+1 approximates 1..5

    // Controls / effectiveness / overdue.
    const ctl = (await query(
      `SELECT (SELECT effectiveness_outcome FROM risk_actions WHERE risk_id = $1 AND effectiveness_outcome IS NOT NULL ORDER BY effectiveness_reviewed_at DESC NULLS LAST LIMIT 1) AS latest,
              (SELECT COUNT(*) FROM risk_actions WHERE risk_id = $1) AS total,
              (SELECT COUNT(*) FROM risk_actions WHERE risk_id = $1 AND status NOT IN ('Complete','Completed','Cancelled')) AS open,
              (SELECT COUNT(*) FROM risk_actions WHERE risk_id = $1 AND due_date < NOW() AND status NOT IN ('Complete','Completed','Cancelled')) AS overdue`,
      [risk_id]
    )).rows[0];

    const S = Math.max(severityToS(r.severity), maxSev >= 1 ? Math.min(5, maxSev) : 1);
    const F = frequencyToF(sigCount);
    const V = VULNERABILITY_DEFAULT;
    const C = controlToC(ctl?.latest, Number(ctl?.total) > 0);
    const riskIndex = Math.round((0.40 * S + 0.25 * F + 0.20 * V + 0.15 * C) * 20);
    const grade = gradeOf(riskIndex);

    // Trajectory %: this week's signal weight vs last week's.
    const wk = (await query(
      `SELECT
         SUM(${SEV_WEIGHT_SQL}) FILTER (WHERE COALESCE(gp.created_at, gp.entry_date::timestamptz) >= date_trunc('week', NOW())) AS cur,
         SUM(${SEV_WEIGHT_SQL}) FILTER (WHERE COALESCE(gp.created_at, gp.entry_date::timestamptz) >= date_trunc('week', NOW()) - INTERVAL '1 week'
                                          AND COALESCE(gp.created_at, gp.entry_date::timestamptz) <  date_trunc('week', NOW())) AS prev
         FROM risk_signal_links rsl JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id WHERE rsl.cluster_id = $1`,
      [cluster]
    )).rows[0];
    const cur = Number(wk?.cur) || 0, prev = Number(wk?.prev) || 0;
    const trajectoryPct = prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : (cur > 0 ? 100 : 0);
    const trajectoryGrade = trajectoryGradeOf(trajectoryPct);

    const overduePct = Number(ctl?.open) > 0 ? Math.round((Number(ctl.overdue) / Number(ctl.open)) * 100) : 0;
    const priority = Math.round(0.50 * riskIndex + 0.30 * trajectoryScoreOf(trajectoryGrade) + 0.20 * overduePct);

    // Confidence: distinct days with a signal in the last 30 (expected) days.
    const days = Number((await query(
      `SELECT COUNT(DISTINCT COALESCE(gp.created_at, gp.entry_date::timestamptz)::date) d
         FROM risk_signal_links rsl JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id
        WHERE rsl.cluster_id = $1 AND COALESCE(gp.created_at, gp.entry_date::timestamptz) >= NOW() - INTERVAL '30 days'`,
      [cluster]
    )).rows[0]?.d || 0);
    const confidence = Math.round(clamp((days / 30) * 100, 0, 100));

    return {
      riskIndex, grade,
      trajectoryPct, trajectoryGrade,
      priority, confidence, overduePct,
      inputs: { S, F, V, C, vulnerabilityAssumed: true },
      formula: 'RiskIndex = (0.40·S + 0.25·F + 0.20·V + 0.15·C) × 20',
    };
  },
};
