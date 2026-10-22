import { query } from '../config/database';

type GuidedRole = 'TEAM_LEADER'|'REGISTERED_MANAGER'|'DIRECTOR'|'RESPONSIBLE_INDIVIDUAL'|'ADMIN'|'SUPER_ADMIN';
type GuidedPriority = 'URGENT'|'DUE'|'NORMAL';
type GuidedState = 'NEEDS_YOU'|'WAITING'|'COMPLETE';
type EntityType = 'signal'|'action'|'escalation'|'pattern'|'risk'|'effectiveness_review'|'weekly_governance'|'provider_assurance'|'learning'|'query';

export type GuidedWorkItem = {
  id: string;
  role: GuidedRole;
  state: GuidedState;
  priority: GuidedPriority;
  taskType: string;
  title: string;
  summary: string;
  reason: string;
  dueAt?: string | null;
  ownerName?: string | null;
  serviceName?: string | null;
  canonicalEntityType: EntityType;
  canonicalEntityId: string;
  obligationId?: string | null;
  // Simplified Work Model (per approved mockup): every needsYou item is either personally
  // ASSIGNED work ("My Work") or a role DECISION that is due ("Decisions Due"). Data-only —
  // the current UI ignores this field, so behaviour is unchanged until the UI chooses to use it.
  category?: 'ASSIGNED' | 'DECISION';
  // When an item resolves to an underlying risk (a promoted pattern, or a risk with due
  // obligations), this is that risk id so the item can be collapsed to a single concern.
  concernRiskId?: string | null;
  requiredAction?: string;
  completionCondition?: string;
  route: string;
  actionLabel: string;
  whyAmISeeingThis: string;
};

const normalizeRole = (role: string): GuidedRole => {
  const r = String(role || '').toUpperCase().replace(/-/g, '_');
  if (r === 'RI' || r === 'RESPONSIBLE_INDIVIDUAL') return 'RESPONSIBLE_INDIVIDUAL';
  if (['TEAM_LEADER','REGISTERED_MANAGER','DIRECTOR','ADMIN','SUPER_ADMIN'].includes(r)) return r as GuidedRole;
  return 'TEAM_LEADER';
};

