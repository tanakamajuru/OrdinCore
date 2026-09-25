import { query } from '../config/database';

type GuidedRole = 'TEAM_LEADER'|'REGISTERED_MANAGER'|'DIRECTOR'|'RESPONSIBLE_INDIVIDUAL'|'ADMIN'|'SUPER_ADMIN';
type GuidedPriority = 'URGENT'|'DUE'|'NORMAL';
type GuidedState = 'NEEDS_YOU'|'WAITING'|'COMPLETE';
type EntityType = 'signal'|'action'|'escalation'|'pattern'|'risk'|'effectiveness_review'|'weekly_governance'|'provider_assurance';

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

const priorityFor = (dueAt?: string | Date | null, critical = false): GuidedPriority => {
  if (critical) return 'URGENT';
  if (!dueAt) return 'NORMAL';
  const due = new Date(dueAt).getTime();
  return due <= Date.now() ? 'DUE' : 'NORMAL';
};

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
      for (const a of actions) needsYou.push({
        id:`action:${a.id}`, role, state:'NEEDS_YOU', priority:priorityFor(a.due_date), taskType:'ASSIGNED_ACTION',
        title:a.title || 'Complete assigned action', summary:'Complete the assigned intervention and record factual completion evidence.',
        reason:'Management has assigned this action to you.', dueAt:a.due_date, serviceName:a.service_name,
        canonicalEntityType:'action', canonicalEntityId:a.id, requiredAction:'COMPLETE_ASSIGNED_ACTION',
        completionCondition:'The assigned action is completed through the canonical completion service with factual completion evidence.',
        route:`/my-actions?focus=${a.id}&guided=1&gw=action:${a.id}`,
        actionLabel:'Complete Action', whyAmISeeingThis:'This action is assigned to you and remains open.'
      });

      const weekly = await safeRows(`
        SELECT wr.id, wr.week_ending, h.name AS service_name
          FROM weekly_reviews wr JOIN houses h ON h.id=wr.house_id
         WHERE wr.company_id=$1 AND wr.status='published' AND wr.house_id = ANY($3::uuid[])
           AND NOT EXISTS (SELECT 1 FROM weekly_review_acknowledgements a WHERE a.review_id=wr.id AND a.user_id=$2)
         ORDER BY wr.week_ending DESC`, [companyId, userId, houses]);
      for (const w of weekly) needsYou.push({
        id:`weekly_ack:${w.id}`, role, state:'NEEDS_YOU', priority:'NORMAL', taskType:'WEEKLY_ACK',
        title:'Read published weekly governance review', summary:`Week ending ${w.week_ending}`,
        reason:'A published weekly governance review is awaiting your acknowledgement.', serviceName:w.service_name,
        canonicalEntityType:'weekly_governance', canonicalEntityId:w.id, requiredAction:'ACKNOWLEDGE_WEEKLY_GOVERNANCE',
        completionCondition:'Your acknowledgement of this exact published weekly review is persisted.',
        route:`/weekly-review/${w.id}?guided=1&gw=weekly_ack:${w.id}`,
        actionLabel:'Read & Acknowledge', whyAmISeeingThis:'This weekly review has been published for your service and has not yet been acknowledged by you.'
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
         ORDER BY CASE gp.severity::text WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 ELSE 3 END, gp.created_at`, [companyId, houses]);
      for (const s of signals) needsYou.push({
        id:`signal:${s.id}`, role, state:'NEEDS_YOU', priority:priorityFor(null, ['Critical','High'].includes(s.severity)), taskType:'SIGNAL_DECISION',
        title:`Review ${s.related_person ? `${s.related_person} · ` : ''}signal`, summary:s.description || 'New governance signal',
        reason:'A new signal is awaiting an RM Daily Governance decision.', serviceName:s.service_name,
        canonicalEntityType:'signal', canonicalEntityId:s.id, requiredAction:'RM_SIGNAL_DECISION', completionCondition:'A canonical RM Daily Governance decision is persisted for this signal.', route:`/governance-dashboard?guided=1&gw=signal:${s.id}&pulseId=${s.id}&houseId=${s.house_id}`,
        actionLabel:'Review Signal', whyAmISeeingThis:'This signal has not yet received an RM governance decision.'
      });

      const monitoring = await safeRows(`
        SELECT gr.id, gr.pulse_entry_id, gr.service_id, gr.what_is_happening, gr.due_at, h.name AS service_name
          FROM governance_reviews gr LEFT JOIN houses h ON h.id=gr.service_id
         WHERE gr.company_id=$1 AND gr.decision='Monitor' AND gr.decision_status='Monitoring'
           AND gr.decision_owner_id=$2 AND gr.due_at <= NOW()
         ORDER BY gr.due_at`, [companyId, userId]);
      for (const m of monitoring) needsYou.push({
        id:`monitor:${m.id}`, role, state:'NEEDS_YOU', priority:'DUE', taskType:'MONITORING_REVIEW', title:'Review monitored concern',
        summary:m.what_is_happening || 'Monitoring review due', reason:'The monitoring review point has been reached.', dueAt:m.due_at, serviceName:m.service_name,
        canonicalEntityType:'signal', canonicalEntityId:m.pulse_entry_id || m.id, requiredAction:'RM_MONITORING_REVIEW',
        completionCondition:'A new canonical RM decision is persisted for the monitored signal at its due review point.',
        route:m.pulse_entry_id ? `/governance-dashboard?pulseId=${m.pulse_entry_id}&houseId=${m.service_id}&guided=1&gw=monitor:${m.id}` : `/governance-dashboard?guided=1&gw=monitor:${m.id}`,
        actionLabel:'Review Monitoring', whyAmISeeingThis:'You previously chose Monitor and the review date is now due.'
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
        SELECT e.id,e.reason,e.priority,e.due_by,h.name AS service_name
          FROM canonical_escalation_state_v e LEFT JOIN houses h ON h.id=e.house_id
         WHERE e.company_id=$1 AND e.house_id=ANY($2::uuid[])
           AND e.is_open AND e.due_by IS NOT NULL AND e.due_by <= NOW()
         ORDER BY e.due_by`, [companyId, houses]);
      for (const e of escalations) needsYou.push({ id:`escalation:${e.id}`, role, state:'NEEDS_YOU', priority:priorityFor(e.due_by,['Urgent','Critical'].includes(e.priority)), taskType:'ESCALATION_REVIEW',
        title:'Review open escalation', summary:e.reason || 'Escalation review due', reason:'The escalation review date has been reached.', dueAt:e.due_by, serviceName:e.service_name,
        canonicalEntityType:'escalation', canonicalEntityId:e.id, requiredAction:'ESCALATION_REVIEW',
        completionCondition:'The escalation is closed or its canonical next review point is moved into the future.',
        route:`/escalation-log?focus=${e.id}&guided=1&gw=escalation:${e.id}`,
        actionLabel:'Review Escalation', whyAmISeeingThis:'This escalation is still open and its review/due point has been reached.' });

      // Weekly Governance is a review of the PREVIOUS completed Monday-Sunday evidence period.
      // It becomes actionable only when the provider-local configured cadence is reached.
      const weekly = await safeRows(`
        WITH cfg AS (
          SELECT COALESCE(NULLIF(governance_timezone,''),'Europe/London') AS tz,
                 COALESCE(weekly_governance_review_dow,1) AS review_dow,
                 COALESCE(weekly_governance_review_time,'09:00'::time) AS review_time
            FROM companies WHERE id=$1
        ), local_clock AS (
          SELECT (NOW() AT TIME ZONE cfg.tz) AS local_now, cfg.*
            FROM cfg
        ), period AS (
          SELECT (date_trunc('week',local_now)::date - 1) AS week_ending,
                 (date_trunc('week',local_now)::date
                   + ((review_dow + 7 - EXTRACT(DOW FROM date_trunc('week',local_now)::date)::int) % 7)
                   + review_time) AS due_local,
                 local_now
            FROM local_clock
        )
        SELECT h.id,h.name,p.week_ending,p.due_local
          FROM canonical_house_state_v h CROSS JOIN period p
         WHERE h.company_id=$1 AND h.is_active
           AND p.local_now >= p.due_local
           AND NOT EXISTS (
             SELECT 1 FROM weekly_reviews wr
              WHERE wr.company_id=h.company_id AND wr.house_id=h.id
                AND wr.week_ending=p.week_ending
                AND wr.status IN ('pending_validation','LOCKED','published')
           )
         ORDER BY h.name`, [companyId]);
      for (const h of weekly) needsYou.push({ id:`weekly:${h.id}:${h.week_ending}`, role, state:'NEEDS_YOU', priority:'NORMAL', taskType:'WEEKLY_GOVERNANCE', title:`Complete Weekly Governance · ${h.name}`,
        summary:`Review the completed week ending ${h.week_ending}.`, reason:`Weekly Governance became due at the provider-local configured review time.`, serviceName:h.name, dueAt:h.due_local,
        canonicalEntityType:'weekly_governance', canonicalEntityId:h.id, requiredAction:'WEEKLY_GOVERNANCE_REVIEW',
        completionCondition:'The specified service/week review is submitted into the existing weekly governance lifecycle.',
        route:`/weekly-review?guided=1&gw=weekly:${h.id}:${h.week_ending}&houseId=${h.id}&weekEnding=${h.week_ending}`,
        actionLabel:'Start Weekly Review', whyAmISeeingThis:'The previous completed governance week is now due for RM review under the provider governance cadence.' });

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

    // DIRECTOR: weekly validations, cross-service patterns, strategic/critical risks and incomplete effectiveness.
    if (role === 'DIRECTOR') {
      const weekly = await safeRows(`SELECT id,week_ending FROM weekly_reviews WHERE company_id=$1 AND status='pending_validation' AND validation_status='Pending' ORDER BY week_ending`,[companyId]);
      for (const w of weekly) needsYou.push({id:`director_weekly:${w.id}`,role,state:'NEEDS_YOU',priority:'DUE',taskType:'WEEKLY_VALIDATION',title:'Validate weekly governance review',summary:`Week ending ${w.week_ending}`,reason:'A Registered Manager weekly review is awaiting Director validation.',canonicalEntityType:'weekly_governance',canonicalEntityId:w.id,requiredAction:'DIRECTOR_WEEKLY_VALIDATION',
completionCondition:'The specified weekly review is validated through the existing Director validation function.',
route:`/weekly-review/${w.id}?guided=1&gw=director_weekly:${w.id}`,actionLabel:'Validate Review',whyAmISeeingThis:'This weekly review has been submitted for Director validation.'});

      // Director oversight is CROSS-SERVICE (systemic) patterns only — individual per-service /
      // per-person patterns are the RM's operational work on the RM pipeline, not leadership review.
      // Show a systemic pattern when its review is due, or when it is escalated AND not yet reviewed;
      // once the Director reviews it (last_reviewed_at set, next review date in the future) it clears
      // until it is next due, so a reviewed pattern no longer sits on the queue.
      const patterns = await safeRows(`SELECT sc.id,sc.cluster_label,sc.trajectory::text,sc.linked_risk_id,h.name AS service_name FROM canonical_pattern_state_v sc LEFT JOIN houses h ON h.id=sc.house_id WHERE sc.company_id=$1 AND sc.is_active AND sc.scope='cross_service' AND (sc.review_due OR (sc.canonical_status='ESCALATED' AND sc.last_reviewed_at IS NULL)) ORDER BY sc.updated_at DESC LIMIT 20`,[companyId]);
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
      if (ready[0]) needsYou.push({id:`ri_signoff:${ready[0].week_ending}`,role,state:'NEEDS_YOU',priority:'DUE',taskType:'PROVIDER_ASSURANCE_SIGNOFF',title:'Provider position awaiting RI sign-off',summary:`Week ending ${ready[0].week_ending}`,reason:'Approved service reviews are ready for RI assurance sign-off.',canonicalEntityType:'provider_assurance',canonicalEntityId:String(ready[0].week_ending),requiredAction:'RI_PROVIDER_ASSURANCE_SIGNOFF',completionCondition:'The RI assurance decision for this exact provider week is persisted.',route:`/service-review-rollup?weekEnding=${ready[0].week_ending}&guided=1&gw=ri_signoff:${ready[0].week_ending}`,actionLabel:'Record Assurance Decision',whyAmISeeingThis:'The latest approved provider position is awaiting your assurance decision.'});
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
    // Assigned-to-me work vs role decisions that are due (the mockup's two columns), expressed
    // as data on each item; the current UI ignores it, so nothing visible changes yet.
    const withCategory = (it: GuidedWorkItem): GuidedWorkItem =>
      ({ ...it, category: (it.taskType==='ASSIGNED_ACTION' || it.taskType==='WEEKLY_ACK') ? 'ASSIGNED' : 'DECISION' });

    // Guided Work never hides active work: the full canonical population is returned and
    // ordered by priority. Completion removes an item only by changing canonical state.
    const filteredNeeds = dedupeConcerns(needsYou).map(withCategory).sort(byPriority);
    const filteredWaiting = waiting.slice().sort(byPriority);
    return {
      needsYou: filteredNeeds,
      waiting: filteredWaiting,
      completedToday,
      counts: { needsYou: filteredNeeds.length, waiting: filteredWaiting.length, completedToday: completedToday.length },
      next: filteredNeeds[0] || null,
      // No silent success: when any source failed the list is INCOMPLETE — the UI must warn
      // rather than present an empty queue as "nothing due".
      degraded: degraded.length > 0,
      degradedSources: degraded,
      doctrine: 'READ_PRIORITISE_ROUTE_REFRESH_ONLY'
    };
  }
};
