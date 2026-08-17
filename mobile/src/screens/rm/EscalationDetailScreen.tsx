/**
 * screens/rm/EscalationDetailScreen.tsx
 * Escalation details + Take Action — matches RM Mobile screenshot 5/8.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { authoritativeTrajectory } from '@/api/mappers';
import { Screen, Text, Row, Card, Chip, Button } from '@/components/ui';

const hrs = (a: string, b: string) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 3600000));

export default function EscalationDetailScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const id = route.params?.id ? String(route.params.id) : undefined;
  const { data } = useApi<any>(id ? `/escalations/${id}` : null);
  const e: any = data?.data ?? data ?? {};

  const created = e.created_at || e.escalated_at;
  const tone: any = /high|critical|urgent/i.test(String(e.priority || e.severity || '')) ? 'high' : 'medium';
  const meta = [
    created ? { label: 'Raised', value: new Date(created).toLocaleString() } : null,
    e.due_by && created ? { label: 'SLA', value: `${hrs(created, e.due_by)} hours` } : null,
    created ? { label: 'Elapsed', value: `${hrs(created, new Date().toISOString())} hours` } : null,
    (e.raised_by_name || e.created_by_name) ? { label: 'Raised by', value: e.raised_by_name || e.created_by_name } : null,
    { label: 'Current owner', value: e.escalated_to_name || e.owner_name || 'Awaiting response' },
  ].filter(Boolean) as { label: string; value: string }[];

  const linkedTrajectory = e.risk_id ? authoritativeTrajectory(e) : undefined;
  const latest = e.latest_signal || e.last_signal;

  return (
    <Screen scroll>
      <Row gap={spacing.md} style={{ paddingTop: spacing.sm, marginBottom: spacing.lg }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text variant="subtitle">Escalation Details</Text>
      </Row>

      <Chip label={tone === 'high' ? 'HIGH' : 'MEDIUM'} tone={tone} />
      <Text variant="title" style={{ fontSize: 20, marginTop: spacing.sm }}>
        {e.risk_title || e.reason || 'Escalation'}
      </Text>
      <Text muted style={{ marginBottom: spacing.lg }}>
        {[e.house_name, e.related_person].filter(Boolean).join(' · ') || '—'}
      </Text>

      <Text weight="700" style={{ marginBottom: 4 }}>
        Escalation basis
      </Text>
      <Text muted style={{ marginBottom: spacing.lg }}>
        {e.reason || 'Management attention was required for this concern.'}
      </Text>

      <Card style={{ marginBottom: spacing.lg }}>
        {meta.map((m, i) => (
          <Row key={m.label} justify="space-between" style={{ paddingVertical: 8, borderBottomWidth: i < meta.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
            <Text muted variant="caption">
              {m.label}
            </Text>
            <Text variant="caption" weight="700">
              {m.value}
            </Text>
          </Row>
        ))}
      </Card>

      {e.risk_title ? (
        <>
          <Text weight="700" style={{ marginBottom: spacing.sm }}>
            Linked to
          </Text>
          <Card style={{ marginBottom: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text weight="700">{e.risk_title}</Text>
              <Text muted variant="caption">
                Risk{linkedTrajectory ? ` · ${linkedTrajectory}` : ''}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textMuted} />
          </Card>
        </>
      ) : null}

      {latest ? (
        <>
          <Text weight="700" style={{ marginBottom: spacing.sm }}>
            Latest signal
          </Text>
          <Card style={{ marginBottom: spacing.xl }}>
            {latest.created_at ? (
              <Text muted variant="caption">{new Date(latest.created_at).toLocaleString()}</Text>
            ) : null}
            <Text style={{ marginTop: 4 }}>{latest.description || latest.text || '—'}</Text>
          </Card>
        </>
      ) : null}

      <Button label="Take Action" onPress={() => navigation.goBack()} />
    </Screen>
  );
}
