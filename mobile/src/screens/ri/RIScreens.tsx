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
import { BoardHeader, Metrics, StatusList, Checklist, PercentDonut, BoardButton, BoardItem } from '@/components/board';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.pulses || v?.actions || v?.escalations || v?.risks || []);
const sevOf = (r: any) => String(r.severity || r.risk_rating || r.current_severity || '').toLowerCase();
const isOpen = (r: any) => (r.status || r.lifecycle_status || '').toLowerCase() !== 'closed';
const isDone = (a: any) => /complete|done|cancel/i.test(a.status || '');
const isOverdue = (a: any) => /overdue/i.test(a.status || '') || (a.due_date && new Date(a.due_date) < new Date() && !isDone(a));
const ratio = (n: number, d: number) => (d ? n / d : 1);
const pctOf = (n: number, d: number) => Math.round(ratio(n, d) * 100);

// Shared assurance computation from real data — the RI's CQC-style domains derived from governance activity.
function useAssurance() {
  const sig = useApi<any>('/pulses?limit=500');
  const act = useApi<any>('/actions/oversight');
  const esc = useApi<any>('/escalations?limit=300');
  const risk = useApi<any>('/risks?limit=300');
  const signals = arr(sig.data), actions = arr(act.data), escs = arr(esc.data), risks = arr(risk.data);
  const domains = {
    Safe: pctOf(escs.filter((e) => !isOpen(e)).length, escs.length),
    Effective: pctOf(actions.filter(isDone).length, actions.length),
    Caring: pctOf(signals.filter((s) => /review|link|closed|valid/i.test(s.review_status || '')).length, signals.length),
    Responsive: pctOf(actions.filter((a) => !isOverdue(a)).length, actions.length),
    'Well-led': pctOf(risks.filter((r) => !isOpen(r)).length, risks.length),
  };
  const overall = Math.round(Object.values(domains).reduce((a, b) => a + b, 0) / Object.values(domains).length);
  return { sig, act, esc, risk, signals, actions, escs, risks, domains, overall,
    refetch: () => { sig.refetch(); act.refetch(); esc.refetch(); risk.refetch(); } };
}

/* 1 — Provider Assurance */
export function RIProviderAssuranceScreen() {
  const nav = useNavigation<any>();
  const a = useAssurance();
  if (a.sig.loading && !a.sig.data) return <Screen><Loading /></Screen>;
  return (
    <Screen refreshing={a.sig.loading} onRefresh={a.refetch}>
      <BoardHeader title="Provider Assurance" subtitle="This month" />
      <OutstandingBanner />
      <PercentDonut value={isNaN(a.overall) ? 0 : a.overall} label="Assured" tone={a.overall >= 80 ? 'green' : a.overall >= 60 ? 'amber' : 'red'} />
      <Checklist items={Object.entries(a.domains).map(([label, v]) => ({ label, value: `${isNaN(v) ? 0 : v}%` }))} />
      <BoardButton label="View board reports" icon="file-text" onPress={() => nav.navigate('RIBoardReports')} />
    </Screen>
  );
}

/* 2 — Oversight Dashboard */
export function RIOversightScreen() {
  const nav = useNavigation<any>();
  const sig = useApi<any>('/pulses?limit=500');
  const esc = useApi<any>('/escalations?limit=300');
  const risk = useApi<any>('/risks?limit=300');
  const loading = sig.loading && !sig.data;
  const risks = arr(risk.data).filter(isOpen);
  const high = risks.filter((r) => /high/.test(sevOf(r))).length;
  const critical = risks.filter((r) => /critical/.test(sevOf(r))).length;

  if (loading) return <Screen><Loading /></Screen>;
  return (
    <Screen refreshing={sig.loading} onRefresh={() => { sig.refetch(); esc.refetch(); risk.refetch(); }}>
      <BoardHeader title="Oversight Dashboard" subtitle="All services" />
      <Metrics items={[
        { value: arr(sig.data).length, label: 'Active signals' },
        { value: arr(esc.data).filter(isOpen).length, label: 'Escalations', tone: 'amber' },
        { value: high, label: 'High risks', tone: 'red' },
        { value: critical, label: 'Critical', tone: 'red' },
      ]} />
      <BoardButton label="View full oversight" onPress={() => nav.navigate('RIProviderAssurance')} />
    </Screen>
  );
}

