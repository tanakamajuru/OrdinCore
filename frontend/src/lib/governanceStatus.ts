export const CLOSED_ESCALATION_STATES = new Set(['closed', 'resolved', 'cancelled', 'canceled']);

export function escalationState(record: { lifecycle_status?: unknown; status?: unknown } | null | undefined) {
  return String(record?.lifecycle_status ?? record?.status ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');
}

export function isOpenEscalation(record: { lifecycle_status?: unknown; status?: unknown } | null | undefined) {
  const state = escalationState(record);
  return !!state && !CLOSED_ESCALATION_STATES.has(state);
}

export function isClosedEscalation(record: { lifecycle_status?: unknown; status?: unknown } | null | undefined) {
  return CLOSED_ESCALATION_STATES.has(escalationState(record));
}

export const CLOSED_RISK_STATES = new Set(['closed', 'resolved']);

export function isOpenRisk(record: { status?: unknown } | null | undefined) {
  const state = String(record?.status ?? '').trim().toLowerCase();
  return !!state && !CLOSED_RISK_STATES.has(state);
}
