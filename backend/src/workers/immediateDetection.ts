/**
 * immediateDetection.ts — the FAST path.
 * ----------------------------------------------------------------------------
 * Evaluate a single pulse the moment it is saved and, if it means harm-now
 * (safeguarding 1/1, a single Critical, a single High — all tunable per
 * sector+domain in immediate_detection_rules), raise an escalation with an SLA
 * immediately, bypassing all cluster maths.
 *
 * Called at the TOP of pattern.worker's evaluateRules(), before clustering.
 * It is idempotent: the unique index uq_escalation_pulse_rule (pulse, rule)
 * plus ON CONFLICT DO NOTHING guarantee one escalation per (pulse, rule), so it
 * is safe to run twice / per-domain without duplicating.
 *
 * Severity scale is Low | Moderate | High | Critical — there is NO "Medium".
 */
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { escalationDueBy } from '../services/escalations.service';
import { notificationsService } from '../services/notifications.service';
import { thresholdEventsRepo } from '../repositories/thresholdEvents.repo';
import { eventBus, EVENTS } from '../events/eventBus';
import logger from '../utils/logger';

const SEVERITY_RANK: Record<string, number> = { Low: 1, Moderate: 2, High: 3, Critical: 4 };

type ImmediateRule = {
  id: string;
  company_id: string | null;
  sector: string;
  domain_name: string;
  min_severity: string | null;
  signal_count: number;
  window_hours: number;
  match_any_severity: boolean;
  action: string;
  escalate_to_role: string;
  sla_trigger_type: string;
  priority: string;
  rationale: string | null;
};

const domainMatches = (riskDomain: any, ruleDomain: string): boolean =>
  ruleDomain === '*' || (Array.isArray(riskDomain) && riskDomain.includes(ruleDomain));

const severityMeets = (severity: string, min: string | null, anySeverity: boolean): boolean =>
  anySeverity || !min || (SEVERITY_RANK[severity] || 0) >= (SEVERITY_RANK[min] || 0);

/**
 * Resolve the rules that apply to this sector + domain, with company overrides
 * beating platform defaults for the same (domain_name, min_severity) key.
 */
async function resolveRules(company_id: string, sector: string, domain: string): Promise<ImmediateRule[]> {
  const res = await query(
    `SELECT * FROM immediate_detection_rules
      WHERE is_active = true AND sector = $1 AND (domain_name = $2 OR domain_name = '*')
        AND (company_id = $3 OR company_id IS NULL)`,
    [sector, domain, company_id]
  );
  const byKey = new Map<string, ImmediateRule>();
  for (const r of res.rows as ImmediateRule[]) {
    const key = `${r.domain_name}|${r.min_severity ?? ''}`;
    const existing = byKey.get(key);
    // A company-owned rule (company_id set) overrides the platform default (null).
    if (!existing || (r.company_id && !existing.company_id)) byKey.set(key, r);
  }
  return [...byKey.values()];
}

export async function runImmediateDetection(
  company_id: string,
  house_id: string,
  domain: string,
  pulse_id: string,
  _related_person: string | null = null,
): Promise<void> {
  try {
    const pulseRes = await query(
      `SELECT id, company_id, house_id, created_by, severity, risk_domain, related_person
         FROM governance_pulses WHERE id = $1`,
      [pulse_id]
    );
    const pulse = pulseRes.rows[0];
    if (!pulse) return;

    const houseRes = await query(
      `SELECT sector, name, COALESCE(primary_rm_id, manager_id) AS rm_id FROM houses WHERE id = $1 LIMIT 1`,
      [house_id]
    );
    const sector: string = houseRes.rows[0]?.sector || 'SUPPORTED_LIVING';
    const houseName: string = houseRes.rows[0]?.name || house_id;
    const rmId: string | null = houseRes.rows[0]?.rm_id || null;

    const rules = await resolveRules(company_id, sector, domain);
    if (rules.length === 0) return;

    // Pull recent signals for the house once, across the widest rule window.
    const maxWindow = Math.max(1, ...rules.map((r) => r.window_hours || 1));
    const recentRes = await query(
      `SELECT id, severity, risk_domain, created_at FROM governance_pulses
        WHERE company_id = $1 AND house_id = $2 AND created_at >= NOW() - (INTERVAL '1 hour' * $3)`,
      [company_id, house_id, maxWindow]
    );
    const recent = recentRes.rows as Array<{ severity: string; risk_domain: any; created_at: string }>;

    for (const rule of rules) {
      // The CURRENT pulse must itself match the rule's criteria.
      if (!domainMatches(pulse.risk_domain, rule.domain_name)) continue;
      if (!severityMeets(pulse.severity, rule.min_severity, rule.match_any_severity)) continue;

      // Count matching signals inside this rule's window.
      const cutoff = Date.now() - (rule.window_hours || 1) * 3600 * 1000;
      const count = recent.filter(
        (s) =>
          new Date(s.created_at).getTime() >= cutoff &&
          domainMatches(s.risk_domain, rule.domain_name) &&
          severityMeets(s.severity, rule.min_severity, rule.match_any_severity)
      ).length;
      if (count < (rule.signal_count || 1)) continue;

      await raiseImmediateEscalation({ company_id, house_id, houseName, domain, pulse, rule, rmId });
    }
  } catch (err) {
    logger.error('[immediate] runImmediateDetection failed', err);
  }
}

