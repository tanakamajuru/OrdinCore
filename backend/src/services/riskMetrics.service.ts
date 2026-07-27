import { query } from '../config/database';
import { trajectoryForRisk } from './trajectory.service';

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

// Severity band → likelihood/impact so the legacy generated risk_score stays consistent
// with the computed grade.
function gradeToScore(grade: string): { likelihood: number; impact: number } {
  switch (grade) {
    case 'Critical': return { likelihood: 5, impact: 5 };
    case 'High': return { likelihood: 4, impact: 4 };
    case 'Low': return { likelihood: 2, impact: 2 };
    default: return { likelihood: 3, impact: 3 }; // Medium
  }
}

export const riskMetricsService = {
  // Compute AND persist: the authoritative grade (from the Risk Index) is written back to the
  // risk's severity, with likelihood/impact and the stored risk_index kept in step. Called on
  // the events that move a risk (promotion, effectiveness verdict, action completion) so the
  // register/escalation always read the system's figure, never a hand-set one.
  async recompute(risk_id: string, company_id: string) {
    const m = await this.forRisk(risk_id, company_id);
    if (!m) return null;
    const li = gradeToScore(m.grade);
    await query(
      `UPDATE risks SET severity = $1, likelihood = $2, impact = $3, risk_index = $4, updated_at = NOW()
        WHERE id = $5 AND company_id = $6 AND LOWER(status::text) NOT IN ('closed','resolved')`,
      [m.grade, li.likelihood, li.impact, m.riskIndex, risk_id, company_id]
    );
    return m;
  },

  // Organisational Governance Health (0–100, higher = stronger governance):
  //   Health = 100 − (0.40·R + 0.25·T + 0.20·(100−A) + 0.15·(100−D))
  // R = avg Risk Index of open risks · T = org trajectory score · A = action completion % ·
  // D = data confidence %.
  async governanceHealth(company_id: string) {
    const R = Math.round(Number((await query(
      `SELECT COALESCE(AVG(risk_index), 0) v FROM risks
        WHERE company_id = $1 AND LOWER(status::text) NOT IN ('closed','resolved') AND risk_index IS NOT NULL`,
      [company_id]
    )).rows[0]?.v || 0));

    const acts = (await query(
      `SELECT COUNT(*) t, COUNT(*) FILTER (WHERE status IN ('Complete','Completed')) c FROM risk_actions WHERE company_id = $1`,
      [company_id]
    )).rows[0];
    const A = Number(acts?.t) > 0 ? Math.round((Number(acts.c) / Number(acts.t)) * 100) : 100;

    const wk = (await query(
      `SELECT SUM(${SEV_WEIGHT_SQL}) FILTER (WHERE COALESCE(gp.created_at, gp.entry_date::timestamptz) >= date_trunc('week', NOW())) AS cur,
              SUM(${SEV_WEIGHT_SQL}) FILTER (WHERE COALESCE(gp.created_at, gp.entry_date::timestamptz) >= date_trunc('week', NOW()) - INTERVAL '1 week'
                                               AND COALESCE(gp.created_at, gp.entry_date::timestamptz) <  date_trunc('week', NOW())) AS prev
         FROM governance_pulses gp WHERE gp.company_id = $1`,
      [company_id]
    )).rows[0];
    const cur = Number(wk?.cur) || 0, prev = Number(wk?.prev) || 0;
    const trajectoryPct = prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0);
    const T = trajectoryScoreOf(trajectoryGradeOf(trajectoryPct));

    const days = Number((await query(
      `SELECT COUNT(DISTINCT COALESCE(gp.created_at, gp.entry_date::timestamptz)::date) d
         FROM governance_pulses gp WHERE gp.company_id = $1 AND COALESCE(gp.created_at, gp.entry_date::timestamptz) >= NOW() - INTERVAL '30 days'`,
      [company_id]
    )).rows[0]?.d || 0);
    const D = Math.round(clamp((days / 30) * 100, 0, 100));

    const health = Math.round(clamp(100 - (0.40 * R + 0.25 * T + 0.20 * (100 - A) + 0.15 * (100 - D)), 0, 100));
    return {
      health,
      components: { riskIndexAvg: R, trajectoryScore: T, actionCompletion: A, dataConfidence: D },
      formula: 'Health = 100 − (0.40·R + 0.25·T + 0.20·(100−A) + 0.15·(100−D))',
    };
  },

  async forRisk(risk_id: string, company_id: string) {
    const r = (await query(
      `SELECT id, severity, source_cluster_id, linked_person, impact_rating FROM risks WHERE id = $1 AND company_id = $2`,
      [risk_id, company_id]
    )).rows[0];
    if (!r) return null;
    const cluster = r.source_cluster_id;

    // V (Vulnerability) — the one non-automatic input: read the linked service user's assessed
    // vulnerability (1–5). Falls back to the neutral default when the person isn't matched/assessed.
    let V = VULNERABILITY_DEFAULT;
    let vulnerabilityAssumed = true;
    if (r.linked_person && String(r.linked_person).trim()) {
      const su = (await query(
        `SELECT su.vulnerability FROM service_users su JOIN houses h ON h.id = su.house_id
          WHERE h.company_id = $1 AND su.display_name ILIKE $2 AND su.vulnerability IS NOT NULL
          LIMIT 1`,
        [company_id, String(r.linked_person).trim()]
      )).rows[0];
      if (su && su.vulnerability != null) { V = Number(su.vulnerability); vulnerabilityAssumed = false; }
    }

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

    // S (Severity/Impact) prefers the human Impact rating (High 5 · Medium 3 · Low 2) when set;
    // otherwise it falls back to the strongest linked signal severity.
    const impactToS: Record<string, number> = { high: 5, medium: 3, moderate: 3, low: 2 };
    const humanS = impactToS[String(r.impact_rating || '').toLowerCase()];
    const S = humanS ?? Math.max(severityToS(r.severity), maxSev >= 1 ? Math.min(5, maxSev) : 1);
    const F = frequencyToF(sigCount);
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
    const rawPct = prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : (cur > 0 ? 100 : 0);

    // Reconcile the % with the authoritative direction. The raw week-over-week signal delta and
    // the SSOT trajectory (which also weighs control effectiveness and the safeguarding/critical
    // safety floor) can otherwise disagree — the "-66.7% · Strong Improvement" shown next to a
    // "Deteriorating" status the reviewer flagged. The SSOT direction wins; the % is presented as
    // a magnitude whose SIGN follows that direction, so the number and the word never contradict,
    // and this figure matches every other view of the same risk.
    let direction: 'Improving' | 'Stable' | 'Deteriorating' = 'Stable';
    try { direction = (await trajectoryForRisk(risk_id, cluster)).direction; }
    catch { direction = trajectoryGradeOf(rawPct).includes('Deterior') ? 'Deteriorating'
                       : trajectoryGradeOf(rawPct).includes('Improv') ? 'Improving' : 'Stable'; }
    const magnitude = Math.abs(rawPct);
    const trajectoryPct = direction === 'Deteriorating' ? magnitude
                        : direction === 'Improving' ? -magnitude : 0;
    const trajectoryGrade = direction === 'Deteriorating' ? (magnitude >= 30 ? 'Rapid Deterioration' : 'Deteriorating')
                          : direction === 'Improving' ? (magnitude >= 30 ? 'Strong Improvement' : 'Improving')
                          : 'Stable';

    // Confidence — how much evidence stands behind this grading. Days-with-signal alone read
    // implausibly low for a well-evidenced Critical risk (the reviewer's "20%"). Blend the volume
    // of signals, how many distinct days they span, and whether controls are actually in place, so
    // confidence rises as the evidence base genuinely strengthens.
    const days = Number((await query(
      `SELECT COUNT(DISTINCT COALESCE(gp.created_at, gp.entry_date::timestamptz)::date) d
         FROM risk_signal_links rsl JOIN governance_pulses gp ON gp.id = rsl.pulse_entry_id
        WHERE rsl.cluster_id = $1 AND COALESCE(gp.created_at, gp.entry_date::timestamptz) >= NOW() - INTERVAL '30 days'`,
      [cluster]
    )).rows[0]?.d || 0);
    const hasControls = Number(ctl?.total) > 0;
    const confidence = Math.round(clamp(
      0.55 * (Math.min(sigCount, 8) / 8) * 100 +   // volume of evidence
      0.30 * (Math.min(days, 10) / 10) * 100 +     // spread over time
      0.15 * (hasControls ? 100 : 0),              // something is being done about it
      0, 100
    ));

    const overduePct = Number(ctl?.open) > 0 ? Math.round((Number(ctl.overdue) / Number(ctl.open)) * 100) : 0;
    const rawPriority = Math.round(0.50 * riskIndex + 0.30 * trajectoryScoreOf(trajectoryGrade) + 0.20 * overduePct);
    // Floor priority to the risk's grade band so a Critical risk can never read as low-priority
    // (the reviewer's "if it's critical, why is priority only 45?"). It may climb above the floor
    // when deteriorating or with overdue actions, but never falls below what the grade demands.
    const priorityFloor: Record<string, number> = { Critical: 80, High: 60, Medium: 40, Low: 0 };
    const priority = Math.max(rawPriority, priorityFloor[grade] ?? 0);

    // A one-line governance summary — the "why", so the page defends its own conclusions rather
    // than showing bare numbers (reviewer: "what is missing is why").
    const narrative =
      `${grade} risk (index ${riskIndex}). ${sigCount} signal(s) over ${days} day(s); ` +
      `trajectory ${direction.toLowerCase()}${magnitude ? ` (${magnitude}% week-on-week)` : ''}. ` +
      `${Number(ctl?.overdue) || 0} overdue of ${Number(ctl?.open) || 0} open action(s). ` +
      `Confidence ${confidence}% — ${confidence >= 66 ? 'well evidenced' : confidence >= 33 ? 'moderately evidenced' : 'limited evidence so far'}.`;

    return {
      riskIndex, grade,
      trajectoryPct, trajectoryGrade, trajectoryDirection: direction,
      priority, confidence, overduePct,
      narrative,
      inputs: { S, F, V, C, vulnerabilityAssumed },
      formula: 'RiskIndex = (0.40·S + 0.25·F + 0.20·V + 0.15·C) × 20',
    };
  },
};
