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

// Assurance from the SAME authoritative read-model the web uses (/ri/assurance-summary).
// Ordin Core does NOT invent an "assured %" or infer training/policy/audit compliance from
// unrelated activity (RI doctrine) — it reports a defensible categorical state derived from
// the real RAG indicators, plus the indicators themselves.
type Rag = 'Good' | 'Warning' | 'Concern';
type AssuranceState = 'Strong' | 'Adequate' | 'Watch' | 'Concern';
function useAssurance() {
  const s = useApi<any>('/ri/assurance-summary');
  const d: any = s.data?.data ?? s.data ?? {};
  const rags: Rag[] = [d.risks_identified_early, d.escalations_timely, d.actions_effective, d.closures_evidenced].filter(Boolean);
  const concerns = rags.filter((x) => x === 'Concern').length;
  const warnings = rags.filter((x) => x === 'Warning').length;
  const state: AssuranceState = concerns > 0 ? 'Concern' : warnings >= 2 ? 'Watch' : warnings === 1 ? 'Adequate' : 'Strong';
  return { s, d, rags, state, refetch: s.refetch };
}
const stateTone = (s: AssuranceState) => (s === 'Strong' ? 'green' : s === 'Adequate' ? 'green' : s === 'Watch' ? 'amber' : 'red');

/* 1 — Provider Assurance */
export function RIProviderAssuranceScreen() {
  const nav = useNavigation<any>();
  const { s, d, state, refetch } = useAssurance();
  if (s.loading && !s.data) return <Screen><Loading /></Screen>;
  return (
    <Screen refreshing={s.loading} onRefresh={refetch}>
      <BoardHeader title="Provider Assurance" subtitle="Assurance by exception" />
      <OutstandingBanner />
      <StatusList items={[{ title: 'Assurance position', value: state, tone: stateTone(state) as any }]} />
      <Checklist items={[
        { label: 'Risks identified early', value: String(d.risks_identified_early || '—') },
        { label: 'Escalations timely', value: String(d.escalations_timely || '—') },
        { label: 'Actions effective', value: String(d.actions_effective || '—') },
        { label: 'Closures evidenced', value: String(d.closures_evidenced || '—') },
        { label: 'Reopened risks', value: String(d.reopened_risks ?? 0) },
        { label: 'Overdue governance reviews', value: String(d.overdue_reviews ?? 0) },
        ...(d.resolution_effectiveness_rate != null ? [{ label: 'Resolution effectiveness', value: `${d.resolution_effectiveness_rate}%` }] : []),
      ]} />
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
      <BoardButton label="View board reports" icon="file-text" onPress={() => nav.navigate('RIBoardReports')} />
    </Screen>
  );
}

/* 3 — Inspection Readiness */
export function RIInspectionScreen() {
  const { c } = useTheme();
  const { s, d, state, refetch } = useAssurance();
  if (s.loading && !s.data) return <Screen><Loading /></Screen>;
  return (
    <Screen refreshing={s.loading} onRefresh={refetch}>
      <BoardHeader title="Governance Readiness" subtitle="Evidence Ordin Core can substantiate" />
      <StatusList items={[{ title: 'Assurance position', value: state, tone: stateTone(state) as any }]} />
      <Checklist items={[
        { label: 'Risks identified early', value: String(d.risks_identified_early || '—'), showCheck: true },
        { label: 'Escalations timely', value: String(d.escalations_timely || '—'), showCheck: true },
        { label: 'Actions effective', value: String(d.actions_effective || '—'), showCheck: true },
        { label: 'Closures evidenced', value: String(d.closures_evidenced || '—'), showCheck: true },
        { label: 'Overdue governance reviews', value: String(d.overdue_reviews ?? 0), showCheck: true },
      ]} />
      {/* Defensibility: training, policy and audit status are NOT inferred from governance
          activity — they appear only when Ordin Core actually holds that evidence. */}
      <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 13 }}>
        <Text size={12} muted style={{ lineHeight: 18 }}>Training, policy and audit compliance are shown only where the platform holds the underlying evidence — they are never inferred from escalation or action statistics.</Text>
      </View>
    </Screen>
  );
}

/* 4 — Governance Narrative */
export function RINarrativeScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { s, d, state, refetch } = useAssurance();
  const month = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const position = state === 'Strong'
    ? 'Governance is effective with strong oversight across all services.'
    : state === 'Adequate'
      ? 'Governance is adequate, with oversight in place and areas for improvement identified.'
      : state === 'Watch'
        ? 'Governance requires closer attention; several areas are under increased oversight.'
        : 'Governance requires strengthening; oversight actions are underway across services.';
  return (
    <Screen refreshing={s.loading} onRefresh={refetch}>
      <BoardHeader title="Governance Narrative" subtitle={month} />
      <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 15 }}>
        <Text size={14} weight="700" style={{ marginBottom: 4 }}>Overall position</Text>
        <Text size={13} muted style={{ lineHeight: 20 }}>{position}</Text>
        <Text size={14} weight="700" style={{ marginTop: 14, marginBottom: 6 }}>Key highlights</Text>
        {[
          `Risks identified early: ${d.risks_identified_early || '—'}`,
          `Escalations timely: ${d.escalations_timely || '—'}`,
          `Actions effective: ${d.actions_effective || '—'}`,
          ...(d.resolution_effectiveness_rate != null ? [`Resolution effectiveness ${d.resolution_effectiveness_rate}% (of ${d.resolved_total} resolved)`] : []),
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
