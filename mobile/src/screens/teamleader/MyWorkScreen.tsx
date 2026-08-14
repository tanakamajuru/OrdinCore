/**
 * screens/teamleader/MyWorkScreen.tsx
 * Personal governance inbox — matches Team Leader screenshot 2/8.
 */
import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, SegmentedControl } from '@/components/ui';
import { BoardHeader, StatusList, type StatusRow } from '@/components/board';

const rows: StatusRow[] = [
  { id: '1', title: 'Matters requiring attention', badge: 2, tone: 'high' },
  { id: '2', title: 'Signals to review', badge: 5, tone: 'medium' },
  { id: '3', title: 'Actions due today', badge: 3, tone: 'info' },
  { id: '4', title: 'Escalation requiring response', badge: 1, tone: 'high' },
  { id: '5', title: 'Governance brief to acknowledge', badge: 1, tone: 'neutral' },
];

export default function MyWorkScreen() {
  const { spacing } = useTheme();
  const [tab, setTab] = useState('All');
  const navigation = useNavigation();

  return (
    <Screen scroll>
      <BoardHeader title="My Work" onBellPress={() => {}} />
      <SegmentedControl options={['All', 'Urgent', 'Due Today']} value={tab} onChange={setTab} />
      <Text muted variant="caption" style={{ marginVertical: spacing.md }}>
        Everything requiring your action.
      </Text>
      <StatusList rows={rows} onPressRow={() => {}} />
    </Screen>
  );
}
