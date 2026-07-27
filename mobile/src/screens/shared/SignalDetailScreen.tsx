import React from 'react';
import { View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { RootStackParams } from '@/navigation/types';
import { Screen, Card, Row, Label, Text, Pill, SeverityPill, Loading, ErrorNote } from '@/components/ui';

const firstDomain = (d?: string[] | string) => Array.isArray(d) ? d[0] : String(d || '').replace(/[{}]/g, '').split(',')[0];

const STATUS_TONE: Record<string, 'mod' | 'ghost' | 'accent' | 'low'> = {
  New: 'mod', Reviewed: 'ghost', Linked: 'accent', Closed: 'low',
};

export function SignalDetailScreen() {
  const { c } = useTheme();
  const route = useRoute<RouteProp<RootStackParams, 'SignalDetail'>>();
  const { id } = route.params;
  const signal = useApi<any>(`/pulses/${id}`);
  const ctx = useApi<any>(`/pulses/${id}/context`);
  const s = signal.data;

  if (signal.loading && !s) return <Screen><Loading /></Screen>;
  if (signal.error) return <Screen><ErrorNote message={signal.error} onRetry={signal.refetch} /></Screen>;

  const clusters: any[] = ctx.data?.clusters || [];
  const prior: any[] = ctx.data?.prior_signals || [];

  return (
    <Screen refreshing={signal.loading} onRefresh={() => { signal.refetch(); ctx.refetch(); }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pill tone={STATUS_TONE[s?.review_status] || 'mod'}>{s?.review_status || 'New'} · needs triage</Pill>
        <Text faint size={11}>{s?.entry_date ? new Date(s.entry_date).toLocaleDateString('en-GB') : ''}</Text>
      </Row>

      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        <SeverityPill severity={s?.severity} />
        {!!firstDomain(s?.risk_domain) && <Pill tone="accent">{firstDomain(s?.risk_domain)}</Pill>}
        {!!s?.related_person && <Pill tone="ghost">{s.related_person}</Pill>}
      </Row>

      <Card>
        <Label>Observation</Label>
        <Text size={13}>{s?.description || '—'}</Text>
        {!!s?.immediate_action && (
          <View style={{ marginTop: 8 }}>
            <Text muted size={11.5}><Text weight="600" size={11.5}>Immediate action: </Text>{s.immediate_action}</Text>
          </View>
        )}
      </Card>

      <Label>History &amp; pattern</Label>
      {clusters.length > 0 ? clusters.map((cl) => (
        <View key={cl.id} style={{ backgroundColor: c.accentTint, borderColor: c.accent + '55', borderWidth: 1, borderRadius: 14, padding: 12 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={7}><Feather name="activity" size={14} color={c.accent} /><Text weight="600" size={12.5}>{cl.cluster_label || `${cl.risk_domain} pattern`}</Text></Row>
          </Row>
          <Text muted size={11.5} style={{ marginTop: 5 }}>{cl.signal_count} signal(s) · {cl.cluster_status}{cl.trajectory ? ` · ${cl.trajectory}` : ''}</Text>
        </View>
      )) : <Text muted size={12.5}>Not yet part of a pattern.</Text>}

      <Card>
        <Label>Prior occurrences · {ctx.data?.prior_count ?? prior.length}</Label>
        {prior.length === 0 ? (
          <Text muted size={12.5}>{ctx.loading ? 'Loading…' : 'No prior occurrences for this person or theme at this site.'}</Text>
        ) : prior.slice(0, 6).map((p) => (
          <View key={p.id} style={{ borderLeftWidth: 2, borderLeftColor: c.line, paddingLeft: 10, paddingVertical: 4 }}>
            <Row gap={7}>
              <Text faint size={10.5}>{new Date(p.entry_date).toLocaleDateString('en-GB')}</Text>
              <SeverityPill severity={p.severity} />
            </Row>
            <Text size={12} style={{ marginTop: 2 }}>{p.description}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
