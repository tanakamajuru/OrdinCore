import React, { useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { radius } from '@/theme/tokens';
import { Screen, Row, Chip, Avatar, Text, Button, Field, Loading, ErrorNote } from '@/components/ui';
import { OutstandingBanner } from '@/components/OutstandingBanner';
import { BoardHeader, Metrics, SectionTitle, StatusList, Checklist, DetailCard, PercentDonut, BoardButton, BoardItem, Tone } from '@/components/board';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.pulses || v?.actions || v?.escalations || v?.risks || v?.houses || []);
const sevOf = (r: any) => String(r.severity || r.risk_rating || r.current_severity || r.risk_level || '').toLowerCase();
const isOpen = (r: any) => (r.status || r.lifecycle_status || '').toLowerCase() !== 'closed';
const isDone = (a: any) => /complete|done|cancel/i.test(a.status || '');
const isOverdue = (a: any) => /overdue/i.test(a.status || '') || (a.due_date && new Date(a.due_date) < new Date() && !isDone(a));
const ago = (x?: string) => {
  if (!x) return '';
  const days = Math.floor((Date.now() - new Date(x).getTime()) / 86400000);
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;
};
const riskTone = (r: any): Tone => (/(high|critical)/.test(sevOf(r)) ? 'red' : /(med|mod)/.test(sevOf(r)) ? 'amber' : 'green');
const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

/* 1 — RM Dashboard */
export function RMDashboardScreen() {
  const nav = useNavigation<any>();
  const sig = useApi<any>('/pulses?limit=200');
  const esc = useApi<any>('/escalations?limit=200');
  const act = useApi<any>('/actions/oversight');
  const risk = useApi<any>('/risks?limit=200');
  const loading = risk.loading && !risk.data;
  const refetch = () => { sig.refetch(); esc.refetch(); act.refetch(); risk.refetch(); };

  const openEsc = arr(esc.data).filter(isOpen);
  const openActions = arr(act.data).filter((a) => !isDone(a));
  const overdue = openActions.filter(isOverdue);
  const risks = arr(risk.data).filter(isOpen);
  const high = risks.filter((r) => /(high|critical)/.test(sevOf(r))).length;
  const med = risks.filter((r) => /(med|mod)/.test(sevOf(r))).length;
  const low = risks.filter((r) => /low/.test(sevOf(r))).length;

  if (loading) return <Screen><Loading /></Screen>;
  return (
    <Screen refreshing={risk.loading} onRefresh={refetch}>
      <BoardHeader title="RM Dashboard" subtitle={`Overview · Today, ${today()}`} />
      <OutstandingBanner onPress={() => nav.navigate('RMMyActions')} />
      <Metrics items={[
        { value: arr(sig.data).length, label: 'Active signals' },
        { value: openEsc.length, label: 'Escalations', tone: 'amber' },
        { value: openActions.length, label: 'Actions', tone: 'blue' },
        { value: overdue.length, label: 'Overdue', tone: 'red' },
      ]} />
      <SectionTitle>Risk summary</SectionTitle>
      <StatusList
        items={[
          // Tapping a band jumps to that category in the register (High opens the High tab).
          { title: 'High', value: String(high), tone: 'red', onPress: () => nav.navigate('Signals', { tab: 'high' }) },
          { title: 'Medium', value: String(med), tone: 'amber', onPress: () => nav.navigate('Signals', { tab: 'open' }) },
          { title: 'Low', value: String(low), tone: 'green', onPress: () => nav.navigate('Signals', { tab: 'all' }) },
        ]}
        button="View risk register" onButton={() => nav.navigate('Signals', { tab: 'all' })}
      />
    </Screen>
  );
}

