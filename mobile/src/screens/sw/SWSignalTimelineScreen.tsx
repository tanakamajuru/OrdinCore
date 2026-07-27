import React from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useApi } from '@/api/useApi';
import { SWSignalsStackParams } from '@/navigation/types';
import { Screen, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader, Timeline, Tone } from '@/components/board';

const when = (x?: string) =>
  x ? new Date(x).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

const signalRef = (s: any): string => {
  if (s?.reference) return String(s.reference);
  const yr = new Date(s?.entry_date || s?.created_at || Date.now()).getFullYear();
  const tail = String(s?.id || '').replace(/\D/g, '').slice(-4).padStart(4, '0');
  return `SIG-${yr}-${tail}`;
};

// Derives the governance chain from the signal + context; each step lights up as the signal
// moves Raised → Reviewed → Promoted → Action → Validated (reference tones).
function buildSteps(s: any, ctx: any): { title: string; meta?: string; tone?: Tone; done?: boolean }[] {
  const status = String(s?.review_status || '').toLowerCase();
  const promoted = (ctx?.clusters?.length ?? 0) > 0 || /link|promot/.test(status);
  const reviewed = promoted || /review|link|closed|valid/.test(status);
  const validated = /valid|closed/.test(status) || !!s?.validated_at;
  const actions: any[] = ctx?.actions || s?.actions || [];
  const hasAction = actions.length > 0;
  return [
    { title: 'Signal raised', meta: `${when(s?.entry_date || s?.created_at)} · ${s?.created_by_name || 'You'}`, tone: 'blue', done: true },
    { title: 'Reviewed', meta: `${when(s?.reviewed_at)}${reviewed ? ' · Team Leader' : ' · Pending'}`.trim(), tone: 'blue', done: reviewed },
    { title: 'Promoted to risk', meta: `${when(s?.promoted_at)}${promoted ? ' · Registered Manager' : ' · Pending'}`.trim(), tone: 'amber', done: promoted },
    { title: hasAction ? 'Action in progress' : 'Action', meta: actions[0]?.title || 'Awaiting action', tone: 'green', done: hasAction },
    { title: 'Validated', meta: `${when(s?.validated_at)}${validated ? ' · Director' : ' · Pending'}`.trim(), tone: 'green', done: validated },
  ];
}

export function SWSignalTimelineScreen() {
  const { id } = useRoute<RouteProp<SWSignalsStackParams, 'SWSignalTimeline'>>().params;
  const sig = useApi<any>(`/pulses/${id}`);
  const ctx = useApi<any>(`/pulses/${id}/context`);

  if (sig.loading && !sig.data) return <Screen><Loading /></Screen>;
  if (sig.error) return <Screen><ErrorNote message={sig.error} onRetry={sig.refetch} /></Screen>;

  return (
    <Screen refreshing={sig.loading} onRefresh={() => { sig.refetch(); ctx.refetch(); }}>
      <BoardHeader title="Signal Timeline" subtitle={signalRef(sig.data)} />
      <Timeline steps={buildSteps(sig.data, ctx.data)} />
    </Screen>
  );
}
