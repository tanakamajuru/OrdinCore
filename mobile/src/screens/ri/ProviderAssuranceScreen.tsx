/**
 * screens/ri/ProviderAssuranceScreen.tsx
 * "Provider Assurance" overview — matches RI screenshot 1/8.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card } from '@/components/ui';
import { BoardHeader, Metrics, StatusList, type StatusRow } from '@/components/board';

const attentionRows: StatusRow[] = [
  { id: '1', title: 'Safeguarding trajectory deteriorating', subtitle: 'Across 2 services', tone: 'medium' },
  { id: '2', title: 'High-risk escalation overdue by 2 days', subtitle: 'St. Mary\'s Care Home', tone: 'high' },
  { id: '3', title: 'August governance narrative ready', subtitle: 'Awaiting your acknowledgement', tone: 'info' },
];

export default function ProviderAssuranceScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();

  return (
    <Screen scroll>
      <BoardHeader
        title="Ordin Core"
        subtitle="Responsible Individual"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        onBellPress={() => {}}
      />

      <Text variant="subtitle" style={{ fontSize: 16 }}>
        Provider Assurance
      </Text>
      <Text muted variant="caption" style={{ marginBottom: spacing.md }}>
        Overall assurance position
      </Text>

      <Card style={{ backgroundColor: colors.warning + '15', borderWidth: 0, marginBottom: spacing.lg }}>
        <Text style={{ color: colors.warning }} weight="800">
          WATCH
        </Text>
        <Text muted variant="caption" style={{ marginTop: 2 }}>
          2 matters require RI attention
        </Text>
        <Row justify="flex-end">
          <Text style={{ color: colors.warning }} variant="caption" weight="700">
            Review details →
          </Text>
        </Row>
      </Card>

      <Metrics
        columns={2}
        items={[
          { label: 'Critical Risks', value: 1, sublabel: 'Requires oversight', icon: 'alert-triangle', tone: 'high' },
          { label: 'Deteriorating Themes', value: 3, sublabel: 'Needs attention', icon: 'trending-up', tone: 'medium' },
          { label: 'Escalations Outside Threshold', value: 1, sublabel: 'Requires action', icon: 'alert-circle', tone: 'medium' },
          { label: 'Overdue Strategic Actions', value: 2, sublabel: 'Require assurance', icon: 'clipboard', tone: 'medium' },
        ]}
      />

      <Text variant="subtitle" style={{ fontSize: 16, marginTop: spacing.md, marginBottom: spacing.sm }}>
        Requires your attention
      </Text>
      <StatusList rows={attentionRows} onPressRow={() => {}} />
    </Screen>
  );
}
