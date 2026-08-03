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
  const sig = useApi<any>('/pulses?limit=100');
  const esc = useApi<any>('/escalations?limit=100');
  const act = useApi<any>('/actions/my');
  const risk = useApi<any>('/risks?limit=100');
  const loading = sig.loading && !sig.data;

  const signals = arr(sig.data);
  const newToday = signals.filter((s) => isSameDay(s.entry_date || s.created_at)).length;
  const openEsc = arr(esc.data).filter((e) => (e.lifecycle_status || '') !== 'Closed').length;
  const actionsDue = arr(act.data).filter((a) => !isDone(a)).length;
  const highRisks = arr(risk.data).filter((r) => (r.status || '').toLowerCase() !== 'closed' && isHigh(r.severity || r.risk_rating)).length;
  const house = (user as any)?.house_name || (user as any)?.assigned_house_name || 'Your service';

  const overnight: BoardItem[] = signals.slice(0, 4).map((s) => ({
    title: `${domainOf(s)}${s.related_person ? ` · ${s.related_person}` : ''}`,
    meta: s.description,
    tone: sevTone(s.severity),
    onPress: () => nav.navigate('SignalDetail', { id: s.id }),
  }));

  if (loading) return <Screen><Loading /></Screen>;
  return (
    <Screen refreshing={sig.loading} onRefresh={() => { sig.refetch(); esc.refetch(); act.refetch(); risk.refetch(); }}>
      <BoardHeader title="Morning Meeting" subtitle={`${house} · ${dateLine()}`} />
      <TeamBriefBanner />
      <OutstandingBanner onPress={() => nav.navigate('Actions')} />
      <SyncStatus />
      <Metrics items={[
        { value: newToday, label: 'New signals', tone: 'red' },
        { value: openEsc, label: 'Escalations', tone: 'blue' },
        { value: actionsDue, label: 'Actions due', tone: 'amber' },
        { value: highRisks, label: 'High risk', tone: 'purple' },
      ]} />
      <BoardButton label="Raise signal" icon="plus" onPress={() => nav.navigate('RaiseSignal')} />
      <SectionTitle action="View all" onAction={() => nav.navigate('Signals')}>Overnight events</SectionTitle>
      <StatusList items={overnight} empty="Nothing logged overnight." />
    </Screen>
  );
}
