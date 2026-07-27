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

type Filter = 'all' | 'high' | 'mine';

export function TLSignalsScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const uid = user?.id || user?.user_id;
  const { data, loading, error, refetch } = useApi<any>('/pulses?limit=200');
  const [filter, setFilter] = useState<Filter>('all');

  const all = arr(data);
  const shown = all.filter((s) =>
    filter === 'high' ? isHigh(s.severity) : filter === 'mine' ? (s.created_by === uid || s.created_by_id === uid) : true);
  const items: BoardItem[] = shown.map((s) => ({
    title: `${domainOf(s)}${s.related_person ? ` · ${s.related_person}` : ''}`,
    meta: [s.description, d(s.entry_date || s.created_at)].filter(Boolean).join(' · '),
    tone: sevTone(s.severity),
    onPress: () => nav.navigate('SignalDetail', { id: s.id }),
  }));

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="Signals" />
      <Row gap={7}>
        <Chip label={`All (${all.length})`} active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={`High (${all.filter((s) => isHigh(s.severity)).length})`} active={filter === 'high'} onPress={() => setFilter('high')} />
        <Chip label="My house" active={filter === 'mine'} onPress={() => setFilter('mine')} />
      </Row>
      {loading && !data ? <Loading /> : error ? <ErrorNote message={error} onRetry={refetch} /> : (
        <StatusList items={items} button="Raise signal" onButton={() => nav.navigate('RaiseSignal')} empty="No signals to show." />
      )}
    </Screen>
  );
}
