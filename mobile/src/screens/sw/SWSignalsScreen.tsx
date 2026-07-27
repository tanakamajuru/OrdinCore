import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/auth/AuthContext';
import { useApi } from '@/api/useApi';
import { Screen, Loading, ErrorNote } from '@/components/ui';
import { BoardHeader, StatusList, BoardButton, BoardItem, Tone } from '@/components/board';

const unwrap = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.pulses || []);
const domainOf = (s: any) => (Array.isArray(s.risk_domain) ? s.risk_domain[0] : s.risk_domain || s.governance_domain || s.category || 'Signal');
const d = (x?: string) => (x ? new Date(x).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '');
const sevTone = (sev?: string): Tone => (/(high|critical)/i.test(sev || '') ? 'red' : /(medium|moderate)/i.test(sev || '') ? 'amber' : 'green');

export function SWSignalsScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const uid = user?.id || user?.user_id;
  const { data, loading, error, refetch } = useApi<any>(uid ? `/pulses?created_by=${uid}&limit=100` : '/pulses?limit=100');
  const signals = unwrap(data);

  const items: BoardItem[] = signals.map((s) => ({
    title: `${domainOf(s)}${s.related_person ? ` · ${s.related_person}` : ''}`,
    meta: [s.description, d(s.entry_date || s.created_at)].filter(Boolean).join(' · '),
    tone: sevTone(s.severity),
    onPress: () => nav.navigate('SWSignalDetail', { id: s.id }),
  }));

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="Signals" />
      <BoardButton label="Raise signal" icon="plus" onPress={() => nav.navigate('SWRaiseSignal')} />
      {loading && !data ? <Loading /> : error ? <ErrorNote message={error} onRetry={refetch} /> : (
        <StatusList items={items} empty="No signals yet — raise your first." />
      )}
    </Screen>
  );
}
