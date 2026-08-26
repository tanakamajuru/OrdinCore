/**
 * screens/teamleader/MyWorkScreen.tsx
 * Personal governance inbox — matches Team Leader screenshot 2/8.
 */
import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { myWorkRows } from '@/api/mappers';
import { Screen, Text, SegmentedControl } from '@/components/ui';
import { BoardHeader, StatusList } from '@/components/board';
import { useAppDrawer } from '@/navigation/AppDrawerContext';
import { goToMyWork } from '@/navigation/goToMyWork';

export default function MyWorkScreen() {
  const { spacing } = useTheme();
  const { openDrawer } = useAppDrawer();
  const [tab, setTab] = useState('All');
  const navigation = useNavigation();
  const { data } = useApi<any>('/my-work');
  const rows = myWorkRows(data);

  return (
    <Screen scroll>
      <BoardHeader title="My Work" onMenuPress={() => openDrawer()} onBellPress={() => {}} />
      <SegmentedControl options={['All', 'Urgent', 'Due Today']} value={tab} onChange={setTab} />
      <Text muted variant="caption" style={{ marginVertical: spacing.md }}>
        Everything requiring your action.
      </Text>
      <StatusList rows={rows} onPressRow={(row) => goToMyWork(navigation, 'TEAM_LEADER', row.id)} />
    </Screen>
  );
}
