/**
 * screens/director/HomeScreen.tsx
 * "Governance position: Attention required" overview — matches screenshot 2/6.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card, Chip } from '@/components/ui';
import { BoardHeader, Metrics, SectionTitle, StatusList, type StatusRow } from '@/components/board';

const attentionRows: StatusRow[] = [
  { id: '1', title: 'Cross-service risk deteriorating', tone: 'critical', badge: 3 },
  { id: '2', title: 'Effectiveness reviews overdue', tone: 'medium', badge: 4 },
  { id: '3', title: 'Weekly reviews awaiting publication', tone: 'info', badge: 2 },
];

export default function HomeScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();

  return (
    <Screen scroll>
      <BoardHeader
        title="Home"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        onBellPress={() => {}}
      />

      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="body" weight="600">
          Governance position
        </Text>
        <Row gap={8} style={{ marginTop: 6, marginBottom: 6 }}>
          <Text style={{ color: colors.warning }} variant="subtitle">
            Attention required
          </Text>
        </Row>
        <Text muted variant="caption">
          Key areas need your attention today. See details in My Work.
        </Text>
      </Card>

      <Metrics
        columns={2}
        items={[
          { label: 'Active signals', value: 50, sublabel: 'Awaiting governance', icon: 'activity', tone: 'success' },
          { label: 'Open escalations', value: 40, sublabel: 'Require oversight', icon: 'alert-triangle', tone: 'high' },
          { label: 'High / Critical risks', value: 7, sublabel: 'Require assurance', icon: 'shield', tone: 'medium' },
          { label: 'Overdue governance', value: 9, sublabel: 'Items overdue', icon: 'calendar', tone: 'info' },
        ]}
      />

      <SectionTitle title="Requires your attention" />
      <StatusList rows={attentionRows} onPressRow={() => {}} />
    </Screen>
  );
}
