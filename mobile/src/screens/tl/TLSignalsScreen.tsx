import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/auth/AuthContext';
import { useApi } from '@/api/useApi';
import { Screen, Row, Chip, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader, StatusList, BoardButton, BoardItem, Tone } from '@/components/board';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.pulses || []);
const domainOf = (s: any) => (Array.isArray(s.risk_domain) ? s.risk_domain[0] : s.risk_domain || s.governance_domain || s.category || 'Signal');
const d = (x?: string) => (x ? new Date(x).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '');
const isHigh = (sev?: string) => /high|critical/i.test(sev || '');
const sevTone = (sev?: string): Tone => (isHigh(sev) ? 'red' : /(medium|moderate)/i.test(sev || '') ? 'amber' : 'green');

type Filter = 'all' | 'high' | 'needs';

// Governance-state pill (design: Needs review / Reviewed / Actioned / Monitoring / Closed).
const needsReview = (s: any) => { const rs = String(s.review_status || '').toLowerCase(); return !rs || rs === 'new'; };
const statusLabel = (s: any): string => {
  const rs = String(s.review_status || '').toLowerCase();
  if (!rs || rs === 'new') return 'Needs review';
  if (rs === 'linked') return 'Actioned';
  if (rs === 'monitoring') return 'Monitoring';
  if (rs === 'closed') return 'Closed';
  return 'Reviewed';
};

export function TLSignalsScreen() {
  const nav = useNavigation<any>();
  const { data, loading, error, refetch } = useApi<any>('/pulses?limit=200');
  const [filter, setFilter] = useState<Filter>('all');

  const all = arr(data);
  const shown = all.filter((s) =>
    filter === 'high' ? isHigh(s.severity) : filter === 'needs' ? needsReview(s) : true);
  const items: BoardItem[] = shown.map((s) => ({
    title: `${domainOf(s)}${s.related_person ? ` · ${s.related_person}` : ''}`,
    meta: [s.description, d(s.entry_date || s.created_at)].filter(Boolean).join(' · '),
    value: statusLabel(s),
    tone: sevTone(s.severity),
    onPress: () => nav.navigate('SignalDetail', { id: s.id }),
  }));

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="Signals" />
      <Row gap={7}>
        <Chip label={`All (${all.length})`} active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={`Needs review (${all.filter(needsReview).length})`} active={filter === 'needs'} onPress={() => setFilter('needs')} />
        <Chip label={`High (${all.filter((s) => isHigh(s.severity)).length})`} active={filter === 'high'} onPress={() => setFilter('high')} />
      </Row>
      {loading && !data ? <Loading /> : error ? <ErrorNote message={error} onRetry={refetch} /> : (
        <StatusList items={items} button="Raise signal" onButton={() => nav.navigate('RaiseSignal')} empty="No signals to show." />
      )}
    </Screen>
  );
}
