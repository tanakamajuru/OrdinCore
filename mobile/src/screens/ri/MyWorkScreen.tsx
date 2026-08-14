/**
 * screens/ri/MyWorkScreen.tsx
 * RI oversight responsibilities inbox — matches RI screenshot 5/8.
 */
import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, SegmentedControl } from '@/components/ui';
import { BoardHeader, StatusList, type StatusRow } from '@/components/board';

const rows: StatusRow[] = [
  { id: '1', title: 'Critical risks require RI oversight', subtitle: '1 critical risk requires your review and oversight', badge: 1, tone: 'critical' },
  { id: '2', title: 'Escalations exceed threshold', subtitle: '1 escalation outside threshold requires RI response', badge: 1, tone: 'medium' },
  { id: '3', title: 'Overdue strategic actions', subtitle: '3 strategic actions need your assurance', badge: 3, tone: 'medium' },
  { id: '4', title: 'Narrative awaiting acknowledgement', subtitle: 'August 2026 narrative ready for your acknowledgement', badge: 1, tone: 'info' },
  { id: '5', title: 'Provider assurance exception', subtitle: '1 assurance exception requires your review', badge: 1, tone: 'info' },
];

export default function MyWorkScreen() {
  const { spacing } = useTheme();
  const [tab, setTab] = useState('Overview');
  const navigation = useNavigation();

  return (
    <Screen scroll>
      <BoardHeader
        title="My Work"
        subtitle="Your RI oversight responsibilities"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      />
      <SegmentedControl options={['Overview', 'Updates']} value={tab} onChange={setTab} />
      <StatusList rows={rows} onPressRow={() => {}} />
      <Text muted variant="caption" style={{ marginTop: spacing.md, textAlign: 'center' }}>
        Items updated just now
      </Text>
    </Screen>
  );
}
