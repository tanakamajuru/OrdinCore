/**
 * screens/ri/OversightScreen.tsx
 * Strategic oversight across the provider — matches RI screenshot 2/8.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDrawer } from '@/navigation/AppDrawerContext';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card } from '@/components/ui';
import { BoardHeader, Metrics, PercentDonut } from '@/components/board';
import { MultiLineChart } from '@/components/MultiLineChart';

const themes = [
  { label: 'Safeguarding', trend: 'Deteriorating', color: '#D64545' },
  { label: 'Medication', trend: 'No change', color: '#667085' },
  { label: 'Workforce', trend: 'Deteriorating', color: '#D64545' },
  { label: 'Record Keeping', trend: 'Improving', color: '#1B8A3E' },
  { label: 'Infection Control', trend: 'Improving', color: '#1B8A3E' },
];

export default function OversightScreen() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation();
  const { openDrawer } = useAppDrawer();

  return (
    <Screen scroll>
      <BoardHeader
        title="Oversight"
        subtitle="Strategic oversight across the provider"
        onMenuPress={() => openDrawer()}
      />

      <Text variant="subtitle" style={{ fontSize: 16, marginBottom: spacing.sm }}>
        Strategic Risks
      </Text>
      <Text muted variant="caption" style={{ marginBottom: spacing.sm }}>
        Across provider
      </Text>
      <Metrics
        columns={4}
        items={[
          { label: 'Critical', value: 1, tone: 'critical' },
          { label: 'High', value: 6, tone: 'high' },
          { label: 'Moderate', value: 10, tone: 'medium' },
          { label: 'Low', value: 8, tone: 'low' },
        ]}
      />

      <Text variant="subtitle" style={{ fontSize: 16, marginTop: spacing.md, marginBottom: spacing.sm }}>
        Deteriorating Themes
      </Text>
      <Card style={{ marginBottom: spacing.lg }}>
        {themes.map((t, i) => (
          <Row
            key={t.label}
            justify="space-between"
            style={{ paddingVertical: 8, borderBottomWidth: i < themes.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
          >
            <Text variant="caption">{t.label}</Text>
            <Text style={{ color: t.color }} variant="caption" weight="700">
              {t.trend}
            </Text>
          </Row>
        ))}
      </Card>

      <Text variant="subtitle" style={{ fontSize: 16, marginBottom: spacing.sm }}>
        Escalations Outside Threshold
      </Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text muted variant="caption">
          Across provider
        </Text>
        <Text variant="title" style={{ marginVertical: spacing.sm }}>
          4
        </Text>
        <Text muted variant="caption" style={{ marginBottom: spacing.md }}>
          Requires RI response
        </Text>
        <MultiLineChart
          xLabels={['27 Apr', '4 May', '11 May', '18 May']}
          yTicks={['0', '2', '4']}
          yMin={0}
          yMax={4}
          series={[{ label: 'Escalations', color: colors.danger, points: [1, 3, 1, 4] }]}
        />
      </Card>

      <Text variant="subtitle" style={{ fontSize: 16, marginBottom: spacing.sm }}>
        Action Effectiveness
      </Text>
      <Card>
        <Text muted variant="caption" style={{ marginBottom: spacing.md }}>
          Significant actions completed
        </Text>
        <Row gap={spacing.xl} align="center">
          <PercentDonut percent={78} size={90} strokeWidth={12} />
          <View style={{ gap: 6 } as any}>
            <Text variant="caption">
              <Text weight="700" variant="caption">34 </Text>Effective
            </Text>
            <Text variant="caption">
              <Text weight="700" variant="caption">8 </Text>Partially effective
            </Text>
            <Text variant="caption">
              <Text weight="700" variant="caption">6 </Text>Not effective
            </Text>
          </View>
        </Row>
      </Card>
    </Screen>
  );
}