/* 2 — Risk Register */
export function RMRiskRegisterScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params || {};
  const { data, loading, error, refetch } = useApi<any>('/risks?limit=200');
  const [tab, setTab] = useState<'all' | 'high' | 'open'>(params.tab || 'all');
  // Free-text filter — matches house/service name OR a date (e.g. "grafton", "jul", "16/07").
  const [q, setQ] = useState<string>(params.house || '');

  // Apply an incoming deep-link filter (from the dashboard risk summary or house overview) once.
  React.useEffect(() => { if (params.tab) setTab(params.tab); }, [params.tab]);
  React.useEffect(() => { if (params.house != null) setQ(params.house); }, [params.house]);

  const all = arr(data);
  const high = all.filter((r) => /(high|critical)/.test(sevOf(r)));
  const open = all.filter(isOpen);
  let shown = tab === 'high' ? high : tab === 'open' ? open : all;

  const needle = q.trim().toLowerCase();
  if (needle) {
    shown = shown.filter((r) => {
      const house = String(r.house_name || r.service_name || '').toLowerCase();
      const when = `${r.updated_at || ''} ${r.created_at || ''} ${r.updated_at || r.created_at ? new Date(r.updated_at || r.created_at).toLocaleDateString('en-GB') : ''}`.toLowerCase();
      return house.includes(needle) || when.includes(needle);
    });
  }

  const items: BoardItem[] = shown.map((r) => ({
    title: r.title || r.risk_title || r.theme || 'Risk',
    meta: `${r.house_name || r.service_name || ''}${r.updated_at || r.created_at ? ` · ${ago(r.updated_at || r.created_at)}` : ''}`,
    tone: riskTone(r),
    // Tap a risk to open its full detail — same as the web register.
    onPress: () => nav.navigate('RiskDetail', { risk: r }),
  }));
  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="Risk Register" />
      <Row gap={7}>
        <Chip label={`All · ${all.length}`} active={tab === 'all'} onPress={() => setTab('all')} />
        <Chip label={`High · ${high.length}`} active={tab === 'high'} onPress={() => setTab('high')} />
        <Chip label={`Open · ${open.length}`} active={tab === 'open'} onPress={() => setTab('open')} />
      </Row>
      {/* Search by house or date */}
      <View>
        <Field value={q} onChangeText={setQ} placeholder="Filter by house or date…" autoCapitalize="none" />
        {!!needle && (
          <Row style={{ marginTop: 4 }} gap={6}>
            <Text size={11.5} muted>Showing {shown.length} of {(tab === 'high' ? high : tab === 'open' ? open : all).length}</Text>
            <Pressable onPress={() => setQ('')} hitSlop={6}><Text size={11.5} weight="600" color="#2f6cb5">clear</Text></Pressable>
          </Row>
        )}
      </View>
      {loading && !data ? <Loading /> : error ? <ErrorNote message={error} onRetry={refetch} /> : (
        <StatusList items={items} empty="No risks to show." />
      )}
    </Screen>
  );
}

/* 3 — Escalations */
export function RMEscalationsScreen() {
  const { data, loading, error, refetch } = useApi<any>('/escalations?limit=200');
  const [tab, setTab] = useState<'open' | 'overdue'>('open');
  const all = arr(data);
  const open = all.filter(isOpen);
  const overdue = open.filter((e) => e.overdue);
  const shown = tab === 'overdue' ? overdue : open;
  const items: BoardItem[] = shown.map((e) => ({
    title: e.risk_title || e.reason || 'Escalation',
    meta: `${e.house_name || e.escalated_to_name || ''}${e.created_at ? ` · ${ago(e.created_at)}` : ''}`,
    tone: e.overdue ? 'red' : 'amber',
  }));
  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="Escalations" />
      <Row gap={7}>
        <Chip label={`Open · ${open.length}`} active={tab === 'open'} onPress={() => setTab('open')} />
        <Chip label={`Overdue · ${overdue.length}`} active={tab === 'overdue'} onPress={() => setTab('overdue')} />
      </Row>
      {loading && !data ? <Loading /> : error ? <ErrorNote message={error} onRetry={refetch} /> : (
        <StatusList items={items} empty="No escalations here." />
      )}
    </Screen>
  );
}

