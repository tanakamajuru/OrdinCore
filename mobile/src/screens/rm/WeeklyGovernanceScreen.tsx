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
import { Screen, Text, Row, Card, Button } from '@/components/ui';
import { BoardHeader } from '@/components/board';

type ReadinessRow = { label: string; value: string; status: 'ok' | 'warn' | 'info' };

const readiness: ReadinessRow[] = [
  { label: 'Signals reviewed', value: '19 / 60', status: 'warn' },
  { label: 'Escalations reviewed', value: '28 / 45', status: 'ok' },
  { label: 'Actions requiring review', value: '3', status: 'warn' },
  { label: 'Effectiveness reviews', value: '3 due', status: 'info' },
  { label: 'Risks requiring decision', value: '3', status: 'warn' },
];

const statusIcon: Record<ReadinessRow['status'], { icon: keyof typeof Feather.glyphMap; color: (c: any) => string }> = {
  ok: { icon: 'check-circle', color: (c) => c.success },
  warn: { icon: 'alert-triangle', color: (c) => c.warning },
  info: { icon: 'info', color: (c) => c.accent },
};

export default function WeeklyGovernanceScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation<any>();

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
      <Card style={{ backgroundColor: colors.warning + '15', borderWidth: 0, alignItems: 'center', marginBottom: spacing.lg }}>
        <Text style={{ color: colors.warning }} weight="800" variant="subtitle">
          NOT READY
        </Text>
        <Text muted variant="caption" style={{ textAlign: 'center', marginTop: 4 }}>
          Complete the items above to finalise your weekly governance.
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
      <Text muted variant="caption" style={{ textAlign: 'center', marginBottom: spacing.lg }}>
        Last week published on 04 May 2025
      </Text>

      <Button label="Go to Weekly Report" onPress={() => navigation.navigate('WeeklyGovernanceReport')} />
    </Screen>
  );
}
