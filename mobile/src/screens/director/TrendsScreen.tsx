/**
 * screens/director/TrendsScreen.tsx
 * Cross-service trajectories + organisation risk trajectory chart +
 * incidents & safeguarding tiles — matches screenshot 3/6.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDrawer } from '@/navigation/AppDrawerContext';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card } from '@/components/ui';
import { BoardHeader, SectionTitle, StatusList, Metrics, type StatusRow } from '@/components/board';
import { MultiLineChart } from '@/components/MultiLineChart';

const trajectoryRows: StatusRow[] = [
  { id: '1', title: '24 Hurst Grove', tone: 'deteriorating', trailingText: 'Deteriorating' },
  { id: '2', title: '1 Grafton Road', tone: 'stable', trailingText: 'Stable' },
  { id: '3', title: '47 Walcourt Road', tone: 'improving', trailingText: 'Improving' },
  { id: '4', title: 'Gella Care Dom', tone: 'neutral', trailingText: 'No material change' },
];

export default function TrendsScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();
  const { openDrawer } = useAppDrawer();

  return (
    <Screen scroll>
      <BoardHeader title="Trends" onMenuPress={() => openDrawer()} onBellPress={() => {}} />

      <Card style={{ marginBottom: spacing.lg }}>
        <Row justify="space-between">
          <Text variant="subtitle" style={{ fontSize: 16 }}>
            Cross-service trajectories
          </Text>
          <Feather name="info" size={16} color={colors.textMuted} />
        </Row>
        <View style={{ marginTop: spacing.sm }}>
          <StatusList rows={trajectoryRows} />
        </View>
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="subtitle" style={{ fontSize: 16, marginBottom: 4 }}>
          Organisation risk trajectory
        </Text>
        <Row gap={6} style={{ marginBottom: spacing.sm }}>
          <Text muted variant="caption">
            Current:
          </Text>
          <Text style={{ color: colors.danger }} variant="caption" weight="700">
            High
          </Text>
          <Text muted variant="caption">
            · Deteriorating
          </Text>
        </Row>
        <MultiLineChart
          xLabels={['5 Aug', '6 Aug', '7 Aug', '8 Aug', '9 Aug', '10 Aug']}
          yTicks={['Low', 'Medium', 'High']}
          yMin={0}
          yMax={100}
          series={[
            {
              label: 'Organisation risk',
              color: colors.danger,
              points: [30, 34, 40, 55, 58, 72],
            },
          ]}
        />
      </Card>

      <SectionTitle title="Incidents & safeguarding" action="7 days" />
      <Metrics
        columns={2}
        items={[
          { label: 'Incidents', value: 18, sublabel: '↑ 20% vs previous 7 days', icon: 'alert-circle', tone: 'high' },
          { label: 'Safeguarding concerns', value: 7, sublabel: '↑ 17% vs previous 7 days', icon: 'shield', tone: 'medium' },
        ]}
      />

      <SectionTitle title="Significant changes" />
      <StatusList
        rows={[
          {
            id: '1',
            title: '24 Hurst Grove – Increased Physical',
            tone: 'high',
            trailingText: '',
          },
        ]}
      />
    </Screen>
  );
}