/* 4 — Governance Review */
export function RMGovernanceReviewScreen() {
  const sig = useApi<any>('/pulses?limit=300');
  const act = useApi<any>('/actions/oversight');
  const esc = useApi<any>('/escalations?limit=200');
  const loading = sig.loading && !sig.data;

  const signals = arr(sig.data);
  const reviewedSig = signals.filter((s) => /review|link|closed|valid/i.test(s.review_status || ''));
  const actions = arr(act.data);
  const reviewedAct = actions.filter((a) => isDone(a) || a.rm_decision);
  const escs = arr(esc.data);
  const reviewedEsc = escs.filter((e) => !isOpen(e) || e.reviewed_at);
  const overdue = actions.filter(isOverdue).length;

  if (loading) return <Screen><Loading /></Screen>;
  return (
    <Screen refreshing={sig.loading} onRefresh={() => { sig.refetch(); act.refetch(); esc.refetch(); }}>
      <BoardHeader title="Governance Review" subtitle="Weekly review" />
      <Checklist items={[
        { label: 'Signals reviewed', value: `${reviewedSig.length} / ${signals.length}`, showCheck: true },
        { label: 'Actions reviewed', value: `${reviewedAct.length} / ${actions.length}`, showCheck: true },
        { label: 'Escalations reviewed', value: `${reviewedEsc.length} / ${escs.length}`, showCheck: true },
        { label: 'Overdue actions', value: String(overdue), showCheck: true },
      ]} />
      <DetailCard items={[{ label: 'Review period', value: 'This week' }]} />
      <BoardButton label="View report" onPress={() => Alert.alert('Weekly report', 'The full weekly governance report is available on the OrdinCore web app.')} />
    </Screen>
  );
}

/* 5 — Reports (open a live on-device summary for each) */
export function RMReportsScreen() {
  const nav = useNavigation<any>();
  const reports: { title: string; type: string; meta: string }[] = [
    { title: 'Daily summary', type: 'daily', meta: "Today's signals, actions & escalations" },
    { title: 'Weekly governance report', type: 'weekly', meta: 'Last 7 days' },
    { title: 'Monthly governance report', type: 'monthly', meta: 'Last 30 days' },
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
      <BoardHeader title="Reports" />
      <StatusList items={items} />
    </Screen>
  );
}

/* 6 — House Overview */
export function RMHouseOverviewScreen() {
  const nav = useNavigation<any>();
  const houses = useApi<any>('/houses');
  const risks = useApi<any>('/risks?limit=300');
  const loading = houses.loading && !houses.data;
  const riskList = arr(risks.data).filter(isOpen);

  const items: BoardItem[] = arr(houses.data).map((h) => {
    const hr = riskList.filter((r) => r.house_id === h.id || r.service_id === h.id);
    const hasHigh = hr.some((r) => /(high|critical)/.test(sevOf(r)));
    const hasMed = hr.some((r) => /(med|mod)/.test(sevOf(r)));
    const tone: Tone = hasHigh ? 'red' : hasMed ? 'amber' : 'green';
    return {
      title: h.name || 'House',
      meta: `${hr.length} open risk${hr.length === 1 ? '' : 's'} · ${hasHigh ? 'High' : hasMed ? 'Medium' : 'Low'}`,
      tone,
      // Tap a house to see its risks in the register, filtered to that house.
      onPress: () => nav.navigate('Tabs', { screen: 'Signals', params: { house: h.name } }),
    };
  });
  return (
    <Screen refreshing={houses.loading} onRefresh={() => { houses.refetch(); risks.refetch(); }}>
      <BoardHeader title="House Overview" menu={false} />
      {loading ? <Loading /> : houses.error ? <ErrorNote message={houses.error} onRetry={houses.refetch} /> : (
        <StatusList items={items} empty="No houses assigned." />
      )}
    </Screen>
  );
}

/* 7 — Compliance (Governance Compliance: per-staff traffic light + overdue aging) */
const ragTone = (rag?: string): Tone => (rag === 'red' ? 'red' : rag === 'amber' ? 'amber' : 'green');

export function RMComplianceScreen() {
  const { data, loading, error, refetch } = useApi<any>('/governance/compliance');
  const summary = (data && typeof data === 'object' ? (data.data ?? data) : {}) as any;
  const people: any[] = summary.people || [];
  const tracked = summary.staff_tracked ?? people.length;
  // Overall compliance = share of tracked staff with nothing overdue (green).
  const pct = tracked ? Math.round(((summary.green ?? 0) / tracked) * 100) : 100;

  const items: BoardItem[] = people.map((p) => ({
    title: p.name || 'Staff',
    meta: [
      `${p.open} open`,
      p.overdue > 0 ? `${p.overdue} overdue${p.oldest_overdue_days != null ? ` · oldest ${p.oldest_overdue_days}d` : ''}` : null,
      p.due_today > 0 ? `${p.due_today} due today` : null,
    ].filter(Boolean).join(' · '),
    value: p.overdue > 0 ? `${p.overdue}` : '✓',
    tone: ragTone(p.rag),
  }));

  if (loading && !data) return <Screen><Loading /></Screen>;
  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="Compliance" subtitle="Actions done on time, per person" />
      {error ? <ErrorNote message={error} onRetry={refetch} /> : (
        <>
          <PercentDonut value={isNaN(pct) ? 0 : pct} label="Compliant" tone={pct >= 80 ? 'green' : pct >= 60 ? 'amber' : 'red'} />
          <Metrics items={[
            { value: summary.green ?? 0, label: 'On track', tone: 'green' },
            { value: summary.amber ?? 0, label: 'Falling behind', tone: 'amber' },
            { value: summary.red ?? 0, label: 'Needs chasing', tone: 'red' },
          ]} />
          <SectionTitle>By staff member{summary.overdue_total ? ` · ${summary.overdue_total} overdue` : ''}</SectionTitle>
          <StatusList items={items} empty="No actions assigned yet." />
        </>
      )}
    </Screen>
  );
}

