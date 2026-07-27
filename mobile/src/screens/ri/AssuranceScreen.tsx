import React from 'react';
import { View, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { Screen, Text, Row, Pill, Button, Loading } from '@/components/ui';
import { StatCard, Section, Donut } from '@/components/dashboard';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.escalations || v?.actions || []);
const isRising = (t?: string) => ['Rising', 'Deteriorating', 'Critical'].includes(String(t || ''));

export function RIAssuranceScreen() {
  const { c } = useTheme();
  const risks = useApi<any>('/risks?limit=200');
  const esc = useApi<any>('/escalations?limit=200');
  const stats = useApi<any>('/escalations/stats');
  const reviews = useApi<any>('/governance-reviews');
  const rq = useApi<any>('/governance-reviews/queue');
  const acts = useApi<any>('/actions/oversight');

  const loading = risks.loading && !risks.data;
  const refetch = () => { risks.refetch(); esc.refetch(); stats.refetch(); reviews.refetch(); rq.refetch(); acts.refetch(); };

  const openRisks = arr(risks.data).filter((r: any) => (r.status || '').toLowerCase() !== 'closed');
  const trendOf = (r: any) => r.trend || r.trajectory || 'Stable';
  const rising = openRisks.filter((r: any) => isRising(trendOf(r))).length;
  const improving = openRisks.filter((r: any) => trendOf(r) === 'Improving').length;
  const stable = Math.max(openRisks.length - rising - improving, 0);

  const escList = arr(esc.data);
  const openEsc = escList.filter((e: any) => (e.lifecycle_status || '') !== 'Closed');
  const overdueEsc = escList.filter((e: any) => e.overdue).length;
  const reopened = escList.filter((e: any) => e.lifecycle_status === 'Reopened').length + openRisks.filter((r: any) => Number(r.reopened_count) > 0).length;

  const actions = arr(acts.data);
  const rated = actions.filter((a: any) => a.effectiveness_outcome || a.effectiveness);
  const effCount = (names: string[]) => rated.filter((a: any) => names.includes(a.effectiveness_outcome) || names.includes(a.effectiveness)).length;
  const effEffective = effCount(['Effective']);
  const effNot = effCount(['Not Effective', 'Ineffective']);

  const reviewsCompleted = arr(reviews.data).length;
  const reviewsPending = arr(rq.data).length;
  const reviewPct = (reviewsCompleted + reviewsPending) ? Math.round((reviewsCompleted / (reviewsCompleted + reviewsPending)) * 100) : 100;
  const assurance = overdueEsc > 3 || rising > openRisks.length / 2 ? 'Watch' : 'Good';
  const st = stats.data || {};

  const questions = [
    { q: 'Are risks being identified early?', ok: openRisks.length > 0 },
    { q: 'Are escalations timely?', ok: overdueEsc === 0 },
    { q: 'Are actions effective?', ok: effEffective >= effNot },
    { q: 'Are reviews completed on time?', ok: reviewsPending === 0 },
    { q: 'Are items closed appropriately?', ok: reopened <= 2 },
    { q: 'Is governance evidence sufficient?', ok: reviewsCompleted > 0 },
  ];

  const legend = (rows: [string, number, string][]) => (
    <View style={{ flex: 1, gap: 6 }}>
      {rows.map(([n, v, col]) => (
        <Row key={n} gap={7}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: col }} /><Text muted size={12} style={{ flex: 1 }}>{n}</Text><Text size={12} weight="600">{v}</Text></Row>
      ))}
    </View>
  );

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen refreshing={risks.loading} onRefresh={refetch}>
      <View>
        <Text size={22} weight="600">Responsible Individual Dashboard</Text>
        <Text muted size={12.5}>Assurance overview and governance oversight</Text>
      </View>
      <Button title="Download Reports" icon="download" tone="ghost" onPress={() => Alert.alert('Reports', 'Reports are on the web app.')} />

      <Row gap={8}>
        <StatCard icon="shield" tint="#6366f1" label="Strategic Risks" value={openRisks.length}
          footer={<><Text size={11} color={c.sevCrit}>↑ {rising}</Text><Text size={11} color={c.sevMod}>→ {stable}</Text><Text size={11} color={c.sevLow}>↓ {improving}</Text></>} />
        <StatCard icon="flag" tint={c.sevHigh} label="Escalations Open" value={openEsc.length}
          footer={<><Text size={11} color={c.sevCrit}>● {overdueEsc} Overdue</Text><Text size={11} color={c.sevLow}>● {openEsc.length - overdueEsc} On time</Text></>} />
      </Row>
      <Row gap={8}>
        <StatCard icon="clipboard" tint="#2F6CB5" label="Governance Reviews" value={reviewsCompleted + reviewsPending}
          footer={<><Text size={11} color={c.sevLow}>{reviewsCompleted} Done</Text><Text size={11} color={c.sevMod}>{reviewsPending} Pending</Text></>} />
        <StatCard icon="trending-up" tint="#8b5cf6" label="Effectiveness" value={rated.length}
          footer={<><Text size={11} color={c.sevLow}>{effEffective} Eff.</Text><Text size={11} color={c.sevCrit}>{effNot} Not</Text></>} />
      </Row>
      <Row gap={8}>
        <StatCard icon="refresh-cw" tint="#e11d48" label="Reopened Items" value={reopened} delta="risks & escalations" />
        <StatCard icon="check-circle" tint={assurance === 'Good' ? c.sevLow : c.sevMod} label="Assurance Status" value={assurance} delta="overall rating" />
      </Row>

      <Section title="Strategic Risk Summary" note="all services">
        <Row gap={16} style={{ alignItems: 'center' }}>
          <Donut total={openRisks.length} centerLabel="Risks" data={[{ value: rising, color: '#ef4444' }, { value: stable, color: '#f59e0b' }, { value: improving, color: '#10b981' }]} />
          {legend([['Rising', rising, '#ef4444'], ['Stable', stable, '#f59e0b'], ['Improving', improving, '#10b981']])}
        </Row>
      </Section>

      <Section title="Governance Review Completion">
        <Row gap={16} style={{ alignItems: 'center' }}>
          <Donut total={reviewsCompleted + reviewsPending} center={`${reviewPct}%`} centerLabel="Complete" data={[{ value: reviewsCompleted, color: '#10b981' }, { value: reviewsPending, color: '#f59e0b' }]} />
          {legend([['Completed', reviewsCompleted, '#10b981'], ['Pending', reviewsPending, '#f59e0b']])}
        </Row>
      </Section>

      <Section title="Escalations Assurance">
        <Row gap={16} style={{ alignItems: 'center' }}>
          <Donut total={openEsc.length + Number(st.closed || 0)} centerLabel="Total"
            data={[
              { value: overdueEsc, color: '#ef4444' },
              { value: Number(st.under_review || 0), color: '#f59e0b' },
              { value: Number(st.actions_implemented || 0), color: '#3b82f6' },
              { value: Number(st.monitoring_effectiveness || 0), color: '#8b5cf6' },
              { value: Number(st.closed || 0), color: '#10b981' },
            ]} />
          {legend([['Overdue', overdueEsc, '#ef4444'], ['Under Review', Number(st.under_review || 0), '#f59e0b'], ['Actions Impl.', Number(st.actions_implemented || 0), '#3b82f6'], ['Monitoring', Number(st.monitoring_effectiveness || 0), '#8b5cf6'], ['Closed', Number(st.closed || 0), '#10b981']])}
        </Row>
      </Section>

      <Section title="Open Escalations Requiring RI Oversight">
        {openEsc.slice(0, 6).map((e: any) => (
          <Row key={e.id} style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.lineSoft }}>
            <View style={{ flex: 1 }}>
              <Text size={13} weight="600" numberOfLines={1}>{e.risk_title || e.reason || 'Escalation'}</Text>
              <Text muted size={11}>{Math.max(0, Math.round((Date.now() - new Date(e.created_at).getTime()) / 86400000))} days open</Text>
            </View>
            <Pill tone={e.overdue ? 'crit' : 'ghost'}>{e.overdue ? 'Overdue' : (e.lifecycle_status || e.status)}</Pill>
          </Row>
        ))}
        {openEsc.length === 0 && <Text muted size={12} style={{ textAlign: 'center', paddingVertical: 16 }}>No open escalations</Text>}
      </Section>

      <Section title="Key Assurance Questions">
        {questions.map(({ q, ok }) => (
          <Row key={q} style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.lineSoft }}>
            <Text size={13} style={{ flex: 1 }}>{q}</Text>
            <Feather name={ok ? 'check-circle' : 'alert-triangle'} size={18} color={ok ? c.sevLow : c.sevMod} />
          </Row>
        ))}
      </Section>
    </Screen>
  );
}
