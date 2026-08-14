/**
 * screens/rm/MyWorkScreen.tsx
 * "Work requiring your decision" — matches RM Mobile screenshot 2/8.
 */
import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card } from '@/components/ui';
import { Feather } from '@expo/vector-icons';
import { BoardHeader, StatusList, type StatusRow } from '@/components/board';

const rows: StatusRow[] = [
  { id: '1', title: 'Escalations awaiting response', badge: 9, tone: 'high' },
  { id: '2', title: 'Signals awaiting review', badge: 12, tone: 'medium' },
  { id: '3', title: 'Overdue actions', badge: 3, tone: 'neutral' },
  { id: '4', title: 'Effectiveness reviews due', badge: 3, tone: 'info' },
  { id: '5', title: 'Weekly governance due', badge: 1, tone: 'neutral' },
];

export default function MyWorkScreen() {
  const { colors, spacing, radius } = useTheme();

  return (
    <Screen scroll>
      <BoardHeader title="My Work" onBellPress={() => {}} />
      <Text muted variant="caption" style={{ marginBottom: spacing.md, marginTop: -spacing.sm }}>
        Work requiring your decision
      </Text>

      <StatusList rows={rows} onPressRow={() => {}} />

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
