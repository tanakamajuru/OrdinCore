import { query } from '../config/database';
import { computeTrajectory } from './trajectory.service';

/**
 * Intervention Panel — trajectory-based governance for each theme (risk domain).
 *
 * OrdinCore's distinguishing feature: a theme is not just a count of services, it is a
 * DIRECTION OF TRAVEL with a leadership response. For every active theme we compute:
 *   - the weekly severity-weighted signal series (the trajectory + a 6-week timeline),
 *   - services affected, open/completed actions,
 * and join the human decision layer (the intervention: owner, status, review, outcome).
 */

const SEV_WEIGHT = `CASE gp.severity::text WHEN 'Critical' THEN 4 WHEN 'High' THEN 3 WHEN 'Medium' THEN 2 WHEN 'Moderate' THEN 2 ELSE 1 END`;

// Concern level from the computed direction (+ safeguarding is never "low").
function concernOf(direction: string, theme: string): string {
  const isSafeguarding = /safeguard/i.test(theme);
  if (direction === 'Deteriorating') return isSafeguarding ? 'Review required' : 'Attention';
  if (direction === 'Improving') return 'Controlled';
  return isSafeguarding ? 'Review required' : 'Monitor';
}

// A friendlier verb for the direction, matching the product's language.
function directionLabel(direction: string): string {
  if (direction === 'Deteriorating') return 'Increasing';
  if (direction === 'Improving') return 'Reducing';
  return 'Stable';
}

// Average authoritative Risk Index of a theme's open risks (0 if none scored yet).
async function themeRiskIndex(company_id: string, theme: string): Promise<number> {
  const v = (await query(
    `SELECT COALESCE(AVG(risk_index), 0) v FROM risks
      WHERE company_id = $1 AND risk_index IS NOT NULL AND LOWER(status::text) NOT IN ('closed','resolved')
        AND COALESCE(NULLIF(TRIM(risk_domain), ''), NULLIF(TRIM(strategic_theme), ''), title) = $2`,
    [company_id, theme]
  )).rows[0]?.v;
  return Math.round(Number(v) || 0);
}

