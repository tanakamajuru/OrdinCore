import { EffectivenessOutcome, isFinalEffectiveness, normalizeEffectiveness } from './effectiveness';

export const ESCALATION_LIFECYCLES = [
  'Open',
  'Under Review',
  'Actions In Progress',
  'Awaiting Effectiveness',
  'Monitoring',
  'Ready For Closure',
  'Closed',
  'Reopened',
] as const;

export type EscalationLifecycle = typeof ESCALATION_LIFECYCLES[number];

export const ACTION_STATUSES = ['Open', 'In Progress', 'Completed', 'Cancelled'] as const;
export type CanonicalActionStatus = typeof ACTION_STATUSES[number];

/**
 * Read compatibility only. Callers must persist the returned canonical value.
 * This is the sole place where historic escalation labels are interpreted.
 */
export function normalizeEscalationLifecycle(value: unknown): EscalationLifecycle | null {
  const status = String(value ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (!status) return null;
  if (status === 'open' || status === 'pending') return 'Open';
  if (status === 'under review' || status === 'acknowledged') return 'Under Review';
  if (status === 'actions implemented' || status === 'actions in progress' || status === 'in progress') return 'Actions In Progress';
  if (status === 'awaiting effectiveness' || status === 'effectiveness required') return 'Awaiting Effectiveness';
  if (status === 'monitoring' || status === 'monitoring effectiveness') return 'Monitoring';
  if (status === 'ready for closure') return 'Ready For Closure';
  if (status === 'closed' || status === 'resolved' || status === 'complete' || status === 'completed') return 'Closed';
  if (status === 'reopened') return 'Reopened';
  return null;
}

export function isOpenEscalation(value: unknown): boolean {
  const lifecycle = normalizeEscalationLifecycle(value);
  return lifecycle !== null && lifecycle !== 'Closed';
}

export function normalizeActionStatus(value: unknown): CanonicalActionStatus | null {
  const status = String(value ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (!status) return null;
  if (status === 'open' || status === 'pending' || status === 'not started') return 'Open';
  if (status === 'in progress' || status === 'started') return 'In Progress';
  if (status === 'complete' || status === 'completed' || status === 'done') return 'Completed';
  if (status === 'cancelled' || status === 'canceled') return 'Cancelled';
  return null;
}

export type EffectivenessReviewState = 'NOT_REVIEWED' | 'INTERIM' | 'FINAL';

export function effectivenessReviewState(value: unknown): EffectivenessReviewState {
  const outcome = normalizeEffectiveness(value);
  if (!outcome) return 'NOT_REVIEWED';
  return isFinalEffectiveness(outcome) ? 'FINAL' : 'INTERIM';
}

export function canonicalEffectiveness(value: unknown): EffectivenessOutcome | null {
  return normalizeEffectiveness(value);
}
