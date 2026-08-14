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
import { Screen, Text, Row, Card, SegmentedControl } from '@/components/ui';
import { Metrics } from '@/components/board';

export default function WeeklyGovernanceReportScreen() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation();
  const [tab, setTab] = useState('Summary');

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
          Week ending 10 May 2025
        </Text>
        <Text muted style={{ marginBottom: spacing.lg }}>
          Overall governance this week shows stability with some areas of concern requiring attention.
        </Text>

        <Metrics
          columns={2}
          items={[
            { label: 'Signals reviewed', value: 18, icon: 'activity', tone: 'info' },
            { label: 'Escalations', value: 6, icon: 'alert-triangle', tone: 'medium' },
            { label: 'Risk closed', value: 1, icon: 'check-circle', tone: 'success' },
            { label: 'New actions', value: 3, icon: 'clipboard', tone: 'medium' },
          ]}
        />

        <Text weight="700" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
          Key trajectory changes
        </Text>
        <Card>
          <TrajectoryRow icon="trending-up" color={colors.danger} label="3 risks deteriorating" />
          <TrajectoryRow icon="arrow-right" color={colors.textMuted} label="6 risks stable" />
          <TrajectoryRow icon="trending-down" color={colors.success} label="2 risks improving" last />
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
