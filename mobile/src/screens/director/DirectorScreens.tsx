import React from 'react';
import { View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { radius } from '@/theme/tokens';
import { Screen, Row, Avatar, Text, Button, Loading } from '@/components/ui';
import { OutstandingBanner } from '@/components/OutstandingBanner';
import { BoardHeader, Metrics, SectionTitle, StatusList, Checklist, PercentDonut, BoardButton, BoardItem, Tone } from '@/components/board';
import { MultiLineChart } from '@/components/MultiLineChart';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.pulses || v?.actions || v?.escalations || v?.risks || []);
const sevOf = (r: any) => String(r.severity || r.risk_rating || r.current_severity || '').toLowerCase();
const isOpen = (r: any) => (r.status || r.lifecycle_status || '').toLowerCase() !== 'closed';
const isDone = (a: any) => /complete|done|cancel/i.test(a.status || '');
const domainOf = (s: any) => (Array.isArray(s.risk_domain) ? s.risk_domain[0] : s.risk_domain || s.governance_domain || s.category || 'Other');
const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
const THEME_TONES: Tone[] = ['red', 'amber', 'green', 'purple', 'blue'];

const compliancePct = (signals: any[], actions: any[], escs: any[]) => {
  const r = [
    signals.length ? signals.filter((s) => /review|link|closed|valid/i.test(s.review_status || '')).length / signals.length : 1,
    actions.length ? actions.filter(isDone).length / actions.length : 1,
    escs.length ? escs.filter((e) => !isOpen(e)).length / escs.length : 1,
  ];
  return Math.round((r.reduce((a, b) => a + b, 0) / r.length) * 100);
};

/* 1 — Director Overview */
export function DirectorOverviewScreen() {
  const nav = useNavigation<any>();
  // Parity + doctrine: a plain-language governance POSITION from the web's governance-health
  // read-model (no composite "Compliance %"), and attention counts from /my-work so they tally.
  const gh = useApi<any>('/interventions/governance-health');
  const mw = useApi<any>('/my-work');
  const loading = gh.loading && !gh.data;
  const health = gh.data?.data?.health ?? gh.data?.health ?? null;
  const position = health == null ? 'Assessing' : health >= 75 ? 'Stable' : health >= 50 ? 'Attention required' : 'Concern';
  const posTone: Tone = (health == null ? 'slate' : health >= 75 ? 'green' : health >= 50 ? 'amber' : 'red') as Tone;
  const items: any[] = mw.data?.items ?? mw.data?.data?.items ?? [];
  const byKey = (k: string) => items.find((i: any) => i.key === k);
  const n = (v: any) => Number(v || 0);

  if (loading) return <Screen><Loading /></Screen>;
  return (
    <Screen refreshing={gh.loading} onRefresh={() => { gh.refetch(); mw.refetch(); }}>
      <BoardHeader title="Governance Position" subtitle={`All services · Today, ${today()}`} />
      <OutstandingBanner />
      <StatusList items={[{ title: 'Governance position', value: position, tone: posTone }]} />
      <SectionTitle>Requires your attention</SectionTitle>
      <Metrics items={[
        { value: n(byKey('escalations')?.count), label: 'Escalations', tone: 'red' },
        { value: n(byKey('signals')?.count), label: 'Signals to review', tone: 'amber' },
        { value: n(byKey('actions')?.emphasis ?? byKey('actions')?.count), label: 'Overdue actions', tone: 'red' },
        { value: n(byKey('effectiveness')?.count), label: 'Effectiveness due', tone: 'blue' },
      ]} />
      <BoardButton label="Cross-service trends" onPress={() => nav.navigate('Trends')} />
    </Screen>
  );
}

/* 2 — Cross-Service Trends (mirrors the web Trends: labelled multi-house trajectory + daily
   risk + weekly incident/escalation/safeguarding volumes, from /analytics/trends). */
export function DirectorTrendsScreen() {
  const { data, loading, refetch } = useApi<any>('/analytics/trends');
  const t = (data && typeof data === 'object' ? (data.data ?? data) : {}) as any;

  const crossHouse = t.crossHouseRisk || {};
  const houseNames: string[] = crossHouse.houses || [];
  const houseTrends: any[] = crossHouse.trends || [];

  const crossInc = t.crossHouseIncidents || {};
  const incHouses: string[] = crossInc.houses || [];
  const incTrends: any[] = crossInc.trends || [];

  // Friendly keys for the daily-risk chart legend.
  const daily = (t.dailyRisk || []).map((d: any) => ({ date: d.date, Daily: d.dailyRisk, '7-day avg': d.movingAvg }));

  const esc = t.escalation || { currentWeek: 0, total: 0, average: 0 };
  const sg = t.safeGuarding || { currentWeek: 0, total: 0, average: 0 };

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="Cross-Service Trends" subtitle="Last 6 weeks · all services" />

      <SectionTitle>Cross-site risk trajectory</SectionTitle>
      <MultiLineChart data={houseTrends} series={houseNames} xKey="date" height={210}
        empty="No promoted risks plot here yet — they trajectory as their history accumulates." />

      <SectionTitle>Daily risk score</SectionTitle>
      <MultiLineChart data={daily} series={['Daily', '7-day avg']} xKey="date" height={180}
        empty="No signals in the last 30 days." />

      <SectionTitle>Cross-site incidents</SectionTitle>
      <MultiLineChart data={incTrends} series={incHouses} xKey="date" height={180}
        empty="No incidents logged in the last 6 weeks." />

      <SectionTitle>Weekly volumes</SectionTitle>
      <Metrics items={[
        { value: esc.currentWeek ?? 0, label: 'Escalations this week', tone: 'amber' },
        { value: esc.total ?? 0, label: 'Escalations (6 wks)' },
        { value: sg.currentWeek ?? 0, label: 'Safeguarding this week', tone: 'red' },
        { value: sg.total ?? 0, label: 'Safeguarding (6 wks)' },
      ]} />
    </Screen>
  );
}

