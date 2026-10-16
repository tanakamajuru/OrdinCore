import React, { useState } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useApi } from '@/api/useApi';
import { RootStackParams } from '@/navigation/types';
import { Screen, Label, Text, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader, Metrics, SectionTitle, StatusList, BoardItem, Tone } from '@/components/board';
import { isOpenEscalation as isOpen } from '@/api/governanceStatus';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.pulses || v?.escalations || []);

/* The live on-device summary. Headline totals and breakdowns come from the authoritative
   server-side aggregate (/reports/summary), computed over the FULL permitted dataset — never a
   capped download. Paginated lists (latest signals, open escalations) are drill-down evidence
   only and never define a headline total. Each section shows its own truthful state: a "—" or an
   "unavailable" message means not-loaded, never a misleading zero. */
export function ReportDetailScreen() {
  const route = useRoute<RouteProp<RootStackParams, 'ReportDetail'>>();
  const { type, title } = route.params;

  // Authoritative headline metrics + breakdowns (one source → headline and its breakdown share state).
  const sum = useApi<any>('/reports/summary');
  const body: any = (sum.data as any)?.data ?? sum.data;
  const M = body?.metrics || {};
  const B = body?.breakdowns || {};
  const sumOk = !!body && !sum.error;
  const mv = (v: number | undefined | null): React.ReactNode => (sumOk && v != null ? v : '—');
  // Truthful data status (Report Accuracy correction, 11-13 Oct 2026): only call a report Complete
  // when every source succeeded; a degraded source produces Partial with the affected areas named
  // and the last time the whole summary DID load successfully, not silently as Complete.
  const dataStatus: string | null = body?.data_status ?? body?.metadata?.data_status ?? null;
  const degradedSources: string[] = body?.metadata?.degraded_sources || [];
  const lastSuccessfulUpdate: string | null = body?.metadata?.last_successful_update || null;

  // Drill-down evidence lists — their own independent state. These never define a headline total
  // (that's the authoritative aggregate above); an increasing limit is their pagination so older
  // unresolved records stay reachable rather than silently capped (Report accuracy correction,
  // 11 Oct 2026 / Implementation Review, 13 Oct 2026).
  const PAGE = 50;
  const [sigLimit, setSigLimit] = useState(PAGE);
  const [escLimit, setEscLimit] = useState(100);
  const sig = useApi<any>(`/pulses?limit=${sigLimit}`, [sigLimit]);
  const esc = useApi<any>(`/escalations?limit=${escLimit}`, [escLimit]);
  const signals = arr(sig.data);
  const escs = arr(esc.data);
  const sigOk = !!sig.data && !sig.error;
  const escOk = !!esc.data && !esc.error;
  const sigMayHaveMore = sigOk && signals.length >= sigLimit;
  const escMayHaveMore = escOk && escs.length >= escLimit;

  const refetch = () => { sum.refetch(); sig.refetch(); esc.refetch(); };

  if (sum.loading && !sum.data) return <Screen><Loading /></Screen>;

  const bd = (rows: any[] | undefined): BoardItem[] => (rows || []).map((r) => ({ title: r.label, value: String(r.count) }));
  const days = type === 'monthly' ? 30 : 7;

  let metrics: { value: React.ReactNode; label: string; tone?: Tone }[] = [];
  let sectionTitle = 'Breakdown';
  let items: BoardItem[] = [];
  // Which source backs the list section, so its empty/unavailable/loading state is truthful.
  let listSource: 'summary' | 'signals' | 'escalations' = 'summary';

  if (type === 'signals-domain') {
    metrics = [
      { value: mv(M.signals_total), label: 'Total signals' },
      { value: mv(M.signals_7d), label: 'Last 7 days', tone: 'blue' },
    ];
    sectionTitle = 'Signals by theme';
    items = bd(B.signals_by_domain);
  } else if (type === 'actions-status') {
    metrics = [
      { value: mv(M.actions_total), label: 'Total actions' },
      { value: mv(M.actions_open), label: 'Open', tone: 'amber' },
      { value: mv(M.actions_overdue), label: 'Overdue', tone: 'red' },
      { value: mv(M.actions_completed_7d), label: 'Completed (7d)', tone: 'green' },
    ];
    sectionTitle = 'Actions by status';
    items = bd(B.actions_by_status);
  } else if (type === 'escalations') {
    metrics = [
      { value: mv(M.escalations_total), label: 'Total' },
      { value: mv(M.escalations_open), label: 'Open', tone: 'amber' },
      { value: mv(M.escalations_overdue), label: 'Overdue', tone: 'red' },
      { value: mv(M.escalations_closed), label: 'Closed', tone: 'green' },
    ];
    sectionTitle = 'Open escalations';
    listSource = 'escalations';
    items = escOk ? escs.filter(isOpen).map((e) => ({ title: e.risk_title || e.reason || 'Escalation', meta: e.house_name || '', tone: (e.overdue ? 'red' : 'amber') as Tone })) : [];
  } else if (type === 'daily') {
    metrics = [
      { value: mv(M.signals_24h), label: 'Signals (last 24h)', tone: 'blue' },
      { value: mv(M.actions_open), label: 'Open actions', tone: 'amber' },
      { value: mv(M.escalations_open), label: 'Open escalations', tone: 'red' },
      { value: mv(M.risks_open), label: 'Open risks' },
    ];
    sectionTitle = 'Latest signals';
    listSource = 'signals';
    items = sigOk ? signals.slice(0, 8).map((s) => ({ title: s.description || 'Signal', meta: `${s.house_name || ''}${s.severity ? ` · ${s.severity}` : ''}`, tone: (/crit|high/i.test(s.severity || '') ? 'red' : 'neutral') as Tone })) : [];
  } else {
    // weekly / monthly governance summary (rolling window)
    metrics = [
      { value: mv(days === 30 ? M.signals_30d : M.signals_7d), label: `Signals (${days}d)`, tone: 'blue' },
      { value: mv(days === 30 ? M.actions_completed_30d : M.actions_completed_7d), label: 'Actions completed', tone: 'green' },
      { value: mv(days === 30 ? M.escalations_new_30d : M.escalations_new_7d), label: 'New escalations', tone: 'amber' },
      { value: mv(days === 30 ? M.risks_closed_30d : M.risks_closed_7d), label: 'Risks closed', tone: 'green' },
    ];
    sectionTitle = 'Signals by theme';
    items = bd(days === 30 ? B.signals_by_domain_30d : B.signals_by_domain_7d);
  }

  // Truthful per-section state for the list/breakdown below the headline.
  const srcLoading = listSource === 'summary' ? (sum.loading && !sum.data) : listSource === 'signals' ? (sig.loading && !sig.data) : (esc.loading && !esc.data);
  const srcError = listSource === 'summary' ? !!sum.error : listSource === 'signals' ? !!sig.error : !!esc.error;
  const srcOk = listSource === 'summary' ? sumOk : listSource === 'signals' ? sigOk : escOk;

  return (
    <Screen refreshing={sum.loading} onRefresh={refetch}>
      <BoardHeader title={title} subtitle="Live summary · full dataset" menu={false} />
      {sum.error && <ErrorNote message="Headline figures are unavailable right now — values show “—”, not zero." onRetry={refetch} />}
      {!sum.error && dataStatus === 'PARTIAL' && (
        <ErrorNote
          message={`Partial data — ${degradedSources.length ? degradedSources.join(', ') : 'some sources'} could not be read. ${lastSuccessfulUpdate ? `Last fully successful update: ${new Date(lastSuccessfulUpdate).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.` : ''} Figures below may be incomplete — do not treat this as a complete report.`}
          onRetry={refetch}
        />
      )}
      <Metrics items={metrics} />
      <SectionTitle>{sectionTitle}</SectionTitle>
      {srcLoading ? (
        <Loading />
      ) : srcError ? (
        <ErrorNote message={`${sectionTitle} is unavailable — tap to retry.`} onRetry={refetch} />
      ) : (
        <StatusList items={items} empty={srcOk ? 'No matching records for this period.' : ''}
          button={listSource === 'signals' && sigMayHaveMore ? 'Load more signals' : listSource === 'escalations' && escMayHaveMore ? 'Load more escalations' : undefined}
          onButton={listSource === 'signals' ? () => setSigLimit((n) => n + PAGE) : listSource === 'escalations' ? () => setEscLimit((n) => n + PAGE) : undefined}
        />
      )}
      <Label>Full report</Label>
      <Text size={12} muted>The formatted, exportable report (PDF, board pack) is generated on the OrdinCore web app. This is the live on-device summary over your full authorised data.</Text>
    </Screen>
  );
}
