import { query } from '../config/database';

/**
 * Chapter 1 — the "My Work" read model.
 * A single landing that aggregates records ALREADY produced by the existing system,
 * scoped to what THIS user must act on. It creates no new tables and owns no state:
 * every item links to the existing screen that does the work. This is the persistent
 * "My Work" panel the doctrine asks for — so a user logs in and sees exactly what
 * requires their attention instead of hunting through menus.
 */

const OPERATIONAL_MANAGERS = ['SUPER_ADMIN', 'ADMIN', 'REGISTERED_MANAGER'];
const ALL_SITE_ROLES = [...OPERATIONAL_MANAGERS, 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'];
const EFFECTIVENESS_READERS = ['REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN'];

async function houseScope(company_id: string, user_id: string, role: string): Promise<string[]> {
  const r = String(role || '').toUpperCase().replace(/-/g, '_');
  if (ALL_SITE_ROLES.includes(r)) {
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
    // Commented out per request — escalations are no longer surfaced as a My Work item.
    if (false) {
      const esc = await safe(() => query(
        `SELECT COUNT(*)::int AS n,
                COUNT(*) FILTER (WHERE priority IN ('Urgent','Critical'))::int AS urgent
           FROM escalations
          WHERE company_id = $1
            AND COALESCE(lifecycle_status::text, status, 'Open') NOT IN ('Closed','Resolved','closed','resolved')
            AND (escalated_to = $2 OR house_id = ANY($3::uuid[]))`,
        [company_id, user_id, houses]
      ), { rows: [{ n: 0, urgent: 0 }] } as any);
      const n = esc.rows[0]?.n || 0;
      if (n > 0) items.push({ key: 'escalations', label: 'escalations awaiting response', count: n, emphasis: esc.rows[0]?.urgent || 0, tone: 'red', link: '/escalation-log?status=open', primary_action: 'Update Escalation' });
    }

    // 2. Signals awaiting review (reviewers only). Must count exactly what the RM5 signals
    //    pipeline shows when this item is clicked — recent inflow still in the daily pipeline
    //    (not yet Linked to a risk, Closed, or moved onto an escalation/Monitoring). Using a
    //    different predicate here is what made My Work (all-time New) disagree with the
    //    pipeline count. Signals review is an RM+ workflow — Team Leaders work from their
    //    actions instead, so signals-awaiting-review is not surfaced on the TL My Work.
    if (OPERATIONAL_MANAGERS.includes(r)) {
      const sig = await safe(() => query(
        `SELECT COUNT(*)::int AS n FROM governance_pulses
          WHERE company_id = $1 AND house_id = ANY($2::uuid[])
            AND COALESCE(created_at, entry_date) >= NOW() - INTERVAL '7 days'
            -- Only genuinely-unreviewed signals are "awaiting". Once triaged the signal moves to
            -- Reviewed/Monitoring/Linked/Closed/etc. — previously only 3 states were excluded, so a
            -- signal reviewed as "Reviewed" kept showing as pending after the RM had actioned it.
            AND COALESCE(review_status::text, 'New') = 'New'`,
        [company_id, houses]
      ), { rows: [{ n: 0 }] } as any);
      const n = sig.rows[0]?.n || 0;
      // Route by role: the RM5 pipeline is RM/Director/RI-only and company-wide, so a Team
      // Leader is sent to their own house-scoped signals page instead (avoids the 403/"Failed
      // to load" they hit on /rm5).
      const signalsLink = '/rm5?stage=signals';
      if (n > 0) items.push({ key: 'signals', label: 'signals awaiting review', count: n, tone: 'amber', link: signalsLink, primary_action: 'Review Signal' });

      const mon = await safe(() => query(
        `SELECT COUNT(*)::int AS n FROM governance_reviews
          WHERE company_id=$1 AND decision='Monitor' AND decision_status='Monitoring'
            AND decision_owner_id=$2 AND due_at <= NOW()`,
        [company_id, user_id]
      ), { rows: [{ n: 0 }] } as any);
      if ((mon.rows[0]?.n || 0) > 0) items.push({ key: 'monitoring_reviews', label: 'monitoring reviews due', count: mon.rows[0].n, tone: 'amber', link: '/governance-dashboard', primary_action: 'Review Monitoring' });
    }

    // 3. My actions — open, with overdue highlighted (all roles).
    const act = await safe(() => query(
      `SELECT COUNT(*) FILTER (WHERE status NOT IN ('Complete','Completed','Cancelled'))::int AS open,
              COUNT(*) FILTER (WHERE status NOT IN ('Complete','Completed','Cancelled') AND due_date < NOW())::int AS overdue
         FROM risk_actions WHERE company_id = $1 AND assigned_to = $2`,
      [company_id, user_id]
    ), { rows: [{ open: 0, overdue: 0 }] } as any);
    if ((act.rows[0]?.open || 0) > 0) items.push({ key: 'actions', label: 'actions assigned to you', count: act.rows[0].open, emphasis: act.rows[0]?.overdue || 0, tone: (act.rows[0]?.overdue || 0) > 0 ? 'red' : 'blue', link: '/my-actions', primary_action: 'Complete Action' });

    // 4. Effectiveness reviews due — completed controls not yet rated. This is an RM/Director/RI
    //    function (rating control effectiveness), and its destination (/rm5) is RM-only, so it
    //    is not shown to Team Leaders (who would otherwise hit a 403 on the link).
    if (EFFECTIVENESS_READERS.includes(r)) {
      // Durable obligations are the source of truth; a service/signal action is not dropped simply
      // because no formal risk existed when the work was allocated.
      const eff = await safe(() => query(
        `SELECT COUNT(*)::int AS n FROM governance_review_obligations
          WHERE company_id=$1 AND obligation_type='ACTION_EFFECTIVENESS' AND status='OPEN'`,
        [company_id]
      ), { rows: [{ n: 0 }] } as any);
      const n = eff.rows[0]?.n || 0;
      if (n > 0) items.push({ key: 'effectiveness', label: 'effectiveness reviews due', count: n, tone: 'blue', link: '/effectiveness', primary_action: r === 'REGISTERED_MANAGER' ? 'Review Effectiveness' : 'View Effectiveness' });
    }

    // 5. Weekly governance review — due if none published for my services this week.
    if (OPERATIONAL_MANAGERS.includes(r)) {
      const wk = await safe(() => query(
        `SELECT COUNT(*)::int AS n FROM houses h
          WHERE h.company_id = $1 AND COALESCE(h.status,'') <> 'closed'
            AND NOT EXISTS (
              SELECT 1 FROM weekly_reviews wr
               WHERE wr.company_id = h.company_id AND wr.house_id = h.id
                 AND wr.week_ending >= date_trunc('week', NOW())::date
                 AND wr.status IN ('pending_validation','LOCKED','published')
            )`,
        [company_id]
      ), { rows: [{ n: 0 }] } as any);
      const n = wk.rows[0]?.n || 0;
      if (n > 0) items.push({ key: 'weekly', label: 'service reviews to finalise', count: n, tone: 'slate', link: '/weekly-review', primary_action: 'Finalise Weekly Review' });
    } else if (r === 'DIRECTOR') {
      const wk = await safe(() => query(
        `SELECT COUNT(*)::int AS n FROM weekly_reviews
          WHERE company_id = $1 AND status = 'pending_validation' AND validation_status = 'Pending'`,
        [company_id]
      ), { rows: [{ n: 0 }] } as any);
      const n = wk.rows[0]?.n || 0;
      if (n > 0) items.push({ key: 'weekly_validation', label: 'weekly reviews to validate', count: n, tone: 'amber', link: '/weekly-review/validate', primary_action: 'Validate Review' });
    } else if (r === 'RESPONSIBLE_INDIVIDUAL') {
      const ready = await safe(() => query(
        `SELECT COUNT(*)::int AS n FROM weekly_reviews wr
         WHERE wr.company_id = $1 AND wr.week_ending = (SELECT MAX(week_ending) FROM weekly_reviews WHERE company_id = $1)
           AND wr.validation_status = 'Approved'
           AND NOT EXISTS (SELECT 1 FROM provider_review_signoffs prs WHERE prs.company_id=$1 AND prs.week_ending=wr.week_ending)`,
        [company_id]
      ), { rows: [{ n: 0 }] } as any);
      if ((ready.rows[0]?.n || 0) > 0) items.push({ key: 'provider_signoff', label: 'provider position awaiting sign-off', count: 1, tone: 'amber', link: '/provider-signoff', primary_action: 'Record Assurance Decision' });
    } else if (r === 'TEAM_LEADER') {
      const unread = await safe(() => query(
        `SELECT COUNT(*)::int AS n FROM weekly_reviews wr
          WHERE wr.company_id=$1 AND wr.status='published' AND wr.house_id = ANY($3::uuid[])
            AND NOT EXISTS (SELECT 1 FROM weekly_review_acknowledgements a WHERE a.review_id=wr.id AND a.user_id=$2)`,
        [company_id, user_id, houses]
      ), { rows: [{ n: 0 }] } as any);
      const n = unread.rows[0]?.n || 0;
      if (n > 0) items.push({ key: 'weekly_ack', label: 'published weekly reviews to read', count: n, tone: 'slate', link: '/weekly-review', primary_action: 'Read and Acknowledge' });
    }

    // 6. Post-escalation risk reviews (§4) — a closed escalation whose underlying risk still
    //    needs the RM's Keep Open / Add Controls / Re-escalate / Request Closure decision.
    if (OPERATIONAL_MANAGERS.includes(r)) {
      // Count the RISKS awaiting review (distinct), not the escalations — the label and the
      // destination are about risks. Opens the Risk Register filtered to those awaiting review.
      const pcr = await safe(() => query(
        `SELECT COUNT(DISTINCT risk_id)::int AS n FROM escalations
          WHERE company_id = $1 AND post_closure_risk_review_required = TRUE AND risk_id IS NOT NULL
            AND (escalated_to = $2 OR escalated_by = $2 OR house_id = ANY($3::uuid[]))`,
        [company_id, user_id, houses]
      ), { rows: [{ n: 0 }] } as any);
      const n = pcr.rows[0]?.n || 0;
      if (n > 0) items.push({ key: 'post_escalation_review', label: 'risks to review', count: n, tone: 'amber', link: '/risk-register?review=awaiting', primary_action: 'Review Risk' });
    }

    const totalUrgent = items.filter((i) => i.tone === 'red').reduce((n, i) => n + (i.emphasis || i.count), 0);
    return { items, total_items: items.length, urgent: totalUrgent, all_clear: items.length === 0 };
  },
};
