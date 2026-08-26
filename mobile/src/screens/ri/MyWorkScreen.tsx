/**
 * screens/ri/MyWorkScreen.tsx
 * RI oversight responsibilities inbox — matches RI screenshot 5/8.
 */
import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { goToMyWork } from '@/navigation/goToMyWork';
import { useAppDrawer } from '@/navigation/AppDrawerContext';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { myWorkRows } from '@/api/mappers';
import { Screen, Text, SegmentedControl } from '@/components/ui';
import { BoardHeader, StatusList } from '@/components/board';

export default function MyWorkScreen() {
  const { spacing } = useTheme();
  const [tab, setTab] = useState('Overview');
  const navigation = useNavigation();
  const { openDrawer } = useAppDrawer();
  const { data } = useApi<any>('/my-work');
  const rows = myWorkRows(data);

  return (
    <Screen scroll>
      <BoardHeader
        title="My Work"
        subtitle="Your RI oversight responsibilities"
        onMenuPress={() => openDrawer()}
      />
      <SegmentedControl options={['Overview', 'Updates']} value={tab} onChange={setTab} />
      <StatusList rows={rows} onPressRow={(row) => goToMyWork(navigation, 'RESPONSIBLE_INDIVIDUAL', row.id)} />
      <Text muted variant="caption" style={{ marginTop: spacing.md, textAlign: 'center' }}>
        Items updated just now
      </Text>
    </Screen>
  );
}
