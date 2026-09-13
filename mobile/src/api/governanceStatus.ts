const CLOSED = new Set(['closed', 'resolved', 'cancelled', 'canceled']);

export function escalationState(record: { lifecycle_status?: unknown; status?: unknown } | null | undefined) {
  return String(record?.lifecycle_status ?? record?.status ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');
}

export function isOpenEscalation(record: { lifecycle_status?: unknown; status?: unknown } | null | undefined) {
  const state = escalationState(record);
  return !!state && !CLOSED.has(state);
}

export function isClosedEscalation(record: { lifecycle_status?: unknown; status?: unknown } | null | undefined) {
  return CLOSED.has(escalationState(record));
}
