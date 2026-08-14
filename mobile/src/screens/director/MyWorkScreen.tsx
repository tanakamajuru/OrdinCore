/**
 * screens/director/MyWorkScreen.tsx
 * "Priority for you" — matches screenshot 6/6.
 */
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card } from '@/components/ui';
import { BoardHeader, BoardItem, type StatusRow } from '@/components/board';

const priorityRows: (StatusRow & { icon: string })[] = [
  { id: '1', title: 'Governance reviews', subtitle: 'Items require your review', badge: 3, tone: 'high', icon: 'file-text' } as any,
  { id: '2', title: 'High / critical risks', subtitle: 'Require your assurance', badge: 2, tone: 'critical', icon: 'alert-triangle' } as any,
  { id: '3', title: 'Overdue governance actions', subtitle: 'Actions require attention', badge: 4, tone: 'medium', icon: 'clipboard' } as any,
  { id: '4', title: 'Intervention effectiveness', subtitle: 'Reviews require your input', badge: 3, tone: 'medium', icon: 'check-square' } as any,
  { id: '5', title: 'Deteriorating trajectories', subtitle: 'Require your acknowledgement', badge: 2, tone: 'high', icon: 'trending-up' } as any,
  { id: '6', title: 'Monthly leadership narrative', subtitle: 'Awaiting your completion', badge: 1, tone: 'info', icon: 'file' } as any,
];

export default function MyWorkScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();

  return (
    <Screen scroll>
      <BoardHeader title="My Work" onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())} onBellPress={() => {}} />

      <Text variant="subtitle" style={{ fontSize: 18, marginBottom: spacing.md }}>
        Priority for you
      </Text>

      {priorityRows.map((row) => (
        <Card key={row.id} style={{ marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <BoardItem row={row} divider={false} onPress={() => {}} />
        </Card>
      ))}

      <Card style={{ backgroundColor: colors.surfaceAlt, borderWidth: 0, marginTop: spacing.sm }}>
        <Text variant="caption">
          <Text weight="700" variant="caption">
            My Work{' '}
          </Text>
          shows governance items where your oversight and assurance are required.
        </Text>
      </Card>
    </Screen>
  );
}