/* 8 — My Actions */
export function RMMyActionsScreen() {
  const nav = useNavigation<any>();
  const { data, loading, error, refetch } = useApi<any>('/actions/my');
  const [tab, setTab] = useState<'todo' | 'done'>('todo');
  const all = arr(data);
  const todo = all.filter((a) => !isDone(a));
  const done = all.filter(isDone);
  const shown = tab === 'todo' ? todo : done;
  const items: BoardItem[] = shown.map((a) => ({
    title: a.title,
    meta: `${a.related_person || a.house_name || a.risk_title || ''}${a.due_date ? ` · due ${new Date(a.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` : ''}`,
    tone: isDone(a) ? 'green' : isOverdue(a) ? 'red' : 'amber',
    onPress: () => nav.navigate('ActionDetail', { action: a }),
  }));
  return (
    <Screen refreshing={loading} onRefresh={refetch}>
      <BoardHeader title="My Actions" />
      <Row gap={7}>
        <Chip label={`To do (${todo.length})`} active={tab === 'todo'} onPress={() => setTab('todo')} />
        <Chip label="Done" active={tab === 'done'} onPress={() => setTab('done')} />
      </Row>
      {loading && !data ? <Loading /> : error ? <ErrorNote message={error} onRetry={refetch} /> : (
        <StatusList items={items} empty={tab === 'done' ? 'Nothing completed yet.' : 'All caught up.'} />
      )}
    </Screen>
  );
}

/* More — hub for the screens not on the tab bar */
export function RMMoreScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { user, logout } = useAuth();
  const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'You';
  const inits = `${(user?.first_name?.[0] || '')}${(user?.last_name?.[0] || '')}`.toUpperCase() || '·';
  const items: { icon: any; label: string; sub: string; go: () => void }[] = [
    { icon: 'trending-up', label: 'Escalations', sub: 'Open & overdue', go: () => nav.navigate('RMEscalations') },
    { icon: 'clipboard', label: 'Governance Review', sub: 'Weekly review', go: () => nav.navigate('RMGovernanceReview') },
    { icon: 'home', label: 'House Overview', sub: 'Risk by house', go: () => nav.navigate('RMHouseOverview') },
    { icon: 'shield', label: 'Compliance', sub: 'Policies, training, audits', go: () => nav.navigate('RMCompliance') },
    { icon: 'check-square', label: 'My Actions', sub: 'Tasks allocated to you', go: () => nav.navigate('RMMyActions') },
    { icon: 'user', label: 'Profile', sub: 'Account & security', go: () => nav.navigate('Profile') },
  ];
  return (
    <Screen>
      <Row gap={12} style={{ paddingVertical: 4 }}>
        <Avatar initials={inits} />
        <View style={{ flex: 1 }}>
          <Text size={17} weight="700">{name}</Text>
          <Text size={12.5} muted>Registered Manager</Text>
        </View>
      </Row>
      <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, overflow: 'hidden' }}>
        {items.map((it, i) => (
          <Pressable key={it.label} onPress={it.go}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.lineSoft }}>
            <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={it.icon} size={17} color={c.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text size={14.5} weight="600">{it.label}</Text>
              <Text size={11.5} muted>{it.sub}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={c.faint} />
          </Pressable>
        ))}
      </View>
      <Button title="Log out" tone="block" icon="log-out" onPress={() => logout()} style={{ marginTop: 6 }} />
    </Screen>
  );
}