// A week-ending value can arrive from pg as a Date (raw `.toString()` → "Sun Sep 20 2026 00:00:00
// GMT+0100 (British Summer Time)") or a 'YYYY-MM-DD' string. Present it the one way every role sees
// it — "20 Sep 2026" — so RM, Director and RI cards read identically.
const fmtWeek = (v: string | Date | null | undefined): string => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(`${String(v).slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// URL/id-safe week key ('YYYY-MM-DD'). pg may hand back a Date; a raw `${date}` embeds spaces and
// colons that mangle the guided `gw`/`current` round-trip and the `weekEnding=` preview query — so
// the current weekly task stops matching and Continue lands on the wrong record. Use local parts
// (not toISOString, which can shift a local-midnight date back a day).
const weekKey = (v: string | Date | null | undefined): string => {
  if (!v) return '';
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  }
  return String(v).slice(0, 10);
};

const priorityFor = (dueAt?: string | Date | null, critical = false): GuidedPriority => {
  if (critical) return 'URGENT';
  if (!dueAt) return 'NORMAL';
  const due = new Date(dueAt).getTime();
  return due <= Date.now() ? 'DUE' : 'NORMAL';
};

// Bug fix (confirmed live, 22 Oct 2026, user-reported): "Decisions Due" was showing open
// escalations and assigned actions/monitoring due on a FUTURE day (e.g. a Create Action due
// 24/10 appeared under Decisions Due on 22/10) — the governance-pulses/monitoring/obligation
// queries already correctly filtered to "due now" with SQL, but escalations and assigned actions
// never did, so they sat in needsYou from the moment they were created regardless of due date.
// This compares calendar days in the organisation's governance timezone (Europe/London, same as
// periodService) rather than a raw millisecond cutoff, so "due today" means the whole UK day, not
// just up to the current instant.
const londonDay = (d: Date): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const isDueByToday = (dueAt?: string | Date | null): boolean => {
  if (!dueAt) return true; // no due date at all = untriaged, needs a decision now
  const due = new Date(dueAt);
  if (isNaN(due.getTime())) return true;
  return londonDay(due) <= londonDay(new Date());
};
const dueDateLabel = (dueAt: string | Date): string => new Date(dueAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

async function houseScope(companyId: string, userId: string, role: GuidedRole): Promise<string[]> {
  if (['REGISTERED_MANAGER','DIRECTOR','RESPONSIBLE_INDIVIDUAL','ADMIN','SUPER_ADMIN'].includes(role)) {
    const res = await query(`SELECT id FROM canonical_house_state_v WHERE company_id=$1 AND is_active`, [companyId]);
    return res.rows.map((r: any) => r.id);
  }
  const res = await query(`SELECT house_id FROM user_houses WHERE user_id=$1`, [userId]);
  return res.rows.map((r: any) => r.house_id);
}

const byPriority = (a: GuidedWorkItem, b: GuidedWorkItem) => {
  const rank = { URGENT: 0, DUE: 1, NORMAL: 2 } as const;
  const x = rank[a.priority] - rank[b.priority];
  if (x !== 0) return x;
  const ad = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const bd = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  return ad - bd;
};

export const guidedWorkService = {
  async getForUser(companyId: string, userId: string, rawRole: string) {
    const role = normalizeRole(rawRole);
    // Read-side housekeeping only: resolves stale scheduler rows against canonical subject state.
    try { await query('SELECT * FROM reconcile_canonical_read_side($1::uuid)', [companyId]); } catch { /* migration-safe */ }
    const houses = await houseScope(companyId, userId, role);
    const needsYou: GuidedWorkItem[] = [];
    const waiting: GuidedWorkItem[] = [];
    const completedToday: GuidedWorkItem[] = [];

    // No silent success (doctrine §4.2.8): a failed source must NOT read as an empty
    // (reassuring) queue. Record which source failed so the response can declare the
    // work list incomplete instead of showing a green "nothing due" state.
    const degraded: string[] = [];
    const safeRows = async (sql: string, params: any[] = []) => {
      try { return (await query(sql, params)).rows; }
      catch (e: any) {
        const m = /FROM\s+([a-z_][\w.]*)/i.exec(sql);
        const src = m ? m[1] : 'source';
        if (!degraded.includes(src)) degraded.push(src);
        try { require('../utils/logger').default.error(`guided-work source failed (${src}): ${e?.message || e}`); } catch { /* logging best-effort */ }
        return [];
      }
    };

    // TEAM LEADER: assigned actions + published weekly review acknowledgement.
    if (role === 'TEAM_LEADER') {
      const actions = await safeRows(`
        SELECT ra.id, ra.title, ra.due_date, h.name AS service_name
          FROM canonical_action_state_v ra
          LEFT JOIN risks r ON r.id=ra.risk_id AND r.company_id=ra.company_id
          LEFT JOIN houses h ON h.id=r.house_id
         WHERE ra.company_id=$1 AND ra.assigned_to=$2
           AND ra.is_open
         ORDER BY ra.due_date NULLS LAST, ra.created_at`, [companyId, userId]);
      for (const a of actions) {
        const dueNow = isDueByToday(a.due_date);
        const item: GuidedWorkItem = {
          id:`action:${a.id}`, role, state: dueNow ? 'NEEDS_YOU' : 'WAITING', priority:priorityFor(a.due_date), taskType:'ASSIGNED_ACTION',
          title:a.title || 'Complete assigned action', summary:'Complete the assigned intervention and record factual completion evidence.',
          reason: dueNow ? 'Management has assigned this action to you.' : `Due ${dueDateLabel(a.due_date)} — not yet due.`,
          dueAt:a.due_date, serviceName:a.service_name,
          canonicalEntityType:'action', canonicalEntityId:a.id, requiredAction:'COMPLETE_ASSIGNED_ACTION',
          completionCondition:'The assigned action is completed through the canonical completion service with factual completion evidence.',
          route:`/my-actions?focus=${a.id}&guided=1&gw=action:${a.id}`,
          actionLabel:'Complete Action', whyAmISeeingThis: dueNow ? 'This action is assigned to you and remains open.' : `This action is assigned to you but is not due until ${dueDateLabel(a.due_date)}.`
        };
        (dueNow ? needsYou : waiting).push(item);
      }

      const weekly = await safeRows(`
        SELECT wr.id, wr.week_ending, h.name AS service_name
          FROM weekly_reviews wr JOIN houses h ON h.id=wr.house_id
         WHERE wr.company_id=$1 AND wr.status='published' AND wr.house_id = ANY($3::uuid[])
           AND NOT EXISTS (SELECT 1 FROM weekly_review_acknowledgements a WHERE a.review_id=wr.id AND a.user_id=$2)
         ORDER BY wr.week_ending DESC`, [companyId, userId, houses]);
      for (const w of weekly) needsYou.push({
        id:`weekly_ack:${w.id}`, role, state:'NEEDS_YOU', priority:'NORMAL', taskType:'WEEKLY_ACK',
        title:'Read published weekly governance review', summary:`Week ending ${fmtWeek(w.week_ending)}`,
        reason:'A published weekly governance review is awaiting your acknowledgement.', serviceName:w.service_name,
        canonicalEntityType:'weekly_governance', canonicalEntityId:w.id, requiredAction:'ACKNOWLEDGE_WEEKLY_GOVERNANCE',
        completionCondition:'Your acknowledgement of this exact published weekly review is persisted.',
        route:`/weekly-review/${w.id}?guided=1&gw=weekly_ack:${w.id}`,
        actionLabel:'Read & Acknowledge', whyAmISeeingThis:'This weekly review has been published for your service and has not yet been acknowledged by you.'
      });

      // Signal monitoring assigned to this TL (Signal Monitoring correction, 14 Oct 2026): appear the
      // moment the RM saves the Monitor decision — not gated on due_at, which only governs when the
      // decision RETURNS to the RM. The signal stays under RM governance throughout.
      // Join the ORIGINAL signal (governance_pulses) as well as the monitoring decision: the field
      // report (16 Oct 2026) was that the item showed only the monitoring instruction with no way
      // to tell what the original concern was, and the button landed on the dashboard instead of
      // the exact signal.
      // Defence in depth (TL closed-signal fix, 19 Oct 2026): decision_status='Monitoring' alone is
      // not sufficient — a signal can be closed through a path that predates the retirement logic in
      // governanceDecisions.service.ts, leaving a stale active Monitor row. Never surface monitoring
      // work for a signal whose source is already closed/linked, regardless of how that happened.
      const monitoredSignals = await safeRows(`
        SELECT gr.id, gr.pulse_entry_id, gr.service_id, gr.what_is_happening, gr.monitoring_trigger, gr.due_at,
               h.name AS service_name, gp.description AS original_description, gp.related_person
          FROM governance_reviews gr
          LEFT JOIN houses h ON h.id=gr.service_id
          LEFT JOIN governance_pulses gp ON gp.id=gr.pulse_entry_id
         WHERE gr.company_id=$1 AND gr.decision='Monitor' AND gr.decision_status='Monitoring'
           AND gr.decision_owner_id=$2
           AND (gp.id IS NULL OR gp.review_status NOT IN ('Closed','Linked'))`, [companyId, userId]);
      for (const m of monitoredSignals) needsYou.push({
        id:`signal_monitor:${m.id}`, role, state:'NEEDS_YOU', priority:'NORMAL', taskType:'SIGNAL_MONITORING',
        title:`Monitor signal${m.related_person ? ` · ${m.related_person}` : ''}`,
        summary:`Original concern: ${m.original_description || 'see signal'}. What to watch: ${m.what_is_happening || 'see signal'}.`,
        reason:m.monitoring_trigger ? `Watch for: ${m.monitoring_trigger}` : 'The Registered Manager asked you to monitor this signal.',
        dueAt:m.due_at, serviceName:m.service_name,
        canonicalEntityType:'signal', canonicalEntityId:m.pulse_entry_id || m.id, requiredAction:'SIGNAL_MONITORING_UPDATE',
        completionCondition:'Factual monitoring evidence is recorded, or urgent RM attention is flagged. The Registered Manager retains the next governance decision.',
        route:m.pulse_entry_id ? `/signals/${m.pulse_entry_id}?guided=1&gw=signal_monitor:${m.id}` : `/governance-dashboard?guided=1&gw=signal_monitor:${m.id}`,
        actionLabel:'Record Monitoring Update', whyAmISeeingThis:'The Registered Manager named you as the monitoring owner for this signal.'
      });

      // Escalation monitoring assigned to this TL (Escalation Monitoring correction, 14 Oct 2026):
      // derived from the escalation itself the moment the RM names them as monitoring owner — not a
      // second canonical action, and not gated on the review date (the TL needs to see it immediately).
      const monitoredEscalations = await safeRows(`
        SELECT e.id, e.reason, e.next_review_at, e.metadata, h.name AS service_name
          FROM canonical_escalation_state_v e LEFT JOIN houses h ON h.id=e.house_id
         WHERE e.company_id=$1 AND e.is_open
           AND (e.metadata->>'monitoring_owner_id') = $2::text`, [companyId, userId]);
      for (const e of monitoredEscalations) needsYou.push({
        id:`escalation_monitor:${e.id}`, role, state:'NEEDS_YOU', priority:'NORMAL', taskType:'ESCALATION_MONITORING',
        title:'Monitor escalation', summary:e.metadata?.evidence_to_observe || e.reason || 'Record monitoring evidence for this escalation',
        reason:e.metadata?.monitoring_trigger ? `Watch for: ${e.metadata.monitoring_trigger}` : 'The Registered Manager asked you to monitor this escalation.',
        dueAt:e.next_review_at, serviceName:e.service_name,
        canonicalEntityType:'escalation', canonicalEntityId:e.id, requiredAction:'ESCALATION_MONITORING_UPDATE',
        completionCondition:'Factual monitoring evidence is recorded on this escalation, or urgent RM attention is flagged. The Registered Manager retains the governance decision.',
        route:`/escalation-log?focus=${e.id}&guided=1&gw=escalation_monitor:${e.id}`,
        actionLabel:'Record Monitoring Update', whyAmISeeingThis:'The Registered Manager named you as the monitoring owner for this escalation.'
      });
    }

    // RM: signal decisions, monitoring reviews, effectiveness, escalation/risk/pattern reviews, weekly governance.
    if (['REGISTERED_MANAGER','ADMIN','SUPER_ADMIN'].includes(role)) {
      const signals = await safeRows(`
        SELECT gp.id, gp.house_id, gp.description, gp.related_person, gp.created_at, gp.severity::text, h.name AS service_name
          FROM governance_pulses gp JOIN houses h ON h.id=gp.house_id
         WHERE gp.company_id=$1 AND gp.house_id=ANY($2::uuid[]) AND COALESCE(gp.review_status::text,'New')='New'
           -- Only signals actually due now: today's and any overdue. Signals dated for future days
           -- (a generator seeding the week ahead) become due on their own day, not before.
           AND COALESCE(gp.entry_date, gp.created_at::date) <= CURRENT_DATE
           -- Exclude auto-generated scheduled-pulse placeholders — they are reminders, not recorded
           -- observations, and must not appear as signals needing an RM decision.
           AND COALESCE(gp.description,'') <> 'Scheduled Governance Pulse'
         ORDER BY CASE gp.severity::text WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 ELSE 3 END, gp.created_at`, [companyId, houses]);
      for (const s of signals) needsYou.push({
        id:`signal:${s.id}`, role, state:'NEEDS_YOU', priority:priorityFor(null, ['Critical','High'].includes(s.severity)), taskType:'SIGNAL_DECISION',
        title:`Review ${s.related_person ? `${s.related_person} · ` : ''}signal`, summary:s.description || 'New governance signal',
        reason:'A new signal is awaiting an RM Daily Governance decision.', serviceName:s.service_name,
        canonicalEntityType:'signal', canonicalEntityId:s.id, requiredAction:'RM_SIGNAL_DECISION', completionCondition:'A canonical RM Daily Governance decision is persisted for this signal.', route:`/governance-dashboard?guided=1&gw=signal:${s.id}&pulseId=${s.id}&houseId=${s.house_id}`,
        actionLabel:'Review Signal', whyAmISeeingThis:'This signal has not yet received an RM governance decision.'
      });

      // Evaluation recovery (17 Oct v3 findings, decision confirmed 21 Oct 2026): a signal whose
      // pattern/immediate-detection evaluation has exhausted its auto-retry budget must never sit
      // silently indistinguishable from "evaluated, no concern found" — surface it to the RM as its
      // own work item so a human knows pattern detection genuinely has not run for this signal.
      // Bug fix (confirmed live, 22 Oct 2026, user-reported): this query never checked whether the
      // signal had already been reviewed -- once a signal's evaluation failed 5 times it showed as
      // "Pattern evaluation failed" FOREVER, even after the RM recorded a real governance decision
      // (Close/Monitor/etc.) on it, because closing a signal doesn't touch evaluation_status/
      // evaluation_attempts. Added the same open-queue condition used everywhere else a signal's
      // "still needs a decision" state is checked (risks.service.ts, rm5.service.ts,
      // governanceWorkflow.service.ts): review_status IS NULL OR = 'New'.
      const failedEvaluations = await safeRows(`
        SELECT gp.id, gp.house_id, gp.description, gp.related_person, gp.evaluation_attempts, h.name AS service_name
          FROM governance_pulses gp JOIN houses h ON h.id=gp.house_id
         WHERE gp.company_id=$1 AND gp.house_id=ANY($2::uuid[])
           AND gp.evaluation_status='FAILED' AND gp.evaluation_attempts>=5
           AND (gp.review_status IS NULL OR gp.review_status = 'New')
         ORDER BY gp.created_at`, [companyId, houses]);
      for (const f of failedEvaluations) needsYou.push({
        id:`eval_failed:${f.id}`, role, state:'NEEDS_YOU', priority:'URGENT', taskType:'EVALUATION_FAILED',
        title:`Pattern evaluation failed${f.related_person ? ` · ${f.related_person}` : ''}`,
        summary:f.description || 'A signal failed automated pattern/safeguarding evaluation after repeated retries.',
        reason:`Automated evaluation has failed ${f.evaluation_attempts} times and will not retry further — this signal has not been checked for a pattern or immediate safeguarding concern.`,
        serviceName:f.service_name, canonicalEntityType:'signal', canonicalEntityId:f.id, requiredAction:'MANUAL_SIGNAL_REVIEW',
        completionCondition:'An RM Daily Governance decision is persisted for this signal (manual review substitutes for the failed automated check).',
        route:`/governance-dashboard?guided=1&gw=eval_failed:${f.id}&pulseId=${f.id}&houseId=${f.house_id}`,
        actionLabel:'Review Signal', whyAmISeeingThis:'Automated pattern/safeguarding evaluation could not complete for this signal after repeated attempts.'
      });

      // Scoped to the RM's houses, not just signals the RM personally nominated themselves to
      // monitor: a signal a TEAM LEADER is monitoring must still return to RM Daily Oversight /
      // Decisions Due at the review point — or immediately if the TL flags urgent attention
      // (Signal Monitoring correction, 16 Oct 2026 field report).
      // Same closed-signal guard as the TL queue above (RM Decisions Due fix, 19 Oct 2026): a closed
      // or linked signal must never resurface as a monitoring review due, even if a stale Monitor
      // row's decision_status still reads Monitoring.
      const monitoring = await safeRows(`
        SELECT gr.id, gr.pulse_entry_id, gr.service_id, gr.what_is_happening, gr.due_at, gr.rm_attention, h.name AS service_name
          FROM governance_reviews gr
          LEFT JOIN houses h ON h.id=gr.service_id
          LEFT JOIN governance_pulses gp ON gp.id=gr.pulse_entry_id
         WHERE gr.company_id=$1 AND gr.decision='Monitor' AND gr.decision_status='Monitoring'
           AND gr.service_id=ANY($2::uuid[])
           AND (gr.due_at <= NOW() OR gr.rm_attention)
           AND (gp.id IS NULL OR gp.review_status NOT IN ('Closed','Linked'))
         ORDER BY gr.rm_attention DESC, gr.due_at`, [companyId, houses]);
      for (const m of monitoring) needsYou.push({
        id:`monitor:${m.id}`, role, state:'NEEDS_YOU', priority: m.rm_attention ? 'URGENT' : 'DUE', taskType:'MONITORING_REVIEW',
        title: m.rm_attention ? 'Urgent: monitored signal needs you' : 'Review monitored concern',
        summary:m.what_is_happening || 'Monitoring review due',
        reason: m.rm_attention ? 'The monitoring owner flagged this signal for your immediate attention.' : 'The monitoring review point has been reached.',
        dueAt:m.due_at, serviceName:m.service_name,
        canonicalEntityType:'signal', canonicalEntityId:m.pulse_entry_id || m.id, requiredAction:'RM_MONITORING_REVIEW',
        completionCondition:'A new canonical RM decision is persisted for the monitored signal at its due review point.',
        route:m.pulse_entry_id ? `/governance-dashboard?pulseId=${m.pulse_entry_id}&houseId=${m.service_id}&guided=1&gw=monitor:${m.id}` : `/governance-dashboard?guided=1&gw=monitor:${m.id}`,
        actionLabel:'Review Monitoring', whyAmISeeingThis: m.rm_attention ? 'The Team Leader monitoring this signal flagged it as urgent.' : 'The review date for this monitored signal has been reached.'
      });

      const obligations = await safeRows(`
        SELECT o.id,o.obligation_type,o.subject_type,o.subject_id,o.due_at,o.reason,o.source_action_id,o.source_risk_id,o.source_escalation_id,o.source_cluster_id,
               COALESCE(r.title,ra.title,sc.cluster_label,e.reason) AS subject_title, h.name AS service_name,
               r.severity::text AS risk_severity, sc.linked_risk_id AS pattern_linked_risk_id
          FROM canonical_review_obligation_state_v o
          LEFT JOIN risks r ON r.id=COALESCE(o.source_risk_id, CASE WHEN o.subject_type='RISK' THEN o.subject_id END) AND r.company_id=o.company_id
          LEFT JOIN risk_actions ra ON ra.id=COALESCE(o.source_action_id, CASE WHEN o.subject_type='ACTION' THEN o.subject_id END) AND ra.company_id=o.company_id
          LEFT JOIN signal_clusters sc ON sc.id=COALESCE(o.source_cluster_id, CASE WHEN o.subject_type='PATTERN' THEN o.subject_id END) AND sc.company_id=o.company_id
          LEFT JOIN escalations e ON e.id=COALESCE(o.source_escalation_id, CASE WHEN o.subject_type='ESCALATION' THEN o.subject_id END) AND e.company_id=o.company_id
          LEFT JOIN houses h ON h.id=COALESCE(r.house_id,sc.house_id,e.house_id)
         WHERE o.company_id=$1 AND o.is_actionable AND o.is_due
           AND (o.owner_id IS NULL OR o.owner_id=$2 OR o.owner_role IN ('REGISTERED_MANAGER','ADMIN','SUPER_ADMIN'))
         ORDER BY o.due_at`, [companyId, userId]);
      for (const o of obligations) {
        const kind = String(o.obligation_type);
        let entity: EntityType='risk', label='Review', requiredAction=kind, canonicalId=o.subject_id, deepRoute='';
        const critical = o.risk_severity==='Critical';
        const riskId = o.source_risk_id || (o.subject_type === 'RISK' ? o.subject_id : null);
        const actionId = o.source_action_id || (o.subject_type === 'ACTION' ? o.subject_id : null);
        const escalationId = o.source_escalation_id || (o.subject_type === 'ESCALATION' ? o.subject_id : null);
        const patternId = o.source_cluster_id || (o.subject_type === 'PATTERN' ? o.subject_id : null);
        const patternRiskId = kind === 'PATTERN_REVIEW' ? o.pattern_linked_risk_id : null;

        if (kind==='ACTION_EFFECTIVENESS') {
          entity='effectiveness_review'; label='Review Effectiveness'; requiredAction='FINAL_EFFECTIVENESS_REVIEW';
          canonicalId=actionId || o.subject_id;
          deepRoute=`/effectiveness?focus=${canonicalId}&guided=1&gw=obligation:${o.id}`;
        } else if (kind==='PATTERN_REVIEW') {
          entity='pattern'; label='Review Pattern'; requiredAction='PATTERN_GOVERNANCE_REVIEW';
          canonicalId=patternId || o.subject_id;
          deepRoute=patternRiskId
            ? `/risk-register/${patternRiskId}?guided=1&gw=obligation:${o.id}`
            : `/systemic-patterns?focus=${canonicalId}&guided=1&gw=obligation:${o.id}`;
        } else if (!riskId && escalationId) {
          // An escalation-derived obligation (e.g. POST_ESCALATION_RISK) with NO linked risk is a
          // review of the ESCALATION itself — open the escalation, not a random risk. Previously
          // these fell through to the risk branch and landed on the wrong/awaiting risk.
          entity='escalation'; label='Review Escalation'; requiredAction='ESCALATION_REVIEW';
          canonicalId=escalationId;
          deepRoute=`/escalation-log?focus=${escalationId}&guided=1&gw=obligation:${o.id}`;
        } else {
          entity='risk'; label='Review Risk'; requiredAction='RM_RISK_REVIEW';
          canonicalId=riskId || o.subject_id;
          deepRoute=riskId
            ? `/risk-register/${riskId}?review=1&guided=1&gw=obligation:${o.id}`
            : `/risk-register?review=awaiting&guided=1&gw=obligation:${o.id}`;
        }
        needsYou.push({ id:`obligation:${o.id}`, role, state:'NEEDS_YOU', priority:priorityFor(o.due_at,critical), taskType:kind,
          title:o.subject_title || o.reason || 'Governance review due', summary:o.reason || 'A governance review obligation is due.', reason:o.reason || 'Review due.', dueAt:o.due_at, serviceName:o.service_name,
          canonicalEntityType:entity, canonicalEntityId:canonicalId, obligationId:o.id,
          concernRiskId: kind==='PATTERN_REVIEW' ? (patternRiskId || null) : (riskId || null), requiredAction,
          completionCondition: kind==='ACTION_EFFECTIVENESS' ? 'A FINAL effectiveness review is persisted for this action.'
            : kind==='PATTERN_REVIEW' ? 'A canonical pattern governance review is persisted and the review obligation is completed.'
            : 'An RM risk-review decision is persisted and all due obligations for this risk are completed.',
          route:deepRoute, actionLabel:label, whyAmISeeingThis:o.reason || 'This governance review obligation is due.' });
      }

      const escalations = await safeRows(`
        SELECT e.id,e.reason,e.priority,e.due_by,e.next_review_at,e.metadata,h.name AS service_name
          FROM canonical_escalation_state_v e LEFT JOIN houses h ON h.id=e.house_id
         WHERE e.company_id=$1 AND e.house_id=ANY($2::uuid[])
           AND e.is_open
         ORDER BY e.due_by NULLS FIRST`, [companyId, houses]);
      for (const e of escalations) {
        // Escalation Monitoring correction (14 Oct 2026): a valid Continue-monitoring decision (named
        // owner + future next_review_at) is a governance decision, not an unfinished review. Respect it
        // — sit the escalation in Waiting/Being managed — until the review point is reached, an urgent
        // TL update is flagged, or the monitoring owner becomes invalid. due_by (the original SLA) is
        // never used to manufacture a second routine decision while monitoring is active.
        const monitoringOwnerId = e.metadata?.monitoring_owner_id || null;
        const rmAttention = e.metadata?.rm_attention === true || e.metadata?.rm_attention === 'true';
        const reviewDue = !e.next_review_at || new Date(e.next_review_at).getTime() <= Date.now();
        const validMonitoring = !!monitoringOwnerId && !reviewDue && !rmAttention;

        if (validMonitoring) {
          waiting.push({ id:`escalation:${e.id}`, role, state:'WAITING', priority:'NORMAL', taskType:'ESCALATION_MONITORING_WAIT',
            title:'Being managed', summary:e.reason || 'Escalation under active monitoring',
            reason:`Monitoring continues until ${new Date(e.next_review_at as string).toLocaleDateString('en-GB')} or an urgent update.`,
            dueAt:e.next_review_at, serviceName:e.service_name,
            canonicalEntityType:'escalation', canonicalEntityId:e.id,
            route:`/escalation-log?focus=${e.id}&guided=1&gw=escalation:${e.id}`,
            actionLabel:'View', whyAmISeeingThis:'You decided to continue monitoring this escalation; it returns to you at the scheduled review or sooner if the Team Leader flags something urgent.' });
          continue;
        }

        // Bug fix (confirmed live, 22 Oct 2026, user-reported): an escalation that has never been
        // triaged (no next_review_at) but has a future due_by was showing in Decisions Due
        // immediately on creation, labelled URGENT regardless of how far off its response date
        // was -- because escalations default to priority='Urgent' at creation (pulse.service.ts,
        // governanceDecisions.service.ts), the computed URGENT badge here was not a genuine
        // override signal, just the default. Only a real override (rmAttention, or a next_review_at
        // that has actually arrived -- handled above) now keeps an escalation in Decisions Due
        // ahead of its own due_by; otherwise it waits until its response date.
        const dueNow = rmAttention || !!e.next_review_at || isDueByToday(e.due_by);
        const reason = rmAttention ? 'The monitoring owner flagged this escalation for your immediate attention.'
          : (e.next_review_at ? 'The monitoring review point has been reached.'
          : (e.due_by && new Date(e.due_by).getTime() <= Date.now() ? 'The escalation response date has been reached.'
          : dueNow ? 'An open escalation needs active follow-up.' : `Due ${dueDateLabel(e.due_by)} — not yet due.`));
        const item: GuidedWorkItem = { id:`escalation:${e.id}`, role, state: dueNow ? 'NEEDS_YOU' : 'WAITING', priority: rmAttention ? 'URGENT' : priorityFor(e.due_by,['Urgent','Critical'].includes(e.priority)), taskType:'ESCALATION_REVIEW',
          title: rmAttention ? 'Urgent: monitored escalation needs you' : 'Review open escalation', summary:e.reason || 'Open escalation needs review', reason, dueAt:e.due_by, serviceName:e.service_name,
          canonicalEntityType:'escalation', canonicalEntityId:e.id, requiredAction:'ESCALATION_REVIEW',
          completionCondition:'Review the escalation and record its canonical next step, or close it through the existing escalation workflow.',
          route:`/escalation-log?focus=${e.id}&guided=1&gw=escalation:${e.id}`,
          actionLabel:'Review Escalation', whyAmISeeingThis: rmAttention ? 'The Team Leader monitoring this escalation flagged it as urgent.' : (e.due_by && new Date(e.due_by).getTime() <= Date.now() ? 'This escalation is open and its response date has arrived.' : dueNow ? 'This escalation is open and needs review.' : `This escalation is open but its response date is not until ${dueDateLabel(e.due_by)}.`) };
        (dueNow ? needsYou : waiting).push(item);
      }

      // Deferred learning ("Not yet assessed") returns to the queue when the review date the RM set
      // has arrived — so a lesson that was parked for later cannot drift unassessed. Scoped to the
      // user's houses, plus any deferral they personally own.
      const dueLearning = await safeRows(`
        SELECT lr.id, lr.review_date, lr.house_id, h.name AS service_name,
               sa.title AS source_action_title
          FROM learning_records lr
          LEFT JOIN houses h ON h.id=lr.house_id
          LEFT JOIN risk_actions sa ON sa.id=lr.source_id AND lr.source_type='EFFECTIVENESS'
         WHERE lr.company_id=$1 AND lr.state='NOT_YET_ASSESSED'
           AND lr.review_date IS NOT NULL AND lr.review_date <= CURRENT_DATE
           AND (lr.house_id=ANY($2::uuid[]) OR lr.house_id IS NULL OR lr.owner_id=$3)
         ORDER BY lr.review_date`, [companyId, houses, userId]);
      for (const l of dueLearning) needsYou.push({ id:`learning:${l.id}`, role, state:'NEEDS_YOU', priority:priorityFor(l.review_date), taskType:'LEARNING_REVIEW',
        title:'Complete learning assessment', summary:l.source_action_title ? `Deferred lesson from: ${l.source_action_title}` : 'A deferred learning assessment is due', reason:'The learning assessment date you set has been reached.', dueAt:l.review_date, serviceName:l.service_name,
        canonicalEntityType:'learning', canonicalEntityId:l.id, requiredAction:'ASSESS_LEARNING',
        completionCondition:'Record the lesson (or that no learning was identified) for this deferred assessment.',
        route:`/learning?focus=${l.id}&gw=learning:${l.id}`,
        actionLabel:'Complete Assessment', whyAmISeeingThis:'You scheduled this learning assessment and its date has arrived.' });

      // Weekly Governance is a review of the PREVIOUS completed Monday-Sunday evidence period.
      // It becomes actionable only when the provider-local configured cadence is reached.
      // The review spine is not just "this week": a missed week stays owed until it is done, so the
      // queue must show the BACKLOG (up to 8 weeks) per house — that is how ageing/"how many were
      // missed" becomes visible. Each week is generated at the provider-configured day/time, and only
      // weeks whose review time has passed and have no completed review are surfaced.
      const weekly = await safeRows(`
        WITH cfg AS (
          -- Effective-dated schedule in force today (matches overview()/ageing), so the Guided
          -- Work backlog and the dashboards compute identical periods and due dates.
          SELECT COALESCE(NULLIF(c.governance_timezone,''),'Europe/London') AS tz,
                 COALESCE(v.review_dow, c.weekly_governance_review_dow, 1) AS review_dow,
                 COALESCE(v.review_time, c.weekly_governance_review_time, '09:00'::time) AS review_time
            FROM companies c
            LEFT JOIN LATERAL (
              SELECT review_dow, review_time FROM company_schedule_versions
               WHERE company_id=c.id AND effective_from <= (NOW() AT TIME ZONE COALESCE(NULLIF(c.governance_timezone,''),'Europe/London'))::date
               ORDER BY effective_from DESC LIMIT 1
            ) v ON TRUE
           WHERE c.id=$1
        ), local_clock AS (
          SELECT (NOW() AT TIME ZONE cfg.tz) AS local_now, cfg.*
            FROM cfg
        ), weeks AS (
          SELECT g.n,
                 (date_trunc('week',local_now)::date - 1 - (g.n * 7)) AS week_ending,
                 (date_trunc('week',local_now)::date - (g.n * 7)
                   + ((review_dow + 7 - EXTRACT(DOW FROM date_trunc('week',local_now)::date)::int) % 7)
                   + review_time) AS due_local,
                 local_now
            FROM local_clock, generate_series(0, 7) AS g(n)
        )
        SELECT h.id,h.name,w.week_ending,w.due_local
          FROM canonical_house_state_v h
          CROSS JOIN weeks w
          -- Adoption floor: only count weeks from the house's FIRST completed review onward, so a
          -- house that has been doing reviews and skipped a week shows that week, but pre-adoption
          -- weeks are never surfaced as "missed". A house that has never reviewed shows the current
          -- week only (n=0) — its starting obligation, not 8 weeks of retrospective noise.
          LEFT JOIN LATERAL (
            SELECT MIN(week_ending) AS first_week FROM weekly_reviews wr2
             WHERE wr2.company_id=h.company_id AND wr2.house_id=h.id
               AND wr2.status IN ('pending_validation','LOCKED','published')
          ) fr ON TRUE
         WHERE h.company_id=$1 AND h.is_active
           AND w.local_now >= w.due_local
           AND ( (fr.first_week IS NULL AND w.n = 0) OR (fr.first_week IS NOT NULL AND date_trunc('week', w.week_ending) >= date_trunc('week', fr.first_week)) )
           AND NOT EXISTS (
             SELECT 1 FROM weekly_reviews wr
              WHERE wr.company_id=h.company_id AND wr.house_id=h.id
                -- Match on the ISO WEEK, not the exact date: reviews are saved with whatever date the
                -- RM picked (often not the canonical Sunday week-ending), so an exact-date match left
                -- completed reviews sitting on the queue every week. Same ISO week = the same review.
                AND date_trunc('week', wr.week_ending) = date_trunc('week', w.week_ending)
                AND wr.status IN ('pending_validation','LOCKED','published')
           )
         ORDER BY h.name, w.week_ending`, [companyId]);
      for (const h of weekly) {
        const wk = weekKey(h.week_ending);
        const daysOverdue = h.due_local ? Math.max(0, Math.floor((Date.now() - new Date(h.due_local).getTime()) / 86400000)) : 0;
        const overdue = daysOverdue >= 1;
        needsYou.push({
          // Each week is its own concern (composite id) so the backlog is NOT collapsed by dedupe —
          // three missed weeks for a house must show as three items, which is how ageing is seen.
          id:`weekly:${h.id}:${wk}`, role, state:'NEEDS_YOU',
          priority: daysOverdue >= 7 ? 'URGENT' : (overdue ? 'DUE' : 'NORMAL'), taskType:'WEEKLY_GOVERNANCE',
          title:`Complete Weekly Governance · ${h.name}${overdue ? ` · ${daysOverdue}d overdue` : ''}`,
          summary:`Review the completed week ending ${fmtWeek(h.week_ending)}.${overdue ? ` This review is ${daysOverdue} day(s) overdue.` : ''}`,
          reason:`Weekly Governance became due at the provider-local configured review time.`, serviceName:h.name, dueAt:h.due_local,
          canonicalEntityType:'weekly_governance', canonicalEntityId:`${h.id}:${wk}`, requiredAction:'WEEKLY_GOVERNANCE_REVIEW',
          completionCondition:'The specified service/week review is submitted into the existing weekly governance lifecycle.',
          route:`/weekly-review?guided=1&gw=weekly:${h.id}:${wk}&houseId=${h.id}&weekEnding=${wk}`,
          actionLabel:'Start Weekly Review', whyAmISeeingThis:'The previous completed governance week is now due for RM review under the provider governance cadence.' });
      }

      // Waiting = open actions in scoped services owned by someone else.
      const waitingActions = await safeRows(`
        SELECT ra.id,ra.title,ra.due_date,u.first_name,u.last_name,h.name AS service_name
          FROM canonical_action_state_v ra JOIN canonical_risk_state_v r ON r.id=ra.risk_id AND r.company_id=ra.company_id
          LEFT JOIN users u ON u.id=ra.assigned_to LEFT JOIN houses h ON h.id=r.house_id
         WHERE ra.company_id=$1 AND r.house_id=ANY($2::uuid[]) AND ra.is_open
           AND ra.assigned_to IS NOT NULL AND ra.assigned_to<>$3
         ORDER BY ra.due_date NULLS LAST LIMIT 20`, [companyId,houses,userId]);
      for (const a of waitingActions) waiting.push({ id:`waiting_action:${a.id}`, role, state:'WAITING', priority:'NORMAL', taskType:'WAITING_ACTION', title:a.title || 'Action in progress',
        summary:`Assigned to ${[a.first_name,a.last_name].filter(Boolean).join(' ') || 'another owner'}`, reason:'Another owner has the next action.', dueAt:a.due_date, serviceName:a.service_name,
        canonicalEntityType:'action', canonicalEntityId:a.id, route:`/my-actions?focus=${a.id}&guided=1&gw=waiting_action:${a.id}`,
        actionLabel:'View', whyAmISeeingThis:'This linked action remains open, but another owner is responsible for the next step.' });
    }

    // RI Queries (scoped and confirmed 21 Oct 2026): an OPEN query assigned to this user needs an
    // evidenced answer; an ANSWERED query this user raised needs them to review it and either close
    // it satisfied or reopen with a reason. Role-agnostic — a query's assigned_to/raised_by is
    // whichever RM/Director/RI/Admin it actually names, not inferred from role.
    if (['REGISTERED_MANAGER','DIRECTOR','RESPONSIBLE_INDIVIDUAL','ADMIN','SUPER_ADMIN'].includes(role)) {
      const toAnswer = await safeRows(`
        SELECT q.id, q.subject, q.raised_at, h.name AS service_name
          FROM governance_queries q LEFT JOIN houses h ON h.id=q.house_id
         WHERE q.company_id=$1 AND q.assigned_to=$2 AND q.status='OPEN'
         ORDER BY q.raised_at`, [companyId, userId]);
      for (const q of toAnswer) needsYou.push({
        id:`query_answer:${q.id}`, role, state:'NEEDS_YOU', priority:'NORMAL', taskType:'QUERY_ANSWER',
        title:'Query raised', summary:q.subject, reason:'An RI/Director query needs an evidenced answer.',
        dueAt:null, serviceName:q.service_name, canonicalEntityType:'query', canonicalEntityId:q.id, requiredAction:'ANSWER_QUERY',
        completionCondition:'An evidenced answer is recorded for this query.', route:`/queries?focus=${q.id}&guided=1&gw=query_answer:${q.id}`,
        actionLabel:'Answer', whyAmISeeingThis:'This query was raised against you or your service and is awaiting your answer.'
      });
      const toReview = await safeRows(`
        SELECT q.id, q.subject, q.response_text, q.responded_at, h.name AS service_name
          FROM governance_queries q LEFT JOIN houses h ON h.id=q.house_id
         WHERE q.company_id=$1 AND q.raised_by=$2 AND q.status='ANSWERED'
         ORDER BY q.responded_at`, [companyId, userId]);
      for (const q of toReview) needsYou.push({
        id:`query_review:${q.id}`, role, state:'NEEDS_YOU', priority:'NORMAL', taskType:'QUERY_REVIEW',
        title:'Query answered — review', summary:q.response_text || q.subject, reason:'Your query has been answered and is awaiting your review.',
        dueAt:null, serviceName:q.service_name, canonicalEntityType:'query', canonicalEntityId:q.id, requiredAction:'REVIEW_QUERY_ANSWER',
        completionCondition:'The query is closed as satisfied, or reopened with a reason.', route:`/queries?focus=${q.id}&guided=1&gw=query_review:${q.id}`,
        actionLabel:'Review answer', whyAmISeeingThis:'You raised this query and it now has an answer for you to accept or challenge.'
      });
    }

    // DIRECTOR: weekly validations, cross-service patterns, strategic/critical risks and incomplete effectiveness.
    if (role === 'DIRECTOR') {
      // Director Mobile My Work Navigation correction (13 Oct 2026): the Director's own personal
      // "overdue actions"/"assigned actions requiring attention" counts must come from the SAME
      // canonical action population this queue returns — not a separately-computed card total that
      // has no matching list to open. Mirrors the Team Leader assigned-action query above.
      const directorActions = await safeRows(`
        SELECT ra.id, ra.title, ra.due_date, h.name AS service_name
          FROM canonical_action_state_v ra
          LEFT JOIN risks r ON r.id=ra.risk_id AND r.company_id=ra.company_id
          LEFT JOIN houses h ON h.id=r.house_id
         WHERE ra.company_id=$1 AND ra.assigned_to=$2
           AND ra.is_open
         ORDER BY ra.due_date NULLS LAST, ra.created_at`, [companyId, userId]);
      for (const a of directorActions) {
        const dueNow = isDueByToday(a.due_date);
        const item: GuidedWorkItem = {
          id:`action:${a.id}`, role, state: dueNow ? 'NEEDS_YOU' : 'WAITING', priority:priorityFor(a.due_date), taskType:'ASSIGNED_ACTION',
          title:a.title || 'Complete assigned action', summary:'Complete the assigned governance action and record factual completion evidence.',
          reason: dueNow ? 'This governance action is personally assigned to you.' : `Due ${dueDateLabel(a.due_date)} — not yet due.`,
          dueAt:a.due_date, serviceName:a.service_name,
          canonicalEntityType:'action', canonicalEntityId:a.id, requiredAction:'COMPLETE_ASSIGNED_ACTION',
          completionCondition:'The assigned action is completed through the canonical completion service with factual completion evidence.',
          route:`/my-actions?focus=${a.id}&guided=1&gw=action:${a.id}`,
          actionLabel:'Complete Action', whyAmISeeingThis: dueNow ? 'This action is assigned to you and remains open.' : `This action is assigned to you but is not due until ${dueDateLabel(a.due_date)}.`
        };
        (dueNow ? needsYou : waiting).push(item);
      }

      const weekly = await safeRows(`SELECT id,week_ending FROM weekly_reviews WHERE company_id=$1 AND status='pending_validation' AND validation_status='Pending' ORDER BY week_ending`,[companyId]);
      for (const w of weekly) needsYou.push({id:`director_weekly:${w.id}`,role,state:'NEEDS_YOU',priority:'DUE',taskType:'WEEKLY_VALIDATION',title:'Validate weekly governance review',summary:`Week ending ${fmtWeek(w.week_ending)}`,reason:'A Registered Manager weekly review is awaiting Director validation.',canonicalEntityType:'weekly_governance',canonicalEntityId:w.id,requiredAction:'DIRECTOR_WEEKLY_VALIDATION',
completionCondition:'The specified weekly review is validated through the existing Director validation function.',
route:`/weekly-review/${w.id}?guided=1&gw=director_weekly:${w.id}`,actionLabel:'Validate Review',whyAmISeeingThis:'This weekly review has been submitted for Director validation.'});

      // Director oversight is CROSS-SERVICE (systemic) patterns only — individual per-service /
      // per-person patterns are the RM's operational work on the RM pipeline, not leadership review.
      // Show a systemic pattern when its review is due, or when it is escalated AND not yet reviewed;
      // once the Director reviews it (last_reviewed_at set, next review date in the future) it clears
      // until it is next due, so a reviewed pattern no longer sits on the queue.
      // A pattern whose linked risk is CLOSED no longer needs leadership review — its concern is
      // resolved everywhere else (register, oversight, escalations), so it must not keep nagging on
      // the Director's Guided Work queue (field-test issue, closed-risk pattern lingering).
      const patterns = await safeRows(`SELECT sc.id,sc.cluster_label,sc.trajectory::text,sc.linked_risk_id,h.name AS service_name FROM canonical_pattern_state_v sc LEFT JOIN houses h ON h.id=sc.house_id WHERE sc.company_id=$1 AND sc.is_active AND sc.scope='cross_service' AND (sc.review_due OR (sc.canonical_status='ESCALATED' AND sc.last_reviewed_at IS NULL)) AND NOT (sc.linked_risk_id IS NOT NULL AND EXISTS (SELECT 1 FROM canonical_risk_state_v r WHERE r.id=sc.linked_risk_id AND r.company_id=sc.company_id AND r.is_closed)) ORDER BY sc.updated_at DESC LIMIT 20`,[companyId]);
      // A promoted pattern opens the actual linked risk; an unpromoted one opens the pattern register.
      for (const p of patterns) needsYou.push({id:`director_pattern:${p.id}`,role,state:'NEEDS_YOU',priority:p.trajectory==='Critical'?'URGENT':'DUE',taskType:'CROSS_SERVICE_PATTERN',title:p.cluster_label||'Review governance pattern',summary:`Trajectory: ${p.trajectory}`,reason:'A material pattern requires leadership scrutiny.',serviceName:p.service_name,canonicalEntityType:'pattern',canonicalEntityId:p.id,concernRiskId:p.linked_risk_id||null,requiredAction:'DIRECTOR_PATTERN_REVIEW',completionCondition:'The exact systemic pattern receives the required leadership review.',route:`/systemic-patterns?focus=${p.id}&guided=1&gw=director_pattern:${p.id}`,actionLabel:'Review Pattern',whyAmISeeingThis:'This active pattern is deteriorating or critical and requires leadership scrutiny.'});

      const risks = await safeRows(`SELECT id,title,severity::text,review_due_at AS due_at FROM canonical_risk_state_v WHERE company_id=$1 AND is_active AND (severity::text='Critical' OR needs_review) ORDER BY (severity::text='Critical') DESC,review_due_at NULLS LAST,updated_at DESC LIMIT 20`,[companyId]);
      for (const r of risks) needsYou.push({id:`director_risk:${r.id}`,role,state:'NEEDS_YOU',priority:r.severity==='Critical'?'URGENT':priorityFor(r.due_at),taskType:'STRATEGIC_RISK_REVIEW',title:r.title||'Review strategic risk',summary:`${r.severity} risk`,reason:'A material risk requires Director oversight.',dueAt:r.due_at,canonicalEntityType:'risk',canonicalEntityId:r.id,concernRiskId:r.id,requiredAction:'DIRECTOR_RISK_REVIEW',completionCondition:'The required leadership review of this exact risk is persisted.',route:`/risk-register/${r.id}?guided=1&gw=director_risk:${r.id}`,actionLabel:'Review Risk',whyAmISeeingThis:'This risk is critical or deteriorating and requires leadership scrutiny.'});
    }

    // RI: material assurance exceptions and provider sign-off.
    if (role === 'RESPONSIBLE_INDIVIDUAL') {
      const risks = await safeRows(`SELECT id,title,severity::text,trajectory::text,review_due_at AS due_at FROM canonical_risk_state_v WHERE company_id=$1 AND is_active AND severity::text='Critical' ORDER BY updated_at DESC LIMIT 20`,[companyId]);
      for (const r of risks) needsYou.push({id:`ri_risk:${r.id}`,role,state:'NEEDS_YOU',priority:'URGENT',taskType:'ASSURANCE_EXCEPTION',title:r.title||'Critical strategic risk',summary:`Trajectory: ${r.trajectory}`,reason:'This critical risk limits positive provider assurance.',dueAt:r.due_at,canonicalEntityType:'risk',canonicalEntityId:r.id,concernRiskId:r.id,requiredAction:'RI_ASSURANCE_RISK_REVIEW',completionCondition:'The required RI assurance review of this exact critical risk is persisted.',route:`/risk-register/${r.id}?guided=1&gw=ri_risk:${r.id}`,actionLabel:'Review Assurance Gap',whyAmISeeingThis:'This open critical risk materially limits provider assurance.'});

      const ready = await safeRows(`SELECT DISTINCT wr.week_ending FROM weekly_reviews wr WHERE wr.company_id=$1 AND wr.week_ending=(SELECT MAX(week_ending) FROM weekly_reviews WHERE company_id=$1) AND wr.validation_status='Approved' AND NOT EXISTS (SELECT 1 FROM provider_review_signoffs prs WHERE prs.company_id=$1 AND prs.week_ending=wr.week_ending)`,[companyId]);
      if (ready[0]) needsYou.push({id:`ri_signoff:${ready[0].week_ending}`,role,state:'NEEDS_YOU',priority:'DUE',taskType:'PROVIDER_ASSURANCE_SIGNOFF',title:'Provider position awaiting RI sign-off',summary:`Week ending ${fmtWeek(ready[0].week_ending)}`,reason:'Approved service reviews are ready for RI assurance sign-off.',canonicalEntityType:'provider_assurance',canonicalEntityId:String(ready[0].week_ending),requiredAction:'RI_PROVIDER_ASSURANCE_SIGNOFF',completionCondition:'The RI assurance decision for this exact provider week is persisted.',route:`/service-review-rollup?weekEnding=${ready[0].week_ending}&guided=1&gw=ri_signoff:${ready[0].week_ending}`,actionLabel:'Record Assurance Decision',whyAmISeeingThis:'The latest approved provider position is awaiting your assurance decision.'});
    }

    // Completed today is informational only; no state is owned by Guided Work.
    const completedActions = await safeRows(`SELECT id,title,completed_at FROM canonical_action_state_v WHERE company_id=$1 AND assigned_to=$2 AND is_completed AND completed_at::date=CURRENT_DATE ORDER BY completed_at DESC LIMIT 20`,[companyId,userId]);
    for (const a of completedActions) completedToday.push({id:`completed_action:${a.id}`,role,state:'COMPLETE',priority:'NORMAL',taskType:'COMPLETED_ACTION',title:a.title||'Action completed',summary:'Completion recorded today.',reason:'Completed canonical action.',dueAt:a.completed_at,canonicalEntityType:'action',canonicalEntityId:a.id,route:`/my-actions?focus=${a.id}`,actionLabel:'View',whyAmISeeingThis:'This action was completed by you today.'});

    // Simplified Work Model — "one concern, one place": collapse items that resolve to the
    // same canonical concern so a subject appears exactly once (a pattern promoted to a risk,
    // or a risk carrying several due obligations, previously surfaced as duplicate rows — the
    // root cause of the reported "duplication"). Obligation-backed items win, because they
    // clear deterministically when the obligation completes; among equals, higher priority wins.
    const concernKey = (it: GuidedWorkItem) =>
      it.concernRiskId ? `risk:${it.concernRiskId}` : `${it.canonicalEntityType}:${it.canonicalEntityId}`;
    const dedupeConcerns = (items: GuidedWorkItem[]) => {
      const best = new Map<string, GuidedWorkItem>();
      for (const it of items) {
        const k = concernKey(it);
        const cur = best.get(k);
        if (!cur) { best.set(k, it); continue; }
        const curBacked = !!cur.obligationId, itBacked = !!it.obligationId;
        if (itBacked !== curBacked) { if (itBacked) best.set(k, it); continue; }
        if (byPriority(it, cur) < 0) best.set(k, it);
      }
      return [...best.values()];
    };
    // Assigned-to-me work vs role decisions that are due (the mockup's two columns). A TL's
    // monitoring item is factual work they personally do, not a governance decision they own —
    // tagging it DECISION made it read as a decision overdue under "Decisions Due" (field report
    // 16 Oct 2026). Only the RM/owner-facing governance decision items are DECISION.
    const ASSIGNED_TASK_TYPES = new Set(['ASSIGNED_ACTION', 'WEEKLY_ACK', 'SIGNAL_MONITORING', 'ESCALATION_MONITORING']);
    const withCategory = (it: GuidedWorkItem): GuidedWorkItem =>
      ({ ...it, category: ASSIGNED_TASK_TYPES.has(it.taskType) ? 'ASSIGNED' : 'DECISION' });

    // Guided Work never hides active work: the full canonical population is returned and
    // ordered by priority. Completion removes an item only by changing canonical state.
    const filteredNeeds = dedupeConcerns(needsYou).map(withCategory).sort(byPriority);
    const filteredWaiting = waiting.slice().sort(byPriority);

    // Weekly-review ageing: how many reviews are overdue right now, and how many of those fall in the
    // current calendar month (the "how many did we miss this month" figure the dashboards surface).
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const weeklyItems = filteredNeeds.filter(i => i.taskType === 'WEEKLY_GOVERNANCE');
    const weeklyOverdue = weeklyItems.filter(i => i.priority === 'DUE' || i.priority === 'URGENT');
    const weeklyMissedThisMonth = weeklyOverdue.filter(i => i.dueAt && new Date(i.dueAt).getTime() >= monthStart).length;

    return {
      needsYou: filteredNeeds,
      waiting: filteredWaiting,
      completedToday,
      counts: { needsYou: filteredNeeds.length, waiting: filteredWaiting.length, completedToday: completedToday.length },
      weeklyAgeing: { overdue: weeklyOverdue.length, missedThisMonth: weeklyMissedThisMonth, backlog: weeklyItems.length },
      next: filteredNeeds[0] || null,
      // No silent success: when any source failed the list is INCOMPLETE — the UI must warn
      // rather than present an empty queue as "nothing due".
      degraded: degraded.length > 0,
      degradedSources: degraded,
      doctrine: 'READ_PRIORITISE_ROUTE_REFRESH_ONLY'
    };
  }
};
