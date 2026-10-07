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
import { isOpenEscalation as isOpen } from '@/api/governanceStatus';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.pulses || v?.actions || v?.escalations || v?.risks || []);
const sevOf = (r: any) => String(r.severity || r.risk_rating || r.current_severity || '').toLowerCase();
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
// Each assurance dimension from /ri/assurance-summary is { state, basis } where state is one of
// Assured | Partially assured | Not assured | Insufficient evidence (RI doctrine: evidence, not ticks).
const dimState = (x: any): string => (x && typeof x === 'object' ? (x.state || '—') : (typeof x === 'string' ? x : '—'));
const dimBasis = (x: any): string => (x && typeof x === 'object' ? (x.basis || '') : '');
const dimTone = (x: any): 'green' | 'amber' | 'red' | 'neutral' => { const st = dimState(x); return st === 'Assured' ? 'green' : st === 'Partially assured' ? 'amber' : st === 'Not assured' ? 'red' : 'neutral'; };
function useAssurance() {
  const s = useApi<any>('/ri/assurance-summary');
  const d: any = s.data?.data ?? s.data ?? {};
  const states = [d.risks_identified_early, d.escalations_timely, d.actions_effective, d.closures_evidenced].map(dimState);
  const concerns = states.filter((x) => x === 'Not assured').length;
  const warnings = states.filter((x) => x === 'Partially assured').length;
  const assured = states.filter((x) => x === 'Assured').length;
  // No adverse finding and nothing yet assured = Adequate (honest), not Strong — the RI must not
  // claim strong assurance where the platform holds no supporting evidence.
  const state: AssuranceState = concerns > 0 ? 'Concern' : warnings >= 2 ? 'Watch' : warnings === 1 ? 'Adequate' : assured === 0 ? 'Adequate' : 'Strong';
  return { s, d, state, refetch: s.refetch };
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
        { label: 'Risks identified early', value: dimState(d.risks_identified_early), tone: dimTone(d.risks_identified_early) },
        { label: 'Escalations timely', value: dimState(d.escalations_timely), tone: dimTone(d.escalations_timely) },
        { label: 'Actions effective', value: dimState(d.actions_effective), tone: dimTone(d.actions_effective) },
        { label: 'Closures evidenced', value: dimState(d.closures_evidenced), tone: dimTone(d.closures_evidenced) },
        { label: 'Reopened risks', value: String(d.reopened_risks ?? 0) },
        { label: 'Overdue governance reviews', value: String(d.overdue_reviews ?? 0) },
        ...(d.resolution_effectiveness_rate != null ? [{ label: 'Resolution effectiveness', value: `${d.resolution_effectiveness_rate}%` }] : []),
      ]} />
      <BoardButton label="Review provider weekly sign-off" icon="check-circle" onPress={() => nav.navigate('ProviderSignoff')} />
      <BoardButton label="View board reports" icon="file-text" onPress={() => nav.navigate('RIBoardReports')} />
    </Screen>
  );
}

/* 2 — Oversight Dashboard */
export function RIOversightScreen() {
  const nav = useNavigation<any>();
  // Design: strategic risk exposure by level + the themes genuinely deteriorating across
  // services (from the same cross-service themes read-model the web uses).
  const risk = useApi<any>('/risks?limit=300');
  const themes = useApi<any>('/interventions/themes');
  const loading = risk.loading && !risk.data;
  const risks = arr(risk.data).filter((r: any) => isOpen(r) && (
    /critical|high/.test(sevOf(r)) || r.is_strategic || r.strategic_theme || r.requires_ri_assurance
  ));
  const lvl = (re: RegExp) => risks.filter((r) => re.test(sevOf(r))).length;
  const themeList: any[] = themes.data?.themes ?? themes.data?.data ?? (Array.isArray(themes.data) ? themes.data : []);
  const deteriorating: BoardItem[] = themeList
    .filter((t: any) => t.trajectory?.direction === 'Deteriorating')
    .slice(0, 8)
    .map((t: any) => ({ title: t.theme, value: `${t.services || 0} service${(t.services || 0) === 1 ? '' : 's'}`, tone: 'red' as Tone }));

  if (loading) return <Screen><Loading /></Screen>;
  return (
    <Screen refreshing={risk.loading} onRefresh={() => { risk.refetch(); themes.refetch(); }}>
      <BoardHeader title="Oversight" subtitle="Strategic oversight across the provider" />
      <SectionTitle>Strategic and material risks</SectionTitle>
      <Metrics items={[
        { value: lvl(/critical/), label: 'Critical', tone: 'red' },
        { value: lvl(/high/), label: 'High', tone: 'red' },
        { value: lvl(/mod|medium/), label: 'Moderate', tone: 'amber' },
        { value: lvl(/low/), label: 'Low', tone: 'green' },
      ]} />
      <SectionTitle>Deteriorating themes</SectionTitle>
      <StatusList items={deteriorating} empty="No themes deteriorating across services." />
      <BoardButton label="Review provider weekly sign-off" icon="check-circle" onPress={() => nav.navigate('ProviderSignoff')} />
      <BoardButton label="View board reports" icon="file-text" onPress={() => nav.navigate('RIBoardReports')} />
    </Screen>
  );
}

