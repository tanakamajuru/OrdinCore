import { query } from '../config/database';

/**
 * Chapter 1 — the "My Work" read model.
 * A single landing that aggregates records ALREADY produced by the existing system,
 * scoped to what THIS user must act on. It creates no new tables and owns no state:
 * every item links to the existing screen that does the work. This is the persistent
 * "My Work" panel the doctrine asks for — so a user logs in and sees exactly what
 * requires their attention instead of hunting through menus.
 */

const RM_PLUS = ['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'REGISTERED_MANAGER'];
const REVIEWERS = [...RM_PLUS, 'TEAM_LEADER'];

async function houseScope(company_id: string, user_id: string, role: string): Promise<string[]> {
  const r = String(role || '').toUpperCase().replace(/-/g, '_');
  if (RM_PLUS.includes(r)) {
    const res = await query(`SELECT id FROM houses WHERE company_id = $1 AND COALESCE(status,'') <> 'closed'`, [company_id]);
    return res.rows.map((x) => x.id);
  }
  const res = await query(`SELECT house_id FROM user_houses WHERE user_id = $1`, [user_id]);
  return res.rows.map((x) => x.house_id);
}

type WorkItem = {
  key: string;
  label: string;
  count: number;
  emphasis?: number;   // sub-count that should be highlighted (e.g. urgent / overdue)
  tone: 'red' | 'amber' | 'blue' | 'emerald' | 'slate';
  link: string;
  primary_action: string;
};

export const myWorkService = {
  async getForUser(company_id: string, user_id: string, role: string) {
    const r = String(role || '').toUpperCase().replace(/-/g, '_');
    const houses = await houseScope(company_id, user_id, r);
    const items: WorkItem[] = [];
    const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    };

    // 1. Open escalations assigned to me or in my services (urgent highlighted).
    if (REVIEWERS.includes(r) || true) {
      const esc = await safe(() => query(
        `SELECT COUNT(*)::int AS n,
                COUNT(*) FILTER (WHERE priority IN ('Urgent','Critical'))::int AS urgent
           FROM escalations
          WHERE company_id = $1
            AND COALESCE(lifecycle_status::text, status) NOT IN ('Closed','Resolved')
            AND (escalated_to = $2 OR house_id = ANY($3::uuid[]))`,
        [company_id, user_id, houses]
      ), { rows: [{ n: 0, urgent: 0 }] } as any);
      const n = esc.rows[0]?.n || 0;
      if (n > 0) items.push({ key: 'escalations', label: 'escalations awaiting response', count: n, emphasis: esc.rows[0]?.urgent || 0, tone: 'red', link: '/escalation-log', primary_action: 'Update Escalation' });
    }

    // 2. Signals awaiting review (reviewers only).
    if (REVIEWERS.includes(r)) {
      const sig = await safe(() => query(
        `SELECT COUNT(*)::int AS n FROM governance_pulses
          WHERE company_id = $1 AND house_id = ANY($2::uuid[])
            AND (review_status IS NULL OR review_status = 'New')`,
        [company_id, houses]
      ), { rows: [{ n: 0 }] } as any);
      const n = sig.rows[0]?.n || 0;
      if (n > 0) items.push({ key: 'signals', label: 'signals awaiting review', count: n, tone: 'amber', link: '/rm5', primary_action: 'Review Signal' });
    }

    // 3. My actions — open, with overdue highlighted (all roles).
    const act = await safe(() => query(
      `SELECT COUNT(*) FILTER (WHERE status NOT IN ('Complete','Completed','Cancelled'))::int AS open,
              COUNT(*) FILTER (WHERE status NOT IN ('Complete','Completed','Cancelled') AND due_date < NOW())::int AS overdue
         FROM risk_actions WHERE company_id = $1 AND assigned_to = $2`,
      [company_id, user_id]
    ), { rows: [{ open: 0, overdue: 0 }] } as any);
    if ((act.rows[0]?.open || 0) > 0) items.push({ key: 'actions', label: 'actions assigned to you', count: act.rows[0].open, emphasis: act.rows[0]?.overdue || 0, tone: (act.rows[0]?.overdue || 0) > 0 ? 'red' : 'blue', link: '/my-actions', primary_action: 'Complete Action' });

    // 4. Effectiveness reviews due — completed controls not yet rated (reviewers).
    if (REVIEWERS.includes(r)) {
      const eff = await safe(() => query(
        `SELECT COUNT(*)::int AS n FROM risk_actions a
           LEFT JOIN risks rk ON rk.id = a.risk_id
          WHERE a.company_id = $1
            AND a.status IN ('Complete','Completed')
            AND a.effectiveness IS NULL
            AND (a.assigned_to = $2 OR rk.house_id = ANY($3::uuid[]))`,
        [company_id, user_id, houses]
      ), { rows: [{ n: 0 }] } as any);
      const n = eff.rows[0]?.n || 0;
      if (n > 0) items.push({ key: 'effectiveness', label: 'effectiveness reviews due', count: n, tone: 'blue', link: '/risk-register', primary_action: 'Review Effectiveness' });
    }

    // 5. Weekly governance review — due if none published for my services this week.
    if (REVIEWERS.includes(r)) {
      const wk = await safe(() => query(
        `SELECT COUNT(*)::int AS n FROM weekly_reviews
          WHERE company_id = $1 AND created_at >= date_trunc('week', NOW())`,
        [company_id]
      ), { rows: [{ n: 0 }] } as any);
      if ((wk.rows[0]?.n || 0) === 0) items.push({ key: 'weekly', label: RM_PLUS.includes(r) ? 'weekly review to publish this week' : 'weekly review to acknowledge', count: 1, tone: 'slate', link: '/weekly-review', primary_action: RM_PLUS.includes(r) ? 'Publish Weekly Review' : 'Confirm Reviewed' });
    }

    const totalUrgent = items.filter((i) => i.tone === 'red').reduce((n, i) => n + (i.emphasis || i.count), 0);
    return { items, total_items: items.length, urgent: totalUrgent, all_clear: items.length === 0 };
  },
};