export const interventionsService = {
  // Every active theme with its trajectory, timeline, counts and any intervention.
  async themes(company_id: string) {
    // Themes + counts from open risks (risks.risk_domain is a single text value).
    const themeRows = (await query(
      `SELECT theme,
              COUNT(DISTINCT risk_id) AS risks,
              COUNT(DISTINCT house_id) FILTER (WHERE house_id IS NOT NULL) AS services,
              COALESCE(SUM(open_actions), 0) AS open_actions,
              COALESCE(SUM(completed_actions), 0) AS completed_actions
         FROM (
           SELECT r.id AS risk_id, r.house_id,
                  COALESCE(NULLIF(TRIM(r.risk_domain), ''), NULLIF(TRIM(r.strategic_theme), ''), r.title) AS theme,
                  (SELECT COUNT(*) FROM risk_actions ra WHERE ra.risk_id = r.id AND ra.status NOT IN ('Complete','Completed','Cancelled')) AS open_actions,
                  (SELECT COUNT(*) FROM risk_actions ra WHERE ra.risk_id = r.id AND ra.status IN ('Complete','Completed')) AS completed_actions
             FROM risks r
            WHERE r.company_id = $1 AND LOWER(r.status::text) NOT IN ('closed','resolved')
         ) t
        WHERE theme IS NOT NULL AND TRIM(theme) <> ''
        GROUP BY theme
        ORDER BY services DESC, risks DESC`,
      [company_id]
    )).rows;

    // Interventions for this company, keyed by theme (org-wide rows only for the panel).
    const interventions = (await query(
      `SELECT i.*, (u.first_name || ' ' || u.last_name) AS owner_name
         FROM interventions i LEFT JOIN users u ON u.id = i.owner_id
        WHERE i.company_id = $1 AND i.house_id IS NULL`,
      [company_id]
    )).rows;
    const intvByTheme = new Map<string, any>();
    for (const i of interventions) intvByTheme.set(String(i.theme).toLowerCase(), i);

    const out = [];
    for (const t of themeRows) {
      const timeline = await this.themeTimeline(company_id, t.theme, 6);
      const points = timeline.map((w: any) => w.weight);
      const tr = computeTrajectory(points, []);
      const direction = directionLabel(tr.direction);
      const intv = intvByTheme.get(String(t.theme).toLowerCase()) || null;

      // Mark the timeline week when the intervention started.
      if (intv?.started_at) {
        const started = new Date(intv.started_at).getTime();
        let best = -1, bestDelta = Infinity;
        timeline.forEach((w: any, idx: number) => {
          const d = Math.abs(new Date(w.weekStart).getTime() - started);
          if (d < bestDelta) { bestDelta = d; best = idx; }
        });
        if (best >= 0) timeline[best].interventionStarted = true;
      }

      out.push({
        theme: t.theme,
        services: Number(t.services) || 0,
        risks: Number(t.risks) || 0,
        openActions: Number(t.open_actions) || 0,
        completedActions: Number(t.completed_actions) || 0,
        trajectory: { direction: tr.direction, label: direction, basis: tr.basis },
        concern: concernOf(tr.direction, t.theme),
        timeline,
        currentRiskIndex: await themeRiskIndex(company_id, t.theme),
        intervention: intv ? {
          id: intv.id,
          intervention: intv.intervention,
          status: intv.status,
          owner_id: intv.owner_id,
          owner_name: intv.owner_name,
          owner_role: intv.owner_role,
          expected_outcome: intv.expected_outcome,
          review_date: intv.review_date,
          started_at: intv.started_at,
          risk_index_before: intv.risk_index_before,
          // Effectiveness = (before − after) / before × 100. Positive = risk reduced.
          effectiveness: (intv.risk_index_before && intv.risk_index_before > 0)
            ? Math.round(((intv.risk_index_before - (await themeRiskIndex(company_id, t.theme))) / intv.risk_index_before) * 100)
            : null,
        } : null,
      });
    }
    return out;
  },

  // 6-week severity-weighted signal series for a theme (per-week weight, oldest→newest).
  async themeTimeline(company_id: string, theme: string, weeks = 6) {
    const rows = (await query(
      `SELECT date_trunc('week', COALESCE(gp.created_at, gp.entry_date::timestamptz)) AS wk,
              SUM(${SEV_WEIGHT})::float AS weight
         FROM governance_pulses gp
        WHERE gp.company_id = $1
          AND gp.risk_domain && ARRAY[$2]::text[]
          AND COALESCE(gp.created_at, gp.entry_date::timestamptz) >= date_trunc('week', NOW()) - ($3::int - 1) * INTERVAL '1 week'
        GROUP BY wk ORDER BY wk ASC`,
      [company_id, theme, weeks]
    )).rows;

    // Build a continuous N-week frame (0-filled) so the timeline always has every week.
    const byWeek = new Map<string, number>();
    for (const r of rows) byWeek.set(new Date(r.wk).toISOString().slice(0, 10), Number(r.weight) || 0);
    const frame: any[] = [];
    const now = new Date();
    // Monday-start of the current week
    const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); monday.setHours(0, 0, 0, 0);
    for (let i = weeks - 1; i >= 0; i--) {
      const ws = new Date(monday); ws.setDate(monday.getDate() - i * 7);
      const key = ws.toISOString().slice(0, 10);
      frame.push({ weekStart: key, label: `Week ${weeks - i}`, weight: byWeek.get(key) || 0, interventionStarted: false });
    }
    return frame;
  },

  async upsertIntervention(company_id: string, user_id: string, data: {
    theme: string; house_id?: string | null; intervention: string; status?: string;
    owner_id?: string | null; owner_role?: string | null; expected_outcome?: string | null;
    review_date?: string | null; started?: boolean;
  }) {
    if (!data.theme || !String(data.theme).trim()) throw new Error('A theme is required.');
    if (!data.intervention || !String(data.intervention).trim()) throw new Error('Describe the intervention.');
    const status = ['Planned', 'In Progress', 'Complete', 'On Hold'].find((s) => s.toLowerCase() === String(data.status || '').toLowerCase()) || 'Planned';
    // started_at is stamped the first time the intervention moves off "Planned", or if explicitly started.
    const starting = (data.started || status === 'In Progress');
    const startedAt = starting ? new Date() : null;
    // Snapshot the theme's current Risk Index the first time the intervention starts, so we can
    // later measure whether it worked. COALESCE in the upsert keeps the first snapshot.
    const before = starting ? await themeRiskIndex(company_id, String(data.theme).trim()) : null;

    const res = await query(
      `INSERT INTO interventions (company_id, theme, house_id, owner_id, owner_role, intervention, status, expected_outcome, review_date, started_at, risk_index_before, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (company_id, theme, COALESCE(house_id, '00000000-0000-0000-0000-000000000000'::uuid))
       DO UPDATE SET owner_id = EXCLUDED.owner_id, owner_role = EXCLUDED.owner_role,
                     intervention = EXCLUDED.intervention, status = EXCLUDED.status,
                     expected_outcome = EXCLUDED.expected_outcome, review_date = EXCLUDED.review_date,
                     started_at = COALESCE(interventions.started_at, EXCLUDED.started_at),
                     risk_index_before = COALESCE(interventions.risk_index_before, EXCLUDED.risk_index_before),
                     updated_at = NOW()
       RETURNING *`,
      [company_id, String(data.theme).trim(), data.house_id || null, data.owner_id || null, data.owner_role || null,
       String(data.intervention).trim(), status, data.expected_outcome || null, data.review_date || null, startedAt, before, user_id]
    );
    return res.rows[0];
  },
};
