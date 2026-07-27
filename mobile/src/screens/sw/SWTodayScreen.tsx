import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/auth/AuthContext';
import { useApi } from '@/api/useApi';
import { Screen, Loading } from '@/components/ui';
import { SyncStatus } from '@/components/SyncStatus';
import { OutstandingBanner } from '@/components/OutstandingBanner';
import { BoardHeader, Metrics, SectionTitle, StatusList, BoardButton, BoardItem, Tone } from '@/components/board';

const unwrap = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.pulses || v?.actions || []);
const domainOf = (s: any) => (Array.isArray(s.risk_domain) ? s.risk_domain[0] : s.risk_domain || s.governance_domain || s.category || 'Signal');
const isDone = (a: any) => /complete|done|cancel/i.test(a.status || '');
const sevTone = (sev?: string): Tone => (/(high|critical)/i.test(sev || '') ? 'red' : /(medium|moderate)/i.test(sev || '') ? 'amber' : 'green');
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

export function SWTodayScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const uid = user?.id || user?.user_id;
  const sig = useApi<any>(uid ? `/pulses?created_by=${uid}&limit=100` : '/pulses?limit=100');
  const act = useApi<any>('/actions/my');
  const loading = sig.loading && !sig.data;

  const signals = unwrap(sig.data);
  const todo = unwrap(act.data).filter((a) => !isDone(a));

  const goRaise = () => nav.navigate('Signals', { screen: 'SWRaiseSignal' });
  const goSignal = (id: string) => nav.navigate('Signals', { screen: 'SWSignalDetail', params: { id } });

  const recent: BoardItem[] = signals.slice(0, 3).map((s) => ({
    title: `${domainOf(s)}${s.related_person ? ` · ${s.related_person}` : ''}`,
    tone: sevTone(s.severity),
    onPress: () => goSignal(s.id),
  }));

  if (loading) return <Screen><Loading /></Screen>;
  return (
    <Screen refreshing={sig.loading || act.loading} onRefresh={() => { sig.refetch(); act.refetch(); }}>
      <BoardHeader title={`${greeting()}, ${user?.first_name || 'there'}`} subtitle="Capture. Act. Make a difference." />
      <OutstandingBanner onPress={() => nav.navigate('Actions')} />
      <BoardButton label="Raise a signal" icon="plus" onPress={goRaise} />
      <SyncStatus />
      <Metrics items={[
        { value: todo.length, label: 'Actions to do', tone: 'amber' },
        { value: signals.length, label: 'My signals', tone: 'blue' },
      ]} />
      <SectionTitle action="View all" onAction={() => nav.navigate('Signals')}>Recent signals</SectionTitle>
      <StatusList items={recent} empty="No signals yet." />
    </Screen>
  );
}
