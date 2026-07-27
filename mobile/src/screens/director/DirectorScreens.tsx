import React from 'react';
import { View, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { radius } from '@/theme/tokens';
import { Screen, Row, Avatar, Text, Button, Loading } from '@/components/ui';
import { OutstandingBanner } from '@/components/OutstandingBanner';
import { BoardHeader, Metrics, SectionTitle, StatusList, Checklist, PercentDonut, BoardButton, SparkCard, BoardItem, Tone } from '@/components/board';

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
  const sig = useApi<any>('/pulses?limit=500');
  const esc = useApi<any>('/escalations?limit=300');
  const act = useApi<any>('/actions/oversight');
  const risk = useApi<any>('/risks?limit=300');
  const loading = sig.loading && !sig.data;

  const signals = arr(sig.data);
  const escs = arr(esc.data).filter(isOpen);
  const highRisks = arr(risk.data).filter((r) => isOpen(r) && /(high|critical)/.test(sevOf(r))).length;
  const pct = compliancePct(signals, arr(act.data), arr(esc.data));

  if (loading) return <Screen><Loading /></Screen>;
  return (
    <Screen refreshing={sig.loading} onRefresh={() => { sig.refetch(); esc.refetch(); act.refetch(); risk.refetch(); }}>
      <BoardHeader title="Director Overview" subtitle={`All services · Today, ${today()}`} />
      <OutstandingBanner />
      <Metrics items={[
        { value: signals.length, label: 'Active signals' },
        { value: escs.length, label: 'Escalations', tone: 'amber' },
        { value: `${isNaN(pct) ? 0 : pct}%`, label: 'Compliance', tone: 'green' },
        { value: highRisks, label: 'High risks', tone: 'red' },
      ]} />
      <BoardButton label="View full dashboard" onPress={() => nav.navigate('Trends')} />
    </Screen>
  );
}

/* 2 — Cross-Service Trends */
export function DirectorTrendsScreen() {
  const { data, loading, refetch } = useApi<any>('/pulses?limit=500');
  const signals = arr(data);
  const high = signals.filter((s) => /(high|critical)/i.test(s.severity || '')).length;
  const med = signals.filter((s) => /(medium|moderate)/i.test(s.severity || '')).length;
  const low = signals.filter((s) => /low/i.test(s.severity || '')).length;

  // Signals per day over the last ~8 buckets for the sparkline.
  const now = Date.now(), buckets = new Array(8).fill(0);
  signals.forEach((s) => {
    const t = new Date(s.entry_date || s.created_at).getTime();
    const daysAgo = Math.floor((now - t) / 86400000);
    if (daysAgo >= 0 && daysAgo < 32) buckets[7 - Math.floor(daysAgo / 4)]++;
  });

  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="Cross-Service Trends" subtitle="Last 30 days" />
      <SparkCard points={buckets} />
      <StatusList items={[
        { title: 'High', value: String(high), tone: 'red' },
        { title: 'Medium', value: String(med), tone: 'amber' },
        { title: 'Low', value: String(low), tone: 'green' },
      ]} />
    </Screen>
  );
}

/* 3 — Recurring Themes */
export function DirectorThemesScreen() {
  const { data, loading, refetch } = useApi<any>('/pulses?limit=500');
  const counts: Record<string, number> = {};
  arr(data).forEach((s) => { const k = domainOf(s); counts[k] = (counts[k] || 0) + 1; });
  const items: BoardItem[] = Object.entries(counts)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([title, n], i) => ({ title, value: String(n), tone: THEME_TONES[i % THEME_TONES.length] }));
  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="Recurring Themes" subtitle="Top themes" />
      {loading && !data ? <Loading /> : <StatusList items={items} button="View all themes" empty="No signals yet." />}
    </Screen>
  );
}

/* 4 — Governance Overview */
export function DirectorGovernanceScreen() {
  const sig = useApi<any>('/pulses?limit=500');
  const act = useApi<any>('/actions/oversight');
  const esc = useApi<any>('/escalations?limit=300');
  const loading = sig.loading && !sig.data;
  const signals = arr(sig.data), actions = arr(act.data), escs = arr(esc.data);
  const reviewedSig = signals.filter((s) => /review|link|closed|valid/i.test(s.review_status || '')).length;
  const doneAct = actions.filter(isDone).length;
  const closedEsc = escs.filter((e) => !isOpen(e)).length;
  const pct = compliancePct(signals, actions, escs);

  if (loading) return <Screen><Loading /></Screen>;
  return (
    <Screen refreshing={sig.loading} onRefresh={() => { sig.refetch(); act.refetch(); esc.refetch(); }}>
      <BoardHeader title="Governance Overview" subtitle="This month" />
      <PercentDonut value={isNaN(pct) ? 0 : pct} label="On track" tone={pct >= 80 ? 'green' : pct >= 60 ? 'amber' : 'red'} />
      <Checklist items={[
        { label: 'Signals reviewed', value: `${reviewedSig} / ${signals.length}` },
        { label: 'Actions completed', value: `${doneAct} / ${actions.length}` },
        { label: 'Escalations closed', value: `${closedEsc} / ${escs.length}` },
      ]} />
      <BoardButton label="View details" onPress={() => Alert.alert('Governance', 'Full governance detail is on the OrdinCore web app.')} />
    </Screen>
  );
}

/* 5 — Strategic Reports */
export function DirectorReportsScreen() {
  const reports = ['Monthly strategic report', 'Quality & safety report', 'Performance report', 'Service comparison', 'KPI dashboard'];
  const items: BoardItem[] = reports.map((title) => ({
    title, meta: 'Board-ready', tone: 'neutral',
    onPress: () => Alert.alert(title, 'This report is generated on the OrdinCore web app.'),
  }));
  return (
    <Screen>
      <BoardHeader title="Strategic Reports" />
      <StatusList items={items} button="Generate report" onButton={() => Alert.alert('Generate report', 'Reports are generated on the OrdinCore web app.')} />
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