/* 3 — Inspection Readiness */
export function RIInspectionScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { s, d, state, refetch } = useAssurance();
  if (s.loading && !s.data) return <Screen><Loading /></Screen>;
  return (
    <Screen refreshing={s.loading} onRefresh={refetch}>
      <BoardHeader title="Governance Readiness" subtitle="Evidence Ordin Core can substantiate" />
      <StatusList items={[{ title: 'Assurance position', value: state, tone: stateTone(state) as any }]} />
      <Checklist items={[
        { label: 'Risks identified early', value: dimState(d.risks_identified_early), showCheck: true, tone: dimTone(d.risks_identified_early) },
        { label: 'Escalations timely', value: dimState(d.escalations_timely), showCheck: true, tone: dimTone(d.escalations_timely) },
        { label: 'Actions effective', value: dimState(d.actions_effective), showCheck: true, tone: dimTone(d.actions_effective) },
        { label: 'Closures evidenced', value: dimState(d.closures_evidenced), showCheck: true, tone: dimTone(d.closures_evidenced) },
        { label: 'Overdue governance reviews', value: String(d.overdue_reviews ?? 0), showCheck: true, tone: (Number(d.overdue_reviews ?? 0) > 0 ? 'red' : 'green') },
      ]} />
      {/* Defensibility: training, policy and audit status are NOT inferred from governance
          activity — they appear only when Ordin Core actually holds that evidence. */}
      <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 13 }}>
        <Text size={12} muted style={{ lineHeight: 18 }}>Training, policy and audit compliance are shown only where the platform holds the underlying evidence — they are never inferred from escalation or action statistics.</Text>
      </View>
      <BoardButton label="Check weekly evidence and sign-off" icon="check-circle" onPress={() => nav.navigate('ProviderSignoff')} />
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
          { label: 'Risks identified early', dim: d.risks_identified_early },
          { label: 'Escalations timely', dim: d.escalations_timely },
          { label: 'Actions effective', dim: d.actions_effective },
          { label: 'Closures evidenced', dim: d.closures_evidenced },
        ].map((it, i) => {
          const t = dimTone(it.dim);
          const color = t === 'green' ? c.sevLow : t === 'amber' ? c.sevMod : t === 'red' ? c.sevCrit : c.muted;
          return (
            <Row key={i} gap={9} style={{ marginBottom: 6, alignItems: 'flex-start' }}>
              <Feather name={t === 'green' ? 'check' : 'minus'} size={15} color={color} style={{ marginTop: 2 }} />
              <Text size={13} style={{ flex: 1, lineHeight: 19 }}><Text size={13} weight="600">{it.label}: {dimState(it.dim)}</Text>{dimBasis(it.dim) ? `\n${dimBasis(it.dim)}` : ''}</Text>
            </Row>
          );
        })}
        {d.resolution_effectiveness_rate != null && (
          <Row gap={9} style={{ marginBottom: 6, alignItems: 'flex-start' }}>
            <Feather name="check" size={15} color={c.sevLow} style={{ marginTop: 2 }} />
            <Text size={13} style={{ flex: 1, lineHeight: 19 }}>Resolution effectiveness {d.resolution_effectiveness_rate}% (of {d.resolved_total} resolved)</Text>
          </Row>
        )}
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
    { icon: 'check-circle', label: 'Provider Sign-off', sub: 'Weekly independent assurance', go: () => nav.navigate('ProviderSignoff') },
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
