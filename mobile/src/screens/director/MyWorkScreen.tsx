/**
 * screens/director/MyWorkScreen.tsx
 * "Priority for you" — matches screenshot 6/6.
 */
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { myWorkRows } from '@/api/mappers';
import { Screen, Text, Card } from '@/components/ui';
import { BoardHeader, BoardItem } from '@/components/board';

const ICONS: Record<string, string> = { escalations: 'alert-circle', signals: 'bell', actions: 'clipboard', effectiveness: 'check-square', weekly: 'file-text', post_escalation_review: 'shield' };

export default function MyWorkScreen() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation();
  const { data } = useApi<any>('/my-work');
  const priorityRows = myWorkRows(data).map((r) => ({ ...r, icon: ICONS[r.id] || 'file' }));

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