async function resolveEscalateTo(company_id: string, role: string, rmId: string | null): Promise<string | null> {
  if (role === 'REGISTERED_MANAGER' && rmId) return rmId;
  const wanted =
    role === 'RESPONSIBLE_INDIVIDUAL' ? ['RESPONSIBLE_INDIVIDUAL', 'RI']
    : role === 'DIRECTOR' ? ['DIRECTOR']
    : ['REGISTERED_MANAGER', 'RM'];
  const res = await query(
    `SELECT id FROM users WHERE company_id = $1 AND role = ANY($2::text[]) AND status = 'active' LIMIT 1`,
    [company_id, wanted]
  );
  if (res.rows[0]?.id) return res.rows[0].id;
  if (rmId) return rmId;
  // Last-resort fallback up the chain so escalated_to is never null.
  const fb = await query(
    `SELECT id FROM users WHERE company_id = $1 AND role IN ('DIRECTOR','ADMIN','SUPER_ADMIN') AND status = 'active' LIMIT 1`,
    [company_id]
  );
  return fb.rows[0]?.id || null;
}

async function raiseImmediateEscalation(ctx: {
  company_id: string; house_id: string; houseName: string; domain: string;
  pulse: any; rule: ImmediateRule; rmId: string | null;
}): Promise<void> {
  const { company_id, house_id, domain, pulse, rule, rmId } = ctx;

  const escalatedBy: string = pulse.created_by;
  const escalateTo = (await resolveEscalateTo(company_id, rule.escalate_to_role, rmId)) || escalatedBy;
  const dueBy = escalationDueBy(rule.sla_trigger_type);

  const subject = rule.match_any_severity ? domain : `${pulse.severity}-severity ${domain}`;
  const verb = rule.action === 'MANDATORY_REVIEW' ? 'review' : 'escalation';
  const reason = `${subject} signal — immediate ${verb} required${pulse.related_person ? ` for ${pulse.related_person}` : ''}.${rule.rationale ? ' ' + rule.rationale : ''}`;

  const id = uuidv4();
  const ins = await query(
    `INSERT INTO escalations
       (id, company_id, house_id, escalated_by, escalated_to, reason, status, lifecycle_status,
        priority, due_by, source_pulse_id, source_rule_id, trigger_type, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,'Pending','Open',$7,$8,$9,$10,$11,$12)
     ON CONFLICT (source_pulse_id, source_rule_id)
       WHERE source_pulse_id IS NOT NULL AND source_rule_id IS NOT NULL
       DO NOTHING
     RETURNING id`,
    [id, company_id, house_id, escalatedBy, escalateTo, reason, rule.priority, dueBy,
     pulse.id, rule.id, rule.sla_trigger_type,
     JSON.stringify({ engine: true, fast_path: true, action: rule.action, domain })]
  );
  if (ins.rowCount === 0) return; // already raised for this pulse+rule — idempotent.

  // Evidence trail: a threshold event tied to the pulse.
  try {
    await thresholdEventsRepo.create({
      company_id, house_id, pulse_id: pulse.id,
      rule_number: 0,
      rule_name: `Immediate: ${rule.domain_name === '*' ? domain : rule.domain_name}`,
      output_type: 'Mandatory Review',
      description: reason,
    });
  } catch (err) {
    logger.error('[immediate] threshold event failed', err);
  }

  // Notify the responsible role so it surfaces immediately.
  try {
    await notificationsService.create({
      company_id, user_id: escalateTo, type: 'escalation',
      title: rule.priority === 'Critical' || rule.priority === 'Urgent' ? 'Immediate escalation' : 'Action required',
      body: reason, link: '/escalation-log',
    });
  } catch { /* notification is best-effort */ }

  await eventBus.emitEvent(EVENTS.RISK_ESCALATED, {
    escalation_id: id, company_id, source_pulse_id: pulse.id, source_rule_id: rule.id, fast_path: true,
  });
  logger.info(`[immediate] Escalation raised (${rule.priority}): ${reason}`);
}
