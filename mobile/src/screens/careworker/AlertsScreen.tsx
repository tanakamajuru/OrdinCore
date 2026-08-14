/**
 * screens/careworker/AlertsScreen.tsx
 * Grouped activity feed — matches Care Worker screenshot 7/7.
 */
import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { roleAccent } from '@/theme/roleAccents';
import { Screen, Text, Row } from '@/components/ui';
import { BoardHeader } from '@/components/board';

type Alert = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  dotColor: string;
};

const today: Alert[] = [
  { id: '1', title: 'Action assigned to you', subtitle: 'Check bedroom smoke detector', time: '09:45', dotColor: '#1B8A3E' },
  { id: '2', title: 'Signal reviewed', subtitle: 'Mental Health & Wellbeing - John S.', time: '08:30', dotColor: '#1B8A3E' },
  { id: '3', title: 'Further information requested', subtitle: 'Safeguarding - Mary P.', time: 'Yesterday', dotColor: '#E08A2B' },
  { id: '4', title: 'Action due today', subtitle: '2 actions due today', time: 'Yesterday', dotColor: '#E08A2B' },
];

const thisWeek: Alert[] = [
  { id: '5', title: 'Action completed', subtitle: 'Medication review - John S.', time: '2 days ago', dotColor: '#667085' },
];

export default function AlertsScreen() {
  const { colors, spacing } = useTheme();

  return (
    <Screen scroll>
      <BoardHeader
        title="Alerts"
        right={
          <Text style={{ color: roleAccent.careWorker }} weight="600" variant="caption">
            Mark all read
          </Text>
        }
      />

      <Text weight="700" muted variant="caption" style={{ marginBottom: spacing.sm }}>
        Today
      </Text>
      {today.map((a, i) => (
        <AlertRow key={a.id} a={a} last={i === today.length - 1} />
      ))}

      <Text weight="700" muted variant="caption" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
        This week
      </Text>
      {thisWeek.map((a, i) => (
        <AlertRow key={a.id} a={a} last={i === thisWeek.length - 1} />
      ))}
    </Screen>
  );
}

function AlertRow({ a, last }: { a: Alert; last?: boolean }) {
  const { colors, spacing } = useTheme();
  return (
    <Row
      gap={spacing.md}
      align="flex-start"
      style={{ paddingVertical: spacing.sm, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: a.dotColor, marginTop: 6 }} />
      <View style={{ flex: 1 } as any}>
        <Text weight="700">{a.title}</Text>
        <Text muted variant="caption">
          {a.subtitle}
        </Text>
      </View>
      <Text muted variant="caption">
        {a.time}
      </Text>
    </Row>
  );
}
