/**
 * screens/director/GovernanceScreen.tsx
 * Governance overview list + escalations-by-severity donut — matches
 * screenshot 5/6.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDrawer } from '@/navigation/AppDrawerContext';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card } from '@/components/ui';
import { BoardHeader, StatusList, PercentDonut, type StatusRow } from '@/components/board';

const overviewRows: StatusRow[] = [
  { id: '1', title: 'Signals awaiting governance review', badge: 31 },
  { id: '2', title: 'Outstanding actions', badge: 2 },
  { id: '3', title: 'Overdue actions', badge: 9, tone: 'high' },
  { id: '4', title: 'Open escalations', badge: 40, tone: 'high' },
  { id: '5', title: 'Effectiveness reviews overdue', badge: 4, tone: 'medium' },
  { id: '6', title: 'Weekly reviews awaiting publication', badge: 2, tone: 'info' },
  { id: '7', title: 'Monthly narrative awaiting completion', badge: 1, tone: 'info' },
];

export default function GovernanceScreen() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation();
  const { openDrawer } = useAppDrawer();

  return (
    <Screen scroll>
      <BoardHeader
        title="Governance"
        subtitle="Updated just now"
        onMenuPress={() => openDrawer()}
        onBellPress={() => {}}
      />

      <Text variant="subtitle" style={{ fontSize: 16, marginBottom: spacing.sm }}>
        Governance overview
      </Text>
      <StatusList rows={overviewRows} onPressRow={() => {}} />

      <Text variant="subtitle" style={{ fontSize: 16, marginTop: spacing.xl, marginBottom: spacing.md }}>
        Escalations by severity
      </Text>
      <Card>
        <Row gap={spacing.xl} align="center">
          <PercentDonut
            size={110}
            strokeWidth={16}
            label="40\nOpen"
            segments={[
              { value: 40, color: colors.danger },
              { value: 45, color: colors.warning },
              { value: 15, color: colors.success },
            ]}
          />
          <View style={{ gap: spacing.sm, flex: 1 }}>
            <LegendRow color={colors.danger} label="High" value="16 (40%)" />
            <LegendRow color={colors.warning} label="Medium" value="18 (45%)" />
            <LegendRow color={colors.success} label="Low" value="6 (15%)" />
          </View>
        </Row>
      </Card>
    </Screen>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <Row justify="space-between">
      <Row gap={8}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        <Text variant="caption">{label}</Text>
      </Row>
      <Text variant="caption" weight="700">
        {value}
      </Text>
    </Row>
  );
}
