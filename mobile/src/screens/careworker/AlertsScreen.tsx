/**
 * screens/careworker/AlertsScreen.tsx
 * Grouped activity feed — matches Care Worker screenshot 7/7.
 */
import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { roleAccent } from '@/theme/roleAccents';
import { useApi } from '@/api/useApi';
import { listOf } from '@/api/mappers';
import { Screen, Text, Row } from '@/components/ui';
import { BoardHeader } from '@/components/board';
import { useAppDrawer } from '@/navigation/AppDrawerContext';

type Alert = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  dotColor: string;
};

const dotFor = (n: any): string => {
  const s = String(n.type || n.category || n.severity || '').toLowerCase();
  if (/overdue|urgent|escalat|warn|danger|high|critical/.test(s)) return '#E08A2B';
  if (/complete|done|closed|read|info/.test(s)) return '#667085';
  return '#1B8A3E';
};

const timeLine = (x?: string) => {
  if (!x) return '';
  const days = Math.floor((Date.now() - new Date(x).getTime()) / 86400000);
  if (days <= 0) return new Date(x).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

export default function AlertsScreen() {
  const { colors, spacing } = useTheme();
  const { openDrawer } = useAppDrawer();
  const { data } = useApi<any>('/notifications');

  const all: (Alert & { ts: number })[] = listOf(data).map((n: any) => ({
    id: String(n.id),
    title: n.title || n.subject || n.type || 'Notification',
    subtitle: n.body || n.message || n.description || '',
    time: timeLine(n.created_at),
    dotColor: dotFor(n),
    ts: n.created_at ? new Date(n.created_at).getTime() : 0,
  }));
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const today = all.filter((a) => a.ts >= startOfToday.getTime());
  const thisWeek = all.filter((a) => a.ts < startOfToday.getTime());

  return (
    <Screen scroll>
      <BoardHeader
        title="Alerts"
        onMenuPress={() => openDrawer()}
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
