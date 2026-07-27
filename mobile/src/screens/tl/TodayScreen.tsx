import React from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { Screen, Text, Row, Button, Pill, SeverityPill, Loading, Empty } from '@/components/ui';
import { SyncStatus } from '@/components/SyncStatus';
import { StatCard, Section, Donut, THEME_COLORS } from '@/components/dashboard';

const unwrap = (v: any) => (Array.isArray(v) ? v : v?.data || v?.actions || v?.escalations || []);
const themeOf = (s: any) => (Array.isArray(s.risk_domain) ? s.risk_domain[0] : s.risk_domain || s.signal_type || 'Other');
const d = (x?: string) => (x ? new Date(x).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '');

export function TodayScreen() {
  const { c } = useTheme();
  const { user } = useAuth();
  const nav = useNavigation<any>();
  const uid = user?.id || user?.user_id;

  const sig = useApi<any>(uid ? `/pulses?created_by=${uid}&limit=100` : '/pulses?limit=100');
  const act = useApi<any>('/actions/my');
  const esc = useApi<any>('/escalations?limit=100');
  const loading = sig.loading && !sig.data;
  const refetch = () => { sig.refetch(); act.refetch(); esc.refetch(); };

  const signals = unwrap(sig.data);
  const actions = unwrap(act.data);
  const escalations = unwrap(esc.data);

  const now = Date.now(), week = 7 * 86400000;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const t = (s: any) => new Date(s.entry_date || s.created_at).getTime();
  const thisWeek = signals.filter((s: any) => t(s) >= now - week).length;
  const prevWeek = signals.filter((s: any) => t(s) >= now - 2 * week && t(s) < now - week).length;
  const wDelta = thisWeek - prevWeek;
  const myActions = actions.filter((a: any) => !['Complete', 'Completed', 'Cancelled'].includes(a.status));
  const dueSoon = myActions.filter((a: any) => a.due_date && new Date(a.due_date).getTime() <= now + week);
  const myEsc = escalations.filter((e: any) => (e.lifecycle_status || '') !== 'Closed');
  const closedMonth = escalations.filter((e: any) => (e.lifecycle_status || '') === 'Closed' && (e.closed_at || e.resolved_at) && new Date(e.closed_at || e.resolved_at).getTime() >= monthStart).length;

  const themeCount: Record<string, number> = {};
  signals.forEach((s: any) => { const k = themeOf(s); if (k) themeCount[k] = (themeCount[k] || 0) + 1; });
  const themeData = Object.entries(themeCount).map(([name, value], i) => ({ name, value: value as number, color: THEME_COLORS[i % THEME_COLORS.length] }));
  const total = signals.length;

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen refreshing={sig.loading} onRefresh={refetch}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text size={22} weight="600">Team Leader Dashboard</Text>
          <Text muted size={12.5}>Your signals, actions and team activity</Text>
        </View>
        <Pressable onPress={() => nav.navigate('Alerts')} hitSlop={8} style={{ padding: 8 }}><Feather name="bell" size={18} color={c.muted} /></Pressable>
      </Row>

      <Button title="Record Signal" icon="plus" onPress={() => nav.navigate('RaiseSignal')} />
      <SyncStatus />

      {/* Stat cards */}
      <Row gap={8}>
        <StatCard icon="activity" tint="#2F6CB5" label="Signals This Week" value={thisWeek}
          delta={wDelta !== 0 ? `${wDelta > 0 ? '↑' : '↓'} ${Math.abs(wDelta)} vs last week` : 'No change vs last week'}
          deltaColor={wDelta > 0 ? c.sevLow : wDelta < 0 ? c.sevCrit : c.muted} />
        <StatCard icon="clipboard" tint={c.sevLow} label="My Actions" value={myActions.length}
          delta={`${dueSoon.length} due this week`} deltaColor={c.sevMod} viewLabel="View" onView={() => nav.navigate('Actions')} />
      </Row>
      <Row gap={8}>
        <StatCard icon="clock" tint={c.sevMod} label="Actions Due Soon" value={dueSoon.length} delta="Next 7 days" viewLabel="View" onView={() => nav.navigate('Actions')} />
        <StatCard icon="trending-up" tint={c.sevHigh} label="Escalations" value={myEsc.length} delta="Require follow up" deltaColor={myEsc.length ? c.sevCrit : c.muted} />
      </Row>
      <StatCard icon="check-circle" tint={c.sevLow} label="Closed This Month" value={closedMonth} delta="Escalations resolved" />

      {/* Signals by theme */}
      <Section title="Signals by Theme" note="(this month)">
        <Row gap={16} style={{ alignItems: 'center' }}>
          <Donut data={themeData} total={total} centerLabel="Signals" />
          <View style={{ flex: 1, gap: 6 }}>
            {themeData.slice(0, 6).map((x) => (
              <Row key={x.name} gap={7}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: x.color }} />
                <Text muted size={12} style={{ flex: 1 }}>{x.name}</Text>
                <Text size={12} weight="600">{x.value} <Text muted size={11}>({total ? Math.round((x.value / total) * 100) : 0}%)</Text></Text>
              </Row>
            ))}
            {themeData.length === 0 && <Text muted size={12}>No signals yet</Text>}
          </View>
        </Row>
      </Section>

      {/* Recent signals */}
      <Section title="Recent Signals">
        {signals.slice(0, 5).map((s: any) => (
          <Pressable key={s.id} onPress={() => nav.navigate('SignalDetail', { id: s.id })}
            style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.lineSoft }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text size={13} weight="600" style={{ flex: 1 }}>{themeOf(s)}{s.related_person ? ` · ${s.related_person}` : ''}</Text>
              <SeverityPill severity={s.severity} />
            </Row>
            <Row style={{ justifyContent: 'space-between', marginTop: 3 }}>
              <Text muted size={11} style={{ flex: 1 }} >{s.description}</Text>
              <Text faint size={10.5}>{d(s.entry_date || s.created_at)}</Text>
            </Row>
          </Pressable>
        ))}
        {signals.length === 0 && <Empty icon="activity" title="No signals yet — record your first." />}
      </Section>

      {/* My actions */}
      <Section title="My Actions" viewLabel="View all my actions" onView={() => nav.navigate('Actions')}>
        {myActions.slice(0, 5).map((a: any) => (
          <Row key={a.id} style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.lineSoft }}>
            <View style={{ flex: 1 }}><Text size={13} weight="600">{a.title}</Text>{!!a.due_date && <Text muted size={11}>Due {d(a.due_date)}</Text>}</View>
            <Pill tone="mod">{a.status}</Pill>
          </Row>
        ))}
        {myActions.length === 0 && <Text muted size={12} style={{ textAlign: 'center', paddingVertical: 16 }}>No open actions</Text>}
      </Section>

      {/* Escalations */}
      <Section title="Escalations Requiring Follow Up">
        {myEsc.slice(0, 5).map((e: any) => (
          <Row key={e.id} style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.lineSoft }}>
            <View style={{ flex: 1 }}><Text size={13} weight="600">{e.risk_title || e.reason || 'Escalation'}</Text>{!!e.escalated_to_name && <Text muted size={11}>{e.escalated_to_name}</Text>}</View>
            <Pill tone={e.overdue ? 'crit' : 'mod'}>{e.overdue ? 'Overdue' : (e.lifecycle_status || 'Under Review')}</Pill>
          </Row>
        ))}
        {myEsc.length === 0 && <Text muted size={12} style={{ textAlign: 'center', paddingVertical: 16 }}>None</Text>}
      </Section>

      {/* Quick actions */}
      <Section title="Quick Actions">
        <Row gap={8}>
          {[
            { label: 'Record Signal', icon: 'plus' as const, go: () => nav.navigate('RaiseSignal') },
            { label: 'My Actions', icon: 'check-square' as const, go: () => nav.navigate('Actions') },
            { label: 'Alerts', icon: 'bell' as const, go: () => nav.navigate('Alerts') },
          ].map((q) => (
            <Pressable key={q.label} onPress={q.go} style={{ flex: 1, alignItems: 'center', gap: 7, padding: 12, borderWidth: 1, borderColor: c.line, borderRadius: 12 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}><Feather name={q.icon} size={16} color={c.accent} /></View>
              <Text size={11} muted style={{ textAlign: 'center' }}>{q.label}</Text>
            </Pressable>
          ))}
        </Row>
      </Section>
    </Screen>
  );
}