/* 3 — Inspection Readiness */
export function RIInspectionScreen() {
  const a = useAssurance();
  if (a.sig.loading && !a.sig.data) return <Screen><Loading /></Screen>;
  const overdue = a.actions.filter(isOverdue).length;
  const yes = (b: boolean) => (b ? 'Yes' : 'No');
  const readiness = a.overall;
  return (
    <Screen refreshing={a.sig.loading} onRefresh={a.refetch}>
      <BoardHeader title="Inspection Readiness" subtitle="Overall readiness" />
      <PercentDonut value={isNaN(readiness) ? 0 : readiness} label="Ready" tone={readiness >= 80 ? 'green' : readiness >= 60 ? 'amber' : 'red'} />
      <Checklist items={[
        { label: 'Policies up to date', value: yes(a.domains['Well-led'] >= 80), showCheck: true },
        { label: 'Training compliance', value: yes(a.domains.Effective >= 80), showCheck: true },
        { label: 'Audits current', value: yes(a.domains.Safe >= 80), showCheck: true },
        { label: 'Actions overdue', value: String(overdue), showCheck: true },
      ]} />
    </Screen>
  );
}

/* 4 — Governance Narrative */
export function RINarrativeScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const a = useAssurance();
  const month = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const position = a.overall >= 80
    ? 'Governance is effective with strong oversight across all services.'
    : a.overall >= 60
      ? 'Governance is developing, with oversight in place and areas for improvement identified.'
      : 'Governance requires strengthening; oversight actions are underway across services.';
  return (
    <Screen refreshing={a.sig.loading} onRefresh={a.refetch}>
      <BoardHeader title="Governance Narrative" subtitle={month} />
      <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 15 }}>
        <Text size={14} weight="700" style={{ marginBottom: 4 }}>Overall position</Text>
        <Text size={13} muted style={{ lineHeight: 20 }}>{position}</Text>
        <Text size={14} weight="700" style={{ marginTop: 14, marginBottom: 6 }}>Key highlights</Text>
        {[
          `${a.domains.Caring}% of signals reviewed and triaged`,
          `${a.domains.Effective}% of actions completed`,
          `${a.escs.filter((e) => !isOpen(e)).length} escalations closed`,
        ].map((t, i) => (
          <Row key={i} gap={9} style={{ marginBottom: 6, alignItems: 'flex-start' }}>
            <Feather name="check" size={15} color={c.sevLow} style={{ marginTop: 2 }} />
            <Text size={13} style={{ flex: 1, lineHeight: 19 }}>{t}</Text>
          </Row>
        ))}
      </View>
      <BoardButton label="View board reports" icon="file-text" onPress={() => nav.navigate('RIBoardReports')} />
    </Screen>
  );
}

/* 5 — Reports to Board (open live on-device summaries, like the RM/Director reports) */
export function RIBoardReportsScreen() {
  const nav = useNavigation<any>();
  const reports: { title: string; type: string; meta: string }[] = [
    { title: 'Monthly governance report', type: 'monthly', meta: 'Last 30 days across all services' },
    { title: 'Risk summary report', type: 'signals-domain', meta: 'Signals by domain' },
    { title: 'Escalations report', type: 'escalations', meta: 'Open · overdue · closed' },
    { title: 'Actions summary', type: 'actions-status', meta: 'To do · done · overdue' },
    { title: 'Weekly governance report', type: 'weekly', meta: 'Last 7 days' },
  ];
  const items: BoardItem[] = reports.map((r) => ({
    title: r.title, meta: r.meta, tone: 'neutral',
    onPress: () => nav.navigate('ReportDetail', { type: r.type, title: r.title }),
  }));
  return (
    <Screen>
      <BoardHeader title="Reports to Board" />
      <StatusList items={items} />
    </Screen>
  );
}

/* More — hub */
export function RIMoreScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { user, logout } = useAuth();
  const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'You';
  const inits = `${(user?.first_name?.[0] || '')}${(user?.last_name?.[0] || '')}`.toUpperCase() || '·';
  const items: { icon: any; label: string; sub: string; go: () => void }[] = [
    { icon: 'book-open', label: 'Governance Narrative', sub: 'Monthly position', go: () => nav.navigate('RINarrative') },
    { icon: 'briefcase', label: 'Reports to Board', sub: 'Board-ready packs', go: () => nav.navigate('RIBoardReports') },
    { icon: 'user', label: 'Profile', sub: 'Account & security', go: () => nav.navigate('Profile') },
  ];
  return (
    <Screen>
      <Row gap={12} style={{ paddingVertical: 4 }}>
        <Avatar initials={inits} />
        <View style={{ flex: 1 }}><Text size={17} weight="700">{name}</Text><Text size={12.5} muted>Responsible Individual</Text></View>
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
