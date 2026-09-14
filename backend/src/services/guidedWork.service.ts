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
    const res = await query(`SELECT id FROM houses WHERE company_id=$1 AND COALESCE(status,'') <> 'closed'`, [companyId]);
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
  async getForUser(companyId: string, userId: string, rawRole: string, excludeId?: string) {
    const role = normalizeRole(rawRole);
    const houses = await houseScope(companyId, userId, role);
    const needsYou: GuidedWorkItem[] = [];
    const waiting: GuidedWorkItem[] = [];
    const completedToday: GuidedWorkItem[] = [];

    const safeRows = async (sql: string, params: any[] = []) => {
      try { return (await query(sql, params)).rows; } catch { return []; }
    };

    // TEAM LEADER: assigned actions + published weekly review acknowledgement.
    if (role === 'TEAM_LEADER') {
      const actions = await safeRows(`
        SELECT ra.id, ra.title, ra.due_date, h.name AS service_name
          FROM risk_actions ra
          LEFT JOIN risks r ON r.id=ra.risk_id AND r.company_id=ra.company_id
          LEFT JOIN houses h ON h.id=r.house_id
         WHERE ra.company_id=$1 AND ra.assigned_to=$2
           AND ra.status NOT IN ('Completed','Cancelled')
         ORDER BY ra.due_date NULLS LAST, ra.created_at`, [companyId, userId]);
      for (const a of actions) needsYou.push({
        id:`action:${a.id}`, role, state:'NEEDS_YOU', priority:priorityFor(a.due_date), taskType:'ASSIGNED_ACTION',
        title:a.title || 'Complete assigned action', summary:'Complete the assigned intervention and record factual completion evidence.',
        reason:'Management has assigned this action to you.', dueAt:a.due_date, serviceName:a.service_name,
        canonicalEntityType:'action', canonicalEntityId:a.id, route:`/my-actions?guided=1&gw=action:${a.id}`,
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
        canonicalEntityType:'weekly_governance', canonicalEntityId:w.id, route:`/weekly-review?guided=1&gw=weekly_ack:${w.id}`,
        actionLabel:'Read & Acknowledge', whyAmISeeingThis:'This weekly review has been published for your service and has not yet been acknowledged by you.'
      });
    }

    // RM: signal decisions, monitoring reviews, effectiveness, escalation/risk/pattern reviews, weekly governance.
    if (['REGISTERED_MANAGER','ADMIN','SUPER_ADMIN'].includes(role)) {
      const signals = await safeRows(`
        SELECT gp.id, gp.description, gp.related_person, gp.created_at, gp.severity::text, h.name AS service_name
          FROM governance_pulses gp JOIN houses h ON h.id=gp.house_id
         WHERE gp.company_id=$1 AND gp.house_id=ANY($2::uuid[]) AND COALESCE(gp.review_status::text,'New')='New'
         ORDER BY CASE gp.severity::text WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 ELSE 3 END, gp.created_at`, [companyId, houses]);
      for (const s of signals) needsYou.push({
        id:`signal:${s.id}`, role, state:'NEEDS_YOU', priority:priorityFor(null, ['Critical','High'].includes(s.severity)), taskType:'SIGNAL_DECISION',
        title:`Review ${s.related_person ? `${s.related_person} · ` : ''}signal`, summary:s.description || 'New governance signal',
        reason:'A new signal is awaiting an RM Daily Governance decision.', serviceName:s.service_name,
        canonicalEntityType:'signal', canonicalEntityId:s.id, route:`/governance-dashboard?guided=1&gw=signal:${s.id}&pulseId=${s.id}`,
        actionLabel:'Review Signal', whyAmISeeingThis:'This signal has not yet received an RM governance decision.'
      });

      const monitoring = await safeRows(`
        SELECT gr.id, gr.what_is_happening, gr.due_at, h.name AS service_name
          FROM governance_reviews gr LEFT JOIN houses h ON h.id=gr.service_id
         WHERE gr.company_id=$1 AND gr.decision='Monitor' AND gr.decision_status='Monitoring'
           AND gr.decision_owner_id=$2 AND gr.due_at <= NOW()
         ORDER BY gr.due_at`, [companyId, userId]);
      for (const m of monitoring) needsYou.push({
        id:`monitor:${m.id}`, role, state:'NEEDS_YOU', priority:'DUE', taskType:'MONITORING_REVIEW', title:'Review monitored concern',
        summary:m.what_is_happening || 'Monitoring review due', reason:'The monitoring review point has been reached.', dueAt:m.due_at, serviceName:m.service_name,
        canonicalEntityType:'risk', canonicalEntityId:m.id, route:`/governance-dashboard?guided=1&gw=monitor:${m.id}`,
        actionLabel:'Review Monitoring', whyAmISeeingThis:'You previously chose Monitor and the review date is now due.'
      });

      const obligations = await safeRows(`
        SELECT o.id,o.obligation_type,o.subject_type,o.subject_id,o.due_at,o.reason,o.source_action_id,o.source_risk_id,o.source_escalation_id,o.source_cluster_id,
               COALESCE(r.title,ra.title,sc.cluster_label,e.reason) AS subject_title, h.name AS service_name,
               r.severity::text AS risk_severity
          FROM governance_review_obligations o
          LEFT JOIN risks r ON r.id=COALESCE(o.source_risk_id, CASE WHEN o.subject_type='RISK' THEN o.subject_id END) AND r.company_id=o.company_id
          LEFT JOIN risk_actions ra ON ra.id=COALESCE(o.source_action_id, CASE WHEN o.subject_type='ACTION' THEN o.subject_id END) AND ra.company_id=o.company_id
          LEFT JOIN signal_clusters sc ON sc.id=COALESCE(o.source_cluster_id, CASE WHEN o.subject_type='PATTERN' THEN o.subject_id END) AND sc.company_id=o.company_id
          LEFT JOIN escalations e ON e.id=COALESCE(o.source_escalation_id, CASE WHEN o.subject_type='ESCALATION' THEN o.subject_id END) AND e.company_id=o.company_id
          LEFT JOIN houses h ON h.id=COALESCE(r.house_id,sc.house_id,e.house_id)
         WHERE o.company_id=$1 AND o.status='OPEN' AND o.due_at <= NOW()
           AND (o.owner_id IS NULL OR o.owner_id=$2 OR o.owner_role IN ('REGISTERED_MANAGER','ADMIN','SUPER_ADMIN'))
         ORDER BY o.due_at`, [companyId, userId]);
      for (const o of obligations) {
        const kind = String(o.obligation_type);
        let entity: EntityType='risk', route='/risk-register', label='Review';
        if (kind==='ACTION_EFFECTIVENESS') { entity='effectiveness_review'; route='/effectiveness'; label='Review Effectiveness'; }
        else if (kind==='PATTERN_REVIEW') { entity='pattern'; route='/systemic-patterns'; label='Review Pattern'; }
        else if (kind==='POST_ESCALATION_RISK') { entity='risk'; route='/risk-register?review=awaiting'; label='Review Risk'; }
        const critical = o.risk_severity==='Critical';
        needsYou.push({ id:`obligation:${o.id}`, role, state:'NEEDS_YOU', priority:priorityFor(o.due_at,critical), taskType:kind,
          title:o.subject_title || o.reason || 'Governance review due', summary:o.reason || 'A governance review obligation is due.', reason:o.reason || 'Review due.', dueAt:o.due_at, serviceName:o.service_name,
          canonicalEntityType:entity, canonicalEntityId:o.subject_id, route:`${route}${route.includes('?')?'&':'?'}guided=1&gw=obligation:${o.id}&subjectId=${o.subject_id}`,
          actionLabel:label, whyAmISeeingThis:o.reason || 'This governance review obligation is due.' });
      }

      const escalations = await safeRows(`
        SELECT e.id,e.reason,e.priority,e.due_by,h.name AS service_name
          FROM escalations e LEFT JOIN houses h ON h.id=e.house_id
         WHERE e.company_id=$1 AND e.house_id=ANY($2::uuid[])
           AND LOWER(COALESCE(e.lifecycle_status::text,e.status::text,'open')) NOT IN ('closed','resolved')
           AND e.due_by IS NOT NULL AND e.due_by <= NOW()
         ORDER BY e.due_by`, [companyId, houses]);
      for (const e of escalations) needsYou.push({ id:`escalation:${e.id}`, role, state:'NEEDS_YOU', priority:priorityFor(e.due_by,['Urgent','Critical'].includes(e.priority)), taskType:'ESCALATION_REVIEW',
        title:'Review open escalation', summary:e.reason || 'Escalation review due', reason:'The escalation review date has been reached.', dueAt:e.due_by, serviceName:e.service_name,
        canonicalEntityType:'escalation', canonicalEntityId:e.id, route:`/escalation-log?guided=1&gw=escalation:${e.id}&escalationId=${e.id}`,
        actionLabel:'Review Escalation', whyAmISeeingThis:'This escalation is still open and its review/due point has been reached.' });

      const weekly = await safeRows(`
        SELECT h.id,h.name FROM houses h WHERE h.company_id=$1 AND COALESCE(h.status,'')<>'closed'
          AND NOT EXISTS (SELECT 1 FROM weekly_reviews wr WHERE wr.company_id=h.company_id AND wr.house_id=h.id
            AND wr.week_ending >= date_trunc('week',NOW())::date AND wr.status IN ('pending_validation','LOCKED','published'))
        ORDER BY h.name`, [companyId]);
      for (const h of weekly) needsYou.push({ id:`weekly:${h.id}`, role, state:'NEEDS_YOU', priority:'NORMAL', taskType:'WEEKLY_GOVERNANCE', title:`Complete Weekly Governance · ${h.name}`,
        summary:'The current weekly governance review has not been finalised.', reason:'Weekly governance is due for this service.', serviceName:h.name,
        canonicalEntityType:'weekly_governance', canonicalEntityId:h.id, route:`/weekly-review?guided=1&gw=weekly:${h.id}&houseId=${h.id}`,
        actionLabel:'Start Weekly Review', whyAmISeeingThis:'The service does not yet have a finalised weekly governance review for the current week.' });

      // Waiting = open actions in scoped services owned by someone else.
      const waitingActions = await safeRows(`
        SELECT ra.id,ra.title,ra.due_date,u.first_name,u.last_name,h.name AS service_name
          FROM risk_actions ra JOIN risks r ON r.id=ra.risk_id AND r.company_id=ra.company_id
          LEFT JOIN users u ON u.id=ra.assigned_to LEFT JOIN houses h ON h.id=r.house_id
         WHERE ra.company_id=$1 AND r.house_id=ANY($2::uuid[]) AND ra.status NOT IN ('Completed','Cancelled')
           AND ra.assigned_to IS NOT NULL AND ra.assigned_to<>$3
         ORDER BY ra.due_date NULLS LAST LIMIT 20`, [companyId,houses,userId]);
      for (const a of waitingActions) waiting.push({ id:`waiting_action:${a.id}`, role, state:'WAITING', priority:'NORMAL', taskType:'WAITING_ACTION', title:a.title || 'Action in progress',
        summary:`Assigned to ${[a.first_name,a.last_name].filter(Boolean).join(' ') || 'another owner'}`, reason:'Another owner has the next action.', dueAt:a.due_date, serviceName:a.service_name,
        canonicalEntityType:'action', canonicalEntityId:a.id, route:`/my-actions?guided=1&gw=waiting_action:${a.id}`,
        actionLabel:'View', whyAmISeeingThis:'This linked action remains open, but another owner is responsible for the next step.' });
    }

    // DIRECTOR: weekly validations, cross-service patterns, strategic/critical risks and incomplete effectiveness.
    if (role === 'DIRECTOR') {
      const weekly = await safeRows(`SELECT id,week_ending FROM weekly_reviews WHERE company_id=$1 AND status='pending_validation' AND validation_status='Pending' ORDER BY week_ending`,[companyId]);
      for (const w of weekly) needsYou.push({id:`director_weekly:${w.id}`,role,state:'NEEDS_YOU',priority:'DUE',taskType:'WEEKLY_VALIDATION',title:'Validate weekly governance review',summary:`Week ending ${w.week_ending}`,reason:'A Registered Manager weekly review is awaiting Director validation.',canonicalEntityType:'weekly_governance',canonicalEntityId:w.id,route:`/weekly-review/validate?guided=1&gw=director_weekly:${w.id}`,actionLabel:'Validate Review',whyAmISeeingThis:'This weekly review has been submitted for Director validation.'});

      const patterns = await safeRows(`SELECT sc.id,sc.cluster_label,sc.trajectory::text,h.name AS service_name FROM signal_clusters sc LEFT JOIN houses h ON h.id=sc.house_id WHERE sc.company_id=$1 AND sc.cluster_status IN ('Confirmed','Escalated') AND sc.trajectory IN ('Deteriorating','Critical') ORDER BY sc.updated_at DESC LIMIT 20`,[companyId]);
      for (const p of patterns) needsYou.push({id:`director_pattern:${p.id}`,role,state:'NEEDS_YOU',priority:p.trajectory==='Critical'?'URGENT':'DUE',taskType:'CROSS_SERVICE_PATTERN',title:p.cluster_label||'Review governance pattern',summary:`Trajectory: ${p.trajectory}`,reason:'A material pattern requires leadership scrutiny.',serviceName:p.service_name,canonicalEntityType:'pattern',canonicalEntityId:p.id,route:`/systemic-patterns?guided=1&gw=director_pattern:${p.id}&clusterId=${p.id}`,actionLabel:'Review Pattern',whyAmISeeingThis:'This active pattern is deteriorating or critical and requires leadership scrutiny.'});

      const risks = await safeRows(`SELECT id,title,severity::text,COALESCE(next_review_date,review_due_date) AS due_at FROM risks WHERE company_id=$1 AND LOWER(status) NOT IN ('closed','resolved') AND (severity::text='Critical' OR trajectory::text IN ('Deteriorating','Critical')) ORDER BY severity DESC,updated_at DESC LIMIT 20`,[companyId]);
      for (const r of risks) needsYou.push({id:`director_risk:${r.id}`,role,state:'NEEDS_YOU',priority:r.severity==='Critical'?'URGENT':priorityFor(r.due_at),taskType:'STRATEGIC_RISK_REVIEW',title:r.title||'Review strategic risk',summary:`${r.severity} risk`,reason:'A material risk requires Director oversight.',dueAt:r.due_at,canonicalEntityType:'risk',canonicalEntityId:r.id,route:`/risk-register?guided=1&gw=director_risk:${r.id}&riskId=${r.id}`,actionLabel:'Review Risk',whyAmISeeingThis:'This risk is critical or deteriorating and requires leadership scrutiny.'});
    }

    // RI: material assurance exceptions and provider sign-off.
    if (role === 'RESPONSIBLE_INDIVIDUAL') {
      const risks = await safeRows(`SELECT id,title,severity::text,trajectory::text,COALESCE(next_review_date,review_due_date) AS due_at FROM risks WHERE company_id=$1 AND LOWER(status) NOT IN ('closed','resolved') AND severity::text='Critical' ORDER BY updated_at DESC LIMIT 20`,[companyId]);
      for (const r of risks) needsYou.push({id:`ri_risk:${r.id}`,role,state:'NEEDS_YOU',priority:'URGENT',taskType:'ASSURANCE_EXCEPTION',title:r.title||'Critical strategic risk',summary:`Trajectory: ${r.trajectory}`,reason:'This critical risk limits positive provider assurance.',dueAt:r.due_at,canonicalEntityType:'risk',canonicalEntityId:r.id,route:`/risk-register?guided=1&gw=ri_risk:${r.id}&riskId=${r.id}`,actionLabel:'Review Assurance Gap',whyAmISeeingThis:'This open critical risk materially limits provider assurance.'});

      const ready = await safeRows(`SELECT DISTINCT wr.week_ending FROM weekly_reviews wr WHERE wr.company_id=$1 AND wr.week_ending=(SELECT MAX(week_ending) FROM weekly_reviews WHERE company_id=$1) AND wr.validation_status='Approved' AND NOT EXISTS (SELECT 1 FROM provider_review_signoffs prs WHERE prs.company_id=$1 AND prs.week_ending=wr.week_ending)`,[companyId]);
      if (ready[0]) needsYou.push({id:`ri_signoff:${ready[0].week_ending}`,role,state:'NEEDS_YOU',priority:'DUE',taskType:'PROVIDER_ASSURANCE_SIGNOFF',title:'Provider position awaiting RI sign-off',summary:`Week ending ${ready[0].week_ending}`,reason:'Approved service reviews are ready for RI assurance sign-off.',canonicalEntityType:'provider_assurance',canonicalEntityId:String(ready[0].week_ending),route:`/provider-signoff?guided=1&gw=ri_signoff:${ready[0].week_ending}`,actionLabel:'Record Assurance Decision',whyAmISeeingThis:'The latest approved provider position is awaiting your assurance decision.'});
    }

    // Completed today is informational only; no state is owned by Guided Work.
    const completedActions = await safeRows(`SELECT id,title,completed_at FROM risk_actions WHERE company_id=$1 AND assigned_to=$2 AND completed_at::date=CURRENT_DATE ORDER BY completed_at DESC LIMIT 20`,[companyId,userId]);
    for (const a of completedActions) completedToday.push({id:`completed_action:${a.id}`,role,state:'COMPLETE',priority:'NORMAL',taskType:'COMPLETED_ACTION',title:a.title||'Action completed',summary:'Completion recorded today.',reason:'Completed canonical action.',dueAt:a.completed_at,canonicalEntityType:'action',canonicalEntityId:a.id,route:'/my-actions',actionLabel:'View',whyAmISeeingThis:'This action was completed by you today.'});

    const filteredNeeds = needsYou.filter(i => i.id !== excludeId).sort(byPriority);
    const filteredWaiting = waiting.filter(i => i.id !== excludeId).sort(byPriority);
    return {
      needsYou: filteredNeeds,
      waiting: filteredWaiting,
      completedToday,
      counts: { needsYou: filteredNeeds.length, waiting: filteredWaiting.length, completedToday: completedToday.length },
      next: filteredNeeds[0] || null,
      doctrine: 'READ_PRIORITISE_ROUTE_REFRESH_ONLY'
    };
  }
};
