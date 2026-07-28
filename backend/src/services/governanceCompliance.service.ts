import { query } from '../config/database';

/**
 * Governance Compliance — the third dimension alongside Risk and Trajectory (design pack §
 * "Recommendation for Ordin Core"). Risk asks *what level of risk exists*; Trajectory asks *is it
 * improving*; Compliance asks *are leaders and staff carrying out the required actions within the
 * expected timescales*. A high-risk service with excellent compliance is being actively managed; a
 * moderate-risk service with poor compliance is itself a leadership concern.
 *
 * Everything here is computed from live action data (risk_actions) — no manual scoring.
 */

// RAG bands (design pack "Traffic Light Compliance"):
//   Green  — nothing overdue
//   Amber  — 1–2 overdue
//   Red    — 3+ overdue
type Rag = 'green' | 'amber' | 'red';
function ragFor(overdue: number): Rag {
  if (overdue >= 3) return 'red';
  if (overdue >= 1) return 'amber';
  return 'green';
}

// Qualified with the risk_actions alias `a`: both risk_actions AND users carry a `status` column,
// so an unqualified `status` is ambiguous once the two are joined (teamCompliance).
const OPEN = `a.status NOT IN ('Complete','Completed','Cancelled')`;

export const governanceComplianceService = {
  /**
   * Per-person compliance across the company (optionally scoped to a set of houses for a Team
   * Leader's own view). One row per staff member who owns at least one action, with their open,
   * overdue, due-today and on-time-completed counts, the age of their oldest overdue action, and a
   * RAG status. Ordered worst-first so the people who need chasing are at the top.
   */
  async teamCompliance(company_id: string, house_ids?: string[]) {
    const scoped = Array.isArray(house_ids) && house_ids.length > 0;
    // Start FROM the active staff who can own actions (RM / TL / SW) and LEFT JOIN their actions,
    // so a newly-added member appears immediately (as "all on time / green") instead of being
    // invisible until their first action. status = 'active' also drops de-activated duplicates.
    const rows = (await query(
      `SELECT u.id, u.first_name || ' ' || u.last_name AS name, u.role,
              COUNT(a.id) FILTER (WHERE ${OPEN}) AS open,
              COUNT(a.id) FILTER (WHERE ${OPEN} AND a.due_date < NOW()) AS overdue,
              COUNT(a.id) FILTER (WHERE ${OPEN} AND a.due_date::date = NOW()::date) AS due_today,
              COUNT(a.id) FILTER (WHERE a.status IN ('Complete','Completed')
                                 AND a.completed_at IS NOT NULL
                                 AND (a.due_date IS NULL OR a.completed_at <= a.due_date)) AS completed_on_time,
              COUNT(a.id) FILTER (WHERE a.status IN ('Complete','Completed')) AS completed_total,
              MAX(CASE WHEN ${OPEN} AND a.due_date < NOW()
                       THEN FLOOR(EXTRACT(EPOCH FROM (NOW() - a.due_date)) / 86400) END)::int AS oldest_overdue_days
         FROM users u
         LEFT JOIN risk_actions a ON a.assigned_to = u.id AND a.company_id = $1
         LEFT JOIN risks r ON r.id = a.risk_id
        WHERE u.company_id = $1 AND u.status = 'active'
          AND u.role = ANY(ARRAY['REGISTERED_MANAGER','TEAM_LEADER','SUPPORT_WORKER'])
          ${scoped ? `AND EXISTS (SELECT 1 FROM user_houses uh WHERE uh.user_id = u.id AND uh.house_id = ANY($2::uuid[]))` : ``}
        GROUP BY u.id, name, u.role
        ORDER BY overdue DESC, due_today DESC, name ASC`,
      scoped ? [company_id, house_ids] : [company_id]
    )).rows;

    return rows.map((r: any) => {
      const overdue = Number(r.overdue) || 0;
      const completedTotal = Number(r.completed_total) || 0;
      const onTime = Number(r.completed_on_time) || 0;
      return {
        id: r.id,
        name: r.name,
        role: r.role,
        open: Number(r.open) || 0,
        overdue,
        due_today: Number(r.due_today) || 0,
        oldest_overdue_days: r.oldest_overdue_days ?? null,
        // On-time completion rate — the positive story (how much they DID deliver on time).
        on_time_rate: completedTotal > 0 ? Math.round((onTime / completedTotal) * 100) : null,
        rag: ragFor(overdue),
      };
    });
  },

  /**
   * One person's outstanding workload — used for the "Daily Outstanding Actions" banner and the
   * "prevent new work before old work" soft-gate. Returns overdue / due-today / open counts and
   * the oldest overdue age.
   */
  async forUser(company_id: string, user_id: string) {
    const r = (await query(
      `SELECT COUNT(*) FILTER (WHERE ${OPEN}) AS open,
              COUNT(*) FILTER (WHERE ${OPEN} AND a.due_date < NOW()) AS overdue,
              COUNT(*) FILTER (WHERE ${OPEN} AND a.due_date::date = NOW()::date) AS due_today,
              MAX(CASE WHEN ${OPEN} AND a.due_date < NOW()
                       THEN FLOOR(EXTRACT(EPOCH FROM (NOW() - a.due_date)) / 86400) END)::int AS oldest_overdue_days
         FROM risk_actions a
        WHERE a.company_id = $1 AND a.assigned_to = $2`,
      [company_id, user_id]
    )).rows[0];
    return {
      open: Number(r?.open) || 0,
      overdue: Number(r?.overdue) || 0,
      due_today: Number(r?.due_today) || 0,
      oldest_overdue_days: r?.oldest_overdue_days ?? null,
    };
  },

  /** Company rollup — the headline traffic-light counts for a leadership tile. */
  async summary(company_id: string, house_ids?: string[]) {
    const people = await this.teamCompliance(company_id, house_ids);
    const red = people.filter((p) => p.rag === 'red').length;
    const amber = people.filter((p) => p.rag === 'amber').length;
    const green = people.filter((p) => p.rag === 'green').length;
    const overdueTotal = people.reduce((n, p) => n + p.overdue, 0);
    return { people, red, amber, green, overdue_total: overdueTotal, staff_tracked: people.length };
  },
};
