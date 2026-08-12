import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/auth/AuthContext';
import { useApi } from '@/api/useApi';
import { Screen, Loading } from '@/components/ui';
import { SyncStatus } from '@/components/SyncStatus';
import { OutstandingBanner } from '@/components/OutstandingBanner';
import { TeamBriefBanner } from '@/components/TeamBriefBanner';
import { BoardHeader, Metrics, SectionTitle, StatusList, BoardButton, BoardItem, Tone } from '@/components/board';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.pulses || v?.actions || v?.escalations || v?.risks || []);
const domainOf = (s: any) => (Array.isArray(s.risk_domain) ? s.risk_domain[0] : s.risk_domain || s.governance_domain || s.category || 'Signal');
const isSameDay = (x?: string) => !!x && new Date(x).toDateString() === new Date().toDateString();
const isDone = (a: any) => /complete|done|cancel/i.test(a.status || '');
const isHigh = (sev?: string) => /high|critical/i.test(sev || '');
const sevTone = (sev?: string): Tone => (/(high|critical)/i.test(sev || '') ? 'red' : /(medium|moderate)/i.test(sev || '') ? 'amber' : 'green');
const dateLine = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

export function TLMorningMeetingScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  // Stat counters come from the SAME role-scoped read-model the web uses (/my-work), so they
  // tally with the web. The house-scoped signal list stays for "new today" + the overnight list.
  const mw = useApi<any>('/my-work');
  const sig = useApi<any>('/pulses?limit=100');
  const loading = sig.loading && !sig.data;

  const items: any[] = mw.data?.items ?? mw.data?.data?.items ?? [];
  const byKey = (k: string) => items.find((i: any) => i.key === k);
  const n = (v: any) => Number(v || 0);
  const signals = arr(sig.data);
  const newToday = signals.filter((s) => isSameDay(s.entry_date || s.created_at)).length;
  const house = (user as any)?.house_name || (user as any)?.assigned_house_name || 'Your service';

  const overnight: BoardItem[] = signals.slice(0, 4).map((s) => ({
    title: `${domainOf(s)}${s.related_person ? ` · ${s.related_person}` : ''}`,
    meta: s.description,
    tone: sevTone(s.severity),
    onPress: () => nav.navigate('SignalDetail', { id: s.id }),
  }));

  if (loading) return <Screen><Loading /></Screen>;
  return (
    <Screen refreshing={sig.loading} onRefresh={() => { sig.refetch(); mw.refetch(); }}>
      <BoardHeader title="Morning Meeting" subtitle={`${house} · ${dateLine()}`} />
      <TeamBriefBanner />
      <OutstandingBanner onPress={() => nav.navigate('Actions')} />
      <SyncStatus />
      <Metrics items={[
        { value: newToday, label: 'New today', tone: 'red' },
        { value: n(byKey('escalations')?.count), label: 'Escalations', tone: 'blue' },
        { value: n(byKey('actions')?.count), label: 'Actions due', tone: 'amber' },
        { value: n(byKey('signals')?.count), label: 'To review', tone: 'purple' },
      ]} />
      <BoardButton label="Raise signal" icon="plus" onPress={() => nav.navigate('RaiseSignal')} />
      <SectionTitle action="View all" onAction={() => nav.navigate('Signals')}>Overnight events</SectionTitle>
      <StatusList items={overnight} empty="Nothing logged overnight." />
    </Screen>
  );
}
