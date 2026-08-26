/**
 * screens/rm/MyWorkScreen.tsx
 * "Work requiring your decision" — matches RM Mobile screenshot 2/8.
 */
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { myWorkRows } from '@/api/mappers';
import { Screen, Text, Row, Card } from '@/components/ui';
import { Feather } from '@expo/vector-icons';
import { BoardHeader, StatusList } from '@/components/board';
import { useAppDrawer } from '@/navigation/AppDrawerContext';
import { goToMyWork } from '@/navigation/goToMyWork';

export default function MyWorkScreen() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation();
  const { openDrawer } = useAppDrawer();
  const { data } = useApi<any>('/my-work');
  const rows = myWorkRows(data);

  return (
    <Screen scroll>
      <BoardHeader title="My Work" onMenuPress={openDrawer} onBellPress={() => {}} />
      <Text muted variant="caption" style={{ marginBottom: spacing.md, marginTop: -spacing.sm }}>
        Work requiring your decision
      </Text>

      <StatusList rows={rows} onPressRow={(row) => goToMyWork(navigation, 'REGISTERED_MANAGER', row.id)} />

      <Card style={{ marginTop: spacing.lg, backgroundColor: colors.surfaceAlt, borderWidth: 0 }}>
        <Row gap={spacing.sm} align="flex-start">
          <Feather name="info" size={16} color={colors.primary} />
          <Text variant="caption" style={{ flex: 1 }}>
            <Text weight="700" variant="caption">
              Tip{'\n'}
            </Text>
            Items in My Work are calculated from across all your sites and update in real time.
          </Text>
        </Row>
      </Card>
    </Screen>
  );
}
