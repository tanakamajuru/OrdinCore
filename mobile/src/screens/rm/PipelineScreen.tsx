import React from 'react';
import { View, Pressable, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { api } from '@/api/client';
import { Screen, Text, Row, Pill, Loading } from '@/components/ui';
import { StatCard, Section } from '@/components/dashboard';

const arr = (v: any): any[] => (Array.isArray(v) ? v : v?.data || v?.escalations || v?.actions || []);
type FeatherName = React.ComponentProps<typeof Feather>['name'];

export function PipelineScreen() {
  const { c } = useTheme();
  const { user } = useAuth();
  const nav = useNavigation<any>();
  const uid = user?.id || user?.user_id;

  const housesA = useApi<any>(uid ? `/users/${uid}/houses` : null);
  const house = arr(housesA.data)[0] || null;

  const signals = useApi<any>('/pulses?limit=100');
  const risks = useApi<any>('/risks?limit=100');
  const esc = useApi<any>('/escalations?limit=100');
  const rq = useApi<any>('/governance-reviews/queue');
  const eff = useApi<any>('/actions/pending-effectiveness');
  const acts = useApi<any>('/actions/oversight');
  const riq = useApi<any>(house?.id ? `/ri-governance/rm/queries?house_id=${house.id}` : null, [house?.id]);

  const loading = risks.loading && !risks.data;
  const refetch = () => { signals.refetch(); risks.refetch(); esc.refetch(); rq.refetch(); eff.refetch(); acts.refetch(); riq.refetch(); };

  const riskList = arr(risks.data);
  const openRisks = riskList.filter((r: any) => (r.status || '').toLowerCase() !== 'closed');
  const rising = openRisks.filter((r: any) => ['Rising', 'Deteriorating'].includes(r.trend || r.trajectory)).length;
  const improving = openRisks.filter((r: any) => (r.trend || r.trajectory) === 'Improving').length;
  const stable = Math.max(openRisks.length - rising - improving, 0);
  const escList = arr(esc.data);
  const openEsc = escList.filter((e: any) => (e.lifecycle_status || '') !== 'Closed');
  const overdue = escList.filter((e: any) => e.overdue).length;
  const onTime = openEsc.length - overdue;
  const closedMonth = escList.filter((e: any) => e.lifecycle_status === 'Closed').length;
  const actionsDue = arr(acts.data).filter((a: any) => !['Complete', 'Completed', 'Cancelled'].includes(a.status));
  const reviewQueue = arr(rq.data);
  const effPending = arr(eff.data);
  const riQueries = arr(riq.data);

  const webOnly = (label: string) => Alert.alert(label, 'This section is on the OrdinCore web app — a mobile version is on the way.');

  const justify = (q: any) => {
    const send = async (text?: string) => {
      if (!text) return;
      try { await api.post(`/ri-governance/queries/${q.id}/respond`, { response_text: text }); Alert.alert('Sent', 'Response submitted to the RI.'); riq.refetch(); }
      catch (e: any) { Alert.alert("Couldn't submit", e?.message || 'Try again.'); }
    };
    if (Platform.OS === 'ios' && (Alert as any).prompt) (Alert as any).prompt('Justify to RI', q.query_text, send);
    else Alert.alert('Respond on web', 'Please answer this RI query on the web app.');
  };

  const jump: { icon: FeatherName; label: string; go: () => void }[] = [
    { icon: 'activity', label: 'Daily Oversight', go: () => webOnly('Daily Oversight') },
    { icon: 'eye', label: 'Patterns', go: () => webOnly('Patterns') },
    { icon: 'alert-triangle', label: 'Oversight Register', go: () => webOnly('Oversight Register') },
    { icon: 'check-square', label: 'Actions', go: () => nav.navigate('Actions') },
    { icon: 'trending-up', label: 'Effectiveness', go: () => webOnly('Effectiveness') },
    { icon: 'flag', label: 'Escalations', go: () => webOnly('Escalations') },
    { icon: 'file-text', label: 'Weekly Review', go: () => webOnly('Weekly Review') },
    { icon: 'plus-circle', label: 'Serious Incidents', go: () => webOnly('Serious Incidents') },
    { icon: 'download', label: 'Reports', go: () => webOnly('Reports') },
  ];

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen refreshing={risks.loading} onRefresh={refetch}>
      <View>
        <Text size={22} weight="600">Registered Manager Dashboard</Text>
        <Text muted size={12.5}>Headline counts, one tap to the detail{house?.name ? ` · ${house.name}` : ''}</Text>
      </View>

      {riQueries.length > 0 && (
        <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.sevCrit + '66', borderRadius: 12, padding: 14 }}>
          <Row gap={7} style={{ marginBottom: 8 }}>
            <Feather name="shield" size={16} color={c.sevCrit} />
            <Text weight="600" color={c.sevCrit}>Outstanding RI Governance Queries</Text>
            <Pill tone="crit">{riQueries.length}</Pill>
          </Row>
          {riQueries.map((q: any) => (
            <View key={q.id} style={{ borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 11, marginTop: 8 }}>
              <Text faint size={10} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>Review query</Text>
              <Text size={13} style={{ marginTop: 3 }}>“{q.query_text}”</Text>
              <Pressable onPress={() => justify(q)} style={{ marginTop: 9, alignSelf: 'flex-start', backgroundColor: c.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text color={c.accentInk} weight="600" size={12}>Justify</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Navigator stat cards */}
      <Row gap={8}>
        <StatCard icon="activity" tint="#2F6CB5" label="Signals This Month" value={arr(signals.data).length} delta="recorded" />
        <StatCard icon="shield" tint={c.sevLow} label="Strategic Risks" value={openRisks.length}
          footer={<>
            <Text size={11} color={c.sevCrit}>↑ {rising} Rising</Text>
            <Text size={11} color={c.sevMod}>→ {stable} Stable</Text>
            <Text size={11} color={c.sevLow}>↓ {improving} Improving</Text>
          </>} />
      </Row>
      <Row gap={8}>
        <StatCard icon="flag" tint={c.sevHigh} label="Open Escalations" value={openEsc.length}
          footer={<>
            <Text size={11} color={c.sevCrit}>● {overdue} Overdue</Text>
            <Text size={11} color={c.sevLow}>● {onTime} On time</Text>
          </>} />
        <StatCard icon="check-square" tint={c.sevCrit} label="Actions Due" value={actionsDue.length} delta="open actions" viewLabel="View" onView={() => nav.navigate('Actions')} />
      </Row>
      <Row gap={8}>
        <StatCard icon="trending-up" tint="#8b5cf6" label="Effectiveness Due" value={effPending.length} delta="awaiting review" />
        <StatCard icon="check-circle" tint={c.sevLow} label="Closed This Month" value={closedMonth} delta="escalations & risks" />
      </Row>

      {/* Governance review queue */}
      <Section title="Governance Review Queue" note={reviewQueue.length ? `· ${reviewQueue.length}` : undefined}>
        {reviewQueue.slice(0, 6).map((q: any) => (
          <Row key={q.risk_id} style={{ justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.lineSoft }}>
            <View style={{ flex: 1 }}>
              <Text size={13} weight="600">{q.theme}</Text>
              <Text muted size={11}>{q.signal_count || 0} signals · {q.days_since_review ?? 0}d since review</Text>
            </View>
            <Pill tone={/crit/i.test(q.severity) ? 'crit' : /high/i.test(q.severity) ? 'high' : 'mod'}>{q.severity || '—'}</Pill>
          </Row>
        ))}
        {reviewQueue.length === 0 && <Text muted size={12} style={{ textAlign: 'center', paddingVertical: 16 }}>Queue clear</Text>}
      </Section>

      {/* Jump to */}
      <Section title="Jump to">
        <Row style={{ flexWrap: 'wrap' }} gap={8}>
          {jump.map((j) => (
            <Pressable key={j.label} onPress={j.go} style={{ width: '31%', alignItems: 'center', gap: 6, paddingVertical: 12, borderWidth: 1, borderColor: c.line, borderRadius: 10 }}>
              <Feather name={j.icon} size={17} color={c.accent} />
              <Text size={10.5} muted style={{ textAlign: 'center' }}>{j.label}</Text>
            </Pressable>
          ))}
        </Row>
      </Section>
    </Screen>
  );
}
