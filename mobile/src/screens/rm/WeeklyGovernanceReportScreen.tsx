/**
 * screens/rm/WeeklyGovernanceReportScreen.tsx
 * Executive summary with Summary/Trajectory/Risks/Escalations tabs —
 * matches RM Mobile "Weekly Governance Report" screen.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { listOf, authoritativeTrajectory } from '@/api/mappers';
import { Screen, Text, Row, Card, SegmentedControl } from '@/components/ui';
import { Metrics } from '@/components/board';

export default function WeeklyGovernanceReportScreen() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation();
  const [tab, setTab] = useState('Summary');

  const { data: wr } = useApi<any>('/rm/weekly-readiness');
  const { data: riskData } = useApi<any>('/risks?limit=300');
  const { data: escData } = useApi<any>('/escalations?limit=300');
  const d: any = wr?.data ?? wr ?? {};
  const n = (v: any) => Number(v || 0);

  const risks = listOf(riskData);
  const openRisks = risks.filter((r: any) => String(r.status || '').toLowerCase() !== 'closed');
  const deteriorating = openRisks.filter((r: any) => authoritativeTrajectory(r) === 'Deteriorating').length;
  const improving = openRisks.filter((r: any) => authoritativeTrajectory(r) === 'Improving').length;
  const stable = Math.max(0, openRisks.length - deteriorating - improving);
  const closedRisks = risks.filter((r: any) => String(r.status || '').toLowerCase() === 'closed').length;
  const escOpen = listOf(escData).filter((e: any) => !/closed|resolved/i.test(String(e.lifecycle_status || e.status || ''))).length;

  return (
    <Screen scroll>
      <Row gap={spacing.md} style={{ paddingTop: spacing.sm, marginBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text variant="subtitle">Weekly Governance Report</Text>
      </Row>

      <SegmentedControl
        options={['Summary', 'Trajectory', 'Risks', 'Escalations']}
        value={tab}
        onChange={setTab}
      />

      <View style={{ marginTop: spacing.lg }}>
        <Text weight="700" style={{ marginBottom: 2 }}>
          Executive summary
        </Text>
        <Text muted variant="caption" style={{ marginBottom: spacing.sm }}>
          Week ending {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
        <Text muted style={{ marginBottom: spacing.lg }}>
          {deteriorating > 0
            ? `${deteriorating} risk${deteriorating === 1 ? '' : 's'} deteriorating and ${escOpen} escalation${escOpen === 1 ? '' : 's'} open — areas requiring attention this week.`
            : 'Overall governance this week is stable with no deteriorating risks.'}
        </Text>

        <Metrics
          columns={2}
          items={[
            { label: 'Signals reviewed', value: n(d.signals_reviewed), icon: 'activity', tone: 'info' },
            { label: 'Escalations open', value: escOpen, icon: 'alert-triangle', tone: 'medium' },
            { label: 'Risks closed', value: closedRisks, icon: 'check-circle', tone: 'success' },
            { label: 'Actions to review', value: n(d.actions_requiring_review), icon: 'clipboard', tone: 'medium' },
          ]}
        />

        <Text weight="700" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
          Key trajectory changes
        </Text>
        <Card>
          <TrajectoryRow icon="trending-up" color={colors.danger} label={`${deteriorating} risk${deteriorating === 1 ? '' : 's'} deteriorating`} />
          <TrajectoryRow icon="arrow-right" color={colors.textMuted} label={`${stable} risk${stable === 1 ? '' : 's'} stable`} />
          <TrajectoryRow icon="trending-down" color={colors.success} label={`${improving} risk${improving === 1 ? '' : 's'} improving`} last />
        </Card>
      </View>
    </Screen>
  );
}

function TrajectoryRow({
  icon,
  color,
  label,
  last,
}: {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  label: string;
  last?: boolean;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Row
      gap={spacing.sm}
      style={{ paddingVertical: spacing.sm, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border }}
    >
      <Feather name={icon} size={15} color={color} />
      <Text>{label}</Text>
    </Row>
  );
}
