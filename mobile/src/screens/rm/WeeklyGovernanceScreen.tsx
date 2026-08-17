/**
 * screens/rm/WeeklyGovernanceScreen.tsx
 * Review readiness checklist + "Not Ready" status banner — matches RM
 * Mobile screenshot 6/8.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { Screen, Text, Row, Card, Button } from '@/components/ui';
import { BoardHeader } from '@/components/board';

type ReadinessRow = { label: string; value: string; status: 'ok' | 'warn' | 'info' };

const statusIcon: Record<ReadinessRow['status'], { icon: keyof typeof Feather.glyphMap; color: (c: any) => string }> = {
  ok: { icon: 'check-circle', color: (c) => c.success },
  warn: { icon: 'alert-triangle', color: (c) => c.warning },
  info: { icon: 'info', color: (c) => c.accent },
};

export default function WeeklyGovernanceScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation<any>();
  const { data } = useApi<any>('/rm/weekly-readiness');
  const d: any = data?.data ?? data ?? {};
  const n = (v: any) => Number(v || 0);

  const outstanding = (rev: number, total: number) => (total > 0 && rev < total ? 'warn' : 'ok');
  const readiness: ReadinessRow[] = [
    { label: 'Signals reviewed', value: `${n(d.signals_reviewed)} / ${n(d.signals_total)}`, status: outstanding(n(d.signals_reviewed), n(d.signals_total)) },
    { label: 'Escalations reviewed', value: `${n(d.escalations_reviewed)} / ${n(d.escalations_total)}`, status: outstanding(n(d.escalations_reviewed), n(d.escalations_total)) },
    { label: 'Actions requiring review', value: `${n(d.actions_requiring_review)}`, status: n(d.actions_requiring_review) > 0 ? 'warn' : 'ok' },
    { label: 'Effectiveness reviews', value: `${n(d.effectiveness_reviews_due)} due`, status: n(d.effectiveness_reviews_due) > 0 ? 'info' : 'ok' },
    { label: 'Risks requiring decision', value: `${n(d.risks_requiring_decision)}`, status: n(d.risks_requiring_decision) > 0 ? 'warn' : 'ok' },
  ];
  const ready = !!d.ready;

  return (
    <Screen scroll>
      <BoardHeader title="Weekly Governance" onBellPress={() => {}} />

      <Text variant="subtitle" style={{ fontSize: 16, marginBottom: spacing.sm }}>
        Review readiness
      </Text>
      <Card style={{ marginBottom: spacing.xl }}>
        {readiness.map((r, i) => {
          const s = statusIcon[r.status];
          return (
            <Row
              key={r.label}
              justify="space-between"
              style={{ paddingVertical: spacing.sm, borderBottomWidth: i < readiness.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
            >
              <Row gap={spacing.sm}>
                <Feather name={s.icon} size={16} color={s.color(colors)} />
                <Text>{r.label}</Text>
              </Row>
              <Text weight="700">{r.value}</Text>
            </Row>
          );
        })}
      </Card>

      <Text variant="subtitle" style={{ fontSize: 16, marginBottom: spacing.sm }}>
        Weekly review status
      </Text>
      <Card style={{ backgroundColor: (ready ? colors.success : colors.warning) + '15', borderWidth: 0, alignItems: 'center', marginBottom: spacing.lg }}>
        <Text style={{ color: ready ? colors.success : colors.warning }} weight="800" variant="subtitle">
          {ready ? 'READY' : 'NOT READY'}
        </Text>
        <Text muted variant="caption" style={{ textAlign: 'center', marginTop: 4 }}>
          {ready ? 'All weekly governance items are complete.' : 'Complete the items above to finalise your weekly governance.'}
        </Text>
      </Card>

      <Card
        onPress={() => navigation.navigate('WeeklyGovernanceReport')}
        style={{ marginBottom: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Row gap={spacing.sm}>
          <Feather name="bar-chart-2" size={16} color={colors.text} />
          <Text weight="600">View governance summary</Text>
        </Row>
        <Feather name="chevron-right" size={16} color={colors.textMuted} />
      </Card>
      <Button label="Go to Weekly Report" onPress={() => navigation.navigate('WeeklyGovernanceReport')} />
    </Screen>
  );
}
