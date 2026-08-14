/**
 * api/mappers.ts
 * Shared adapters that turn live backend payloads into the reference UI's data shapes,
 * so every screen shows real, in-sync figures (the same /my-work read-model the web uses).
 */
import type { StatusRow } from '@/components/board';

// Backend tone (my-work) -> reference severity tone.
export const toneFromApi = (t?: string): StatusRow['tone'] =>
  t === 'red' ? 'high' : t === 'amber' ? 'medium' : t === 'blue' ? 'info' : t === 'emerald' ? 'success' : 'neutral';

// /my-work items -> StatusList rows (used across RM/Director/RI/TL My Work + Home attention).
export function myWorkRows(data: any): StatusRow[] {
  const items: any[] = data?.items ?? data?.data?.items ?? [];
  return items.map((it: any) => ({
    id: String(it.key),
    title: it.label,
    subtitle: it.primary_action,
    badge: it.count,
    tone: toneFromApi(it.tone),
  }));
}

// Generic array unwrap for list endpoints (risks/escalations/pulses/actions).
export const listOf = (v: any): any[] =>
  Array.isArray(v) ? v : v?.data || v?.items || v?.pulses || v?.actions || v?.escalations || v?.risks || [];
