import React from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useApi } from '@/api/useApi';
import { RootStackParams } from '@/navigation/types';
import { Screen, Label, Text, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader, Metrics, SectionTitle, StatusList, BoardItem, Tone } from '@/components/board';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.pulses || v?.actions || v?.escalations || v?.risks || []);
const isDone = (a: any) => /complete|done|cancel/i.test(a?.status || '');
const isOpen = (e: any) => (e?.status || e?.lifecycle_status || '').toLowerCase() !== 'closed';
const domainsOf = (x: any): string[] => {
  const d = x?.risk_domain ?? x?.domain;
  if (Array.isArray(d)) return d.filter(Boolean);
  if (typeof d === 'string') return d.replace(/[{}]/g, '').split(',').map((s) => s.trim()).filter(Boolean);
  return [];
};
const within = (x?: string, days = 1) => !!x && (Date.now() - new Date(x).getTime()) <= days * 86400000;
const countBy = (rows: any[], key: (r: any) => string): { title: string; value: string; tone?: Tone }[] => {
  const m: Record<string, number> = {};
  rows.forEach((r) => { const k = key(r) || '—'; m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([title, n]) => ({ title, value: String(n) }));
};

/* A report that actually opens on mobile — computes a live summary from the same data the web
   report uses, rather than pointing the user back to the desktop. */
export function ReportDetailScreen() {
  const route = useRoute<RouteProp<RootStackParams, 'ReportDetail'>>();
  const { type, title } = route.params;

  // Pull the datasets a report might need (each is cheap and cached by the hook).
  const sig = useApi<any>('/pulses?limit=300');
  const act = useApi<any>('/actions/oversight');
  const esc = useApi<any>('/escalations?limit=200');
  const risk = useApi<any>('/risks?limit=200');
  const loading = sig.loading && !sig.data && act.loading && esc.loading;
  const refetch = () => { sig.refetch(); act.refetch(); esc.refetch(); risk.refetch(); };

  const signals = arr(sig.data);
  const actions = arr(act.data);
  const escs = arr(esc.data);
  const risks = arr(risk.data);

  if (loading) return <Screen><Loading /></Screen>;

  let metrics: { value: React.ReactNode; label: string; tone?: Tone }[] = [];
  let sectionTitle = 'Breakdown';
  let items: BoardItem[] = [];

  if (type === 'signals-domain') {
    metrics = [
      { value: signals.length, label: 'Total signals' },
      { value: signals.filter((s) => within(s.created_at || s.entry_date, 7)).length, label: 'This week', tone: 'blue' },
    ];
    sectionTitle = 'Signals by domain';
    items = countBy(signals.flatMap((s) => domainsOf(s).length ? domainsOf(s).map((d) => ({ d })) : [{ d: 'Uncategorised' }]), (r) => r.d);
  } else if (type === 'actions-status') {
    metrics = [
      { value: actions.length, label: 'Total actions' },
      { value: actions.filter((a) => !isDone(a)).length, label: 'Open', tone: 'amber' },
    ];
    sectionTitle = 'Actions by status';
    items = countBy(actions, (a) => a.status || 'Pending');
  } else if (type === 'escalations') {
    const open = escs.filter(isOpen);
    metrics = [
      { value: escs.length, label: 'Total' },
      { value: open.length, label: 'Open', tone: 'amber' },
      { value: escs.filter((e) => e.overdue).length, label: 'Overdue', tone: 'red' },
      { value: escs.length - open.length, label: 'Closed', tone: 'green' },
    ];
    sectionTitle = 'Open escalations';
    items = open.map((e) => ({ title: e.risk_title || e.reason || 'Escalation', meta: e.house_name || '', tone: (e.overdue ? 'red' : 'amber') as Tone }));
  } else if (type === 'daily') {
    metrics = [
      { value: signals.filter((s) => within(s.created_at || s.entry_date, 1)).length, label: 'Signals today', tone: 'blue' },
      { value: actions.filter((a) => !isDone(a)).length, label: 'Open actions', tone: 'amber' },
      { value: escs.filter(isOpen).length, label: 'Open escalations', tone: 'red' },
      { value: risks.filter((r) => (r.status || '').toLowerCase() !== 'closed').length, label: 'Open risks' },
    ];
    sectionTitle = 'Latest signals';
    items = signals.slice(0, 8).map((s) => ({ title: s.description || 'Signal', meta: `${s.house_name || ''}${s.severity ? ` · ${s.severity}` : ''}`, tone: /crit|high/i.test(s.severity || '') ? 'red' : 'neutral' }));
  } else {
    // weekly / monthly governance report
    const days = type === 'monthly' ? 30 : 7;
    metrics = [
      { value: signals.filter((s) => within(s.created_at || s.entry_date, days)).length, label: `Signals (${days}d)`, tone: 'blue' },
      { value: actions.filter((a) => isDone(a) && within(a.completed_at, days)).length, label: 'Actions completed', tone: 'green' },
      { value: escs.filter((e) => within(e.created_at, days)).length, label: 'New escalations', tone: 'amber' },
      { value: risks.filter((r) => within(r.closed_at || r.resolved_at, days)).length, label: 'Risks closed', tone: 'green' },
    ];
    sectionTitle = 'Signals by domain';
    items = countBy(signals.filter((s) => within(s.created_at || s.entry_date, days)).flatMap((s) => domainsOf(s).length ? domainsOf(s).map((d) => ({ d })) : [{ d: 'Uncategorised' }]), (r) => r.d);
  }

  return (
    <Screen refreshing={sig.loading} onRefresh={refetch}>
      <BoardHeader title={title} subtitle="Live summary" menu={false} />
      {(sig.error || act.error) ? <ErrorNote message={sig.error || act.error || 'Error'} onRetry={refetch} /> : (
        <>
          <Metrics items={metrics} />
          <SectionTitle>{sectionTitle}</SectionTitle>
          <StatusList items={items} empty="Nothing to report for this period." />
          <Label>Full report</Label>
          <Text size={12} muted>The formatted, exportable report (PDF, board pack) is generated on the OrdinCore web app. This is the live on-device summary.</Text>
        </>
      )}
    </Screen>
  );
}