/* 3 — Recurring Cross-Site Themes */
export function DirectorThemesScreen() {
  // Parity + doctrine: use the web's real cross-service themes (recurrence across 2+ services
  // with a computed trajectory) — NOT an on-device frequency count of signal categories.
  const { data, loading, refetch } = useApi<any>('/interventions/themes');
  const themes: any[] = data?.themes ?? data?.data ?? (Array.isArray(data) ? data : []);
  const items: BoardItem[] = themes.slice(0, 10).map((t: any) => {
    const dir = t.trajectory?.direction;
    return {
      title: t.theme,
      value: `${t.services || 0} service${(t.services || 0) === 1 ? '' : 's'} · ${t.trajectory?.label || 'Stable'}`,
      tone: (dir === 'Deteriorating' ? 'red' : dir === 'Improving' ? 'green' : 'amber') as Tone,
    };
  });
  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="Recurring Cross-Service Themes" subtitle="Recurrence across two or more services" />
      {loading && !data ? <Loading /> : <StatusList items={items} empty="No cross-service themes yet." />}
    </Screen>
  );
}

/* 4 — Governance Overview */
export function DirectorGovernanceScreen() {
  const nav = useNavigation<any>();
  // Parity + doctrine: expose the actual governance WORKLOAD from /my-work (the same figures
  // as the web) rather than a synthetic "On track %".
  const mw = useApi<any>('/my-work');
  const loading = mw.loading && !mw.data;
  const items: any[] = mw.data?.items ?? mw.data?.data?.items ?? [];
  const toneOf = (t: string): Tone => (t === 'red' ? 'red' : t === 'amber' ? 'amber' : t === 'blue' ? 'blue' : t === 'emerald' ? 'green' : 'slate') as Tone;
  const row = (key: string, label: string): BoardItem | null => {
    const it = items.find((i: any) => i.key === key);
    return it ? { title: label, value: String(it.count), tone: toneOf(it.tone) } : null;
  };
  const workload = [
    row('signals', 'Signals awaiting review'),
    row('actions', 'Actions requiring attention'),
    row('escalations', 'Open escalations'),
    row('effectiveness', 'Effectiveness reviews due'),
    row('weekly', 'Weekly governance review'),
    row('post_escalation_review', 'Post-escalation risk reviews'),
  ].filter(Boolean) as BoardItem[];

  if (loading) return <Screen><Loading /></Screen>;
  return (
    <Screen refreshing={mw.loading} onRefresh={mw.refetch}>
      <BoardHeader title="Governance Overview" subtitle="The governance workload across services" />
      <StatusList items={workload} empty="No outstanding governance work." />
      <BoardButton label="View reports" icon="file-text" onPress={() => nav.navigate('DirectorReports')} />
    </Screen>
  );
}

/* 5 — Strategic Reports (open live on-device summaries, like the RM reports) */
export function DirectorReportsScreen() {
  const nav = useNavigation<any>();
  const reports: { title: string; type: string; meta: string }[] = [
    { title: 'Monthly governance report', type: 'monthly', meta: 'Last 30 days across all services' },
    { title: 'Weekly governance report', type: 'weekly', meta: 'Last 7 days' },
    { title: 'Signals by domain', type: 'signals-domain', meta: 'Where signals are coming from' },
    { title: 'Actions by status', type: 'actions-status', meta: 'To do · done · overdue' },
    { title: 'Escalations report', type: 'escalations', meta: 'Open · overdue · closed' },
  ];
  const items: BoardItem[] = reports.map((r) => ({
    title: r.title, meta: r.meta, tone: 'neutral',
    onPress: () => nav.navigate('ReportDetail', { type: r.type, title: r.title }),
  }));
  return (
    <Screen>
      <BoardHeader title="Strategic Reports" />
      <StatusList items={items} />
    </Screen>
  );
}

/* More — hub */
export function DirectorMoreScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { user, logout } = useAuth();
  const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'You';
  const inits = `${(user?.first_name?.[0] || '')}${(user?.last_name?.[0] || '')}`.toUpperCase() || '·';
  const items: { icon: any; label: string; sub: string; go: () => void }[] = [
    { icon: 'pie-chart', label: 'Governance Overview', sub: 'This month', go: () => nav.navigate('DirectorGovernance') },
    { icon: 'file-text', label: 'Strategic Reports', sub: 'Board-ready packs', go: () => nav.navigate('DirectorReports') },
    { icon: 'user', label: 'Profile', sub: 'Account & security', go: () => nav.navigate('Profile') },
  ];
  return (
    <Screen>
      <Row gap={12} style={{ paddingVertical: 4 }}>
        <Avatar initials={inits} />
        <View style={{ flex: 1 }}><Text size={17} weight="700">{name}</Text><Text size={12.5} muted>Director</Text></View>
      </Row>
      <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, overflow: 'hidden' }}>
        {items.map((it, i) => (
          <Pressable key={it.label} onPress={it.go} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.lineSoft }}>
            <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={it.icon} size={17} color={c.accent} />
            </View>
            <View style={{ flex: 1 }}><Text size={14.5} weight="600">{it.label}</Text><Text size={11.5} muted>{it.sub}</Text></View>
            <Feather name="chevron-right" size={18} color={c.faint} />
          </Pressable>
        ))}
      </View>
      <Button title="Log out" tone="block" icon="log-out" onPress={() => logout()} style={{ marginTop: 6 }} />
    </Screen>
  );
}
