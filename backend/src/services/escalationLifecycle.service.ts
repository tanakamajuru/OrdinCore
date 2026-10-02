import { query } from '../config/database';
import { normalizeEffectiveness } from '../domain/effectiveness';
import { normalizeActionStatus, normalizeEscalationLifecycle, type EscalationLifecycle } from '../domain/governanceVocabulary';

type EscalationAction = { status?: unknown; effectiveness_outcome?: unknown; effectiveness?: unknown; effectiveness_reviewed_at?: string | Date | null; completed_at?: string | Date | null; review_requirement?: unknown };

// A completion-only (review-exempt) control is satisfied by completion alone; it carries no
// effectiveness obligation and must NOT hold the escalation at "Awaiting Effectiveness" (brief 5 R2/A3).
const requiresEffectiveness = (a: EscalationAction): boolean =>
  String(a.review_requirement ?? 'EFFECTIVENESS_REQUIRED').toUpperCase() !== 'COMPLETION_ONLY';

export function deriveEscalationLifecycle(input: { current?: unknown; reviewed: boolean; actions: EscalationAction[] }): EscalationLifecycle {
  const current = normalizeEscalationLifecycle(input.current);
  if (current === 'Closed') return 'Closed';
  const active = input.actions.filter((a) => normalizeActionStatus(a.status) !== 'Cancelled');
  if (!active.length) return input.reviewed ? 'Under Review' : 'Open';
  if (active.some((a) => normalizeActionStatus(a.status) !== 'Completed')) return 'Actions In Progress';
  // Only effectiveness-bearing controls carry a review obligation. Exempt completion-only controls are
  // already satisfied — if EVERY control is exempt, the effectiveness stage is reached (not applicable).
  const reviewable = active.filter(requiresEffectiveness);
  if (!reviewable.length) return 'Ready For Closure';
  const outcomes = reviewable.map((a) => normalizeEffectiveness(a.effectiveness_outcome ?? a.effectiveness));
  if (outcomes.some((o) => o === 'Too Early To Assess')) return 'Monitoring';
  if (outcomes.some((o) => !o)) return 'Awaiting Effectiveness';
  // "Ready for closure" means every required effectiveness review is recorded AND the latest reviewable
  // outcome is Effective — a reviewed Not/Partially Effective is still a completed check, but not closable.
  const latest = [...reviewable].sort((a, b) => new Date(b.effectiveness_reviewed_at || b.completed_at || 0).getTime() - new Date(a.effectiveness_reviewed_at || a.completed_at || 0).getTime())[0];
  return normalizeEffectiveness(latest.effectiveness_outcome ?? latest.effectiveness) === 'Effective'
    ? 'Ready For Closure'
    : 'Under Review';
}

export class EscalationLifecycleService {
  async sync(escalationId: string, companyId: string) {
    const esc = (await query(`SELECT * FROM escalations WHERE id=$1 AND company_id=$2`, [escalationId, companyId])).rows[0];
    if (!esc) throw new Error('Escalation not found');
    const actions = (await query(
      `SELECT DISTINCT ra.id, ra.status, ra.effectiveness_outcome, ra.effectiveness,
              ra.effectiveness_reviewed_at, ra.completed_at, ra.review_requirement
         FROM risk_actions ra
        WHERE ra.company_id=$2 AND (ra.escalation_id=$1
          OR ($3::uuid IS NOT NULL AND ra.risk_id=$3)
          OR ($4::uuid IS NOT NULL AND ra.governance_review_id=$4)
          OR ($5::uuid IS NOT NULL AND ra.source_pulse_id=$5)
          OR ($6::uuid IS NOT NULL AND ra.source_cluster_id=$6))`,
      [escalationId, companyId, esc.risk_id || null, esc.source_governance_review_id || null, esc.source_pulse_id || null, esc.source_cluster_id || null],
    )).rows;
    const lifecycle = deriveEscalationLifecycle({ current: esc.lifecycle_status ?? esc.status, reviewed: !!esc.reviewed_at, actions });
    if (lifecycle !== normalizeEscalationLifecycle(esc.lifecycle_status ?? esc.status)) {
      await query(`UPDATE escalations SET lifecycle_status=$1::escalation_lifecycle_status, updated_at=NOW() WHERE id=$2 AND company_id=$3`, [lifecycle, escalationId, companyId]);
    }
    return { escalation_id: escalationId, lifecycle, actions };
  }

  async syncForAction(actionId: string, companyId: string) {
    const action = (await query(
      `SELECT escalation_id, risk_id, governance_review_id, source_pulse_id, source_cluster_id
         FROM risk_actions WHERE id=$1 AND company_id=$2`, [actionId, companyId],
    )).rows[0];
    if (!action) return [];
    const linked = await query(
      `SELECT DISTINCT id FROM escalations WHERE company_id=$1 AND (
         id=$2 OR ($3::uuid IS NOT NULL AND risk_id=$3)
         OR ($4::uuid IS NOT NULL AND source_governance_review_id=$4)
         OR ($5::uuid IS NOT NULL AND source_pulse_id=$5)
         OR ($6::uuid IS NOT NULL AND source_cluster_id=$6))`,
      [companyId, action.escalation_id || null, action.risk_id || null, action.governance_review_id || null, action.source_pulse_id || null, action.source_cluster_id || null],
    );
    return Promise.all(linked.rows.map((row) => this.sync(row.id, companyId)));
  }
}

export const escalationLifecycleService = new EscalationLifecycleService();
