import React from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useApi } from '@/api/useApi';
import { RootStackParams } from '@/navigation/types';
import { Screen, Label, Text, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader, Metrics, SectionTitle, StatusList, BoardItem, Tone } from '@/components/board';
import { isOpenEscalation as isOpen } from '@/api/governanceStatus';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.pulses || v?.actions || v?.escalations || v?.risks || []);
const isDone = (a: any) => /complete|done|cancel/i.test(a?.status || '');
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
  const refetch = () => { sig.refetch(); act.refetch(); esc.refetch(); risk.refetch(); };

  const signals = arr(sig.data);
  const actions = arr(act.data);
  const escs = arr(esc.data);
  const risks = arr(risk.data);

  // Truthful data states: a metric reads "—" when its own dataset is still loading or failed — never
  // a misleading 0. A dataset that returned its full page cap may be incomplete, flagged below.
  const ok = (q: any) => !!q.data && !q.error;
  const cnt = (q: any, nn: number): React.ReactNode => ok(q) ? nn : '—';
  const anyErr = sig.error || act.error || esc.error || risk.error;
  const capped = (ok(sig) && signals.length >= 300) || (ok(esc) && escs.length >= 200) || (ok(risk) && risks.length >= 200);
  const allPending = (sig.loading && !sig.data) && (act.loading && !act.data) && (esc.loading && !esc.data) && (risk.loading && !risk.data);

  if (allPending) return <Screen><Loading /></Screen>;

  let metrics: { value: React.ReactNode; label: string; tone?: Tone }[] = [];
  let sectionTitle = 'Breakdown';
  let items: BoardItem[] = [];

  if (type === 'signals-domain') {
    metrics = [
      { value: cnt(sig, signals.length), label: 'Total signals' },
      { value: cnt(sig, signals.filter((s) => within(s.created_at || s.entry_date, 7)).length), label: 'Last 7 days', tone: 'blue' },
    ];
    sectionTitle = 'Signals by domain';
    items = countBy(signals.flatMap((s) => domainsOf(s).length ? domainsOf(s).map((d) => ({ d })) : [{ d: 'Uncategorised' }]), (r) => r.d);
  } else if (type === 'actions-status') {
    metrics = [
      { value: cnt(act, actions.length), label: 'Total actions' },
      { value: cnt(act, actions.filter((a) => !isDone(a)).length), label: 'Open', tone: 'amber' },
    ];
    sectionTitle = 'Actions by status';
    items = countBy(actions, (a) => a.status || 'Pending');
  } else if (type === 'escalations') {
    const open = escs.filter(isOpen);
    metrics = [
      { value: cnt(esc, escs.length), label: 'Total' },
      { value: cnt(esc, open.length), label: 'Open', tone: 'amber' },
      { value: cnt(esc, escs.filter((e) => e.overdue).length), label: 'Overdue', tone: 'red' },
      { value: cnt(esc, escs.length - open.length), label: 'Closed', tone: 'green' },
    ];
    sectionTitle = 'Open escalations';
    items = open.map((e) => ({ title: e.risk_title || e.reason || 'Escalation', meta: e.house_name || '', tone: (e.overdue ? 'red' : 'amber') as Tone }));
  } else if (type === 'daily') {
    metrics = [
      { value: cnt(sig, signals.filter((s) => within(s.created_at || s.entry_date, 1)).length), label: 'Signals (last 24h)', tone: 'blue' },
      { value: cnt(act, actions.filter((a) => !isDone(a)).length), label: 'Open actions', tone: 'amber' },
      { value: cnt(esc, escs.filter(isOpen).length), label: 'Open escalations', tone: 'red' },
      { value: cnt(risk, risks.filter((r) => (r.status || '').toLowerCase() !== 'closed').length), label: 'Open risks' },
    ];
    sectionTitle = 'Latest signals';
    items = signals.slice(0, 8).map((s) => ({ title: s.description || 'Signal', meta: `${s.house_name || ''}${s.severity ? ` · ${s.severity}` : ''}`, tone: /crit|high/i.test(s.severity || '') ? 'red' : 'neutral' }));
  } else {
    // weekly / monthly governance report
    const days = type === 'monthly' ? 30 : 7;
    metrics = [
      { value: cnt(sig, signals.filter((s) => within(s.created_at || s.entry_date, days)).length), label: `Signals (${days}d)`, tone: 'blue' },
      { value: cnt(act, actions.filter((a) => isDone(a) && within(a.completed_at, days)).length), label: 'Actions completed', tone: 'green' },
      { value: cnt(esc, escs.filter((e) => within(e.created_at, days)).length), label: 'New escalations', tone: 'amber' },
      { value: cnt(risk, risks.filter((r) => within(r.closed_at || r.resolved_at, days)).length), label: 'Risks closed', tone: 'green' },
    ];
    sectionTitle = 'Signals by domain';
    items = countBy(signals.filter((s) => within(s.created_at || s.entry_date, days)).flatMap((s) => domainsOf(s).length ? domainsOf(s).map((d) => ({ d })) : [{ d: 'Uncategorised' }]), (r) => r.d);
  }

  return (
    <Screen refreshing={sig.loading} onRefresh={refetch}>
      <BoardHeader title={title} subtitle="Live summary" menu={false} />
      {anyErr && <ErrorNote message="Some data could not be loaded — any figure showing “—” is unavailable, not zero." onRetry={refetch} />}
      <Metrics items={metrics} />
      <SectionTitle>{sectionTitle}</SectionTitle>
      <StatusList items={items} empty="Nothing to report for this period." />
      {capped && <Text size={11} muted>Showing the most recent records only — totals may be incomplete. Use the OrdinCore web app for the full report.</Text>}
      <Label>Full report</Label>
      <Text size={12} muted>The formatted, exportable report (PDF, board pack) is generated on the OrdinCore web app. This is the live on-device summary.</Text>
    </Screen>
  );
}
