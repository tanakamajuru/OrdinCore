/**
 * screens/rm/HomeScreen.tsx
 * "Good morning, Kuda" — needs attention, trajectory changes, sites
 * requiring attention. Matches RM Mobile screenshot 1/8.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card } from '@/components/ui';
import { BoardHeader, StatusList, SectionTitle, type StatusRow } from '@/components/board';

const attentionRows: StatusRow[] = [
  { id: '1', title: 'Escalations awaiting response', badge: 9, tone: 'high' },
  { id: '2', title: 'Signals awaiting review', badge: 12, tone: 'medium' },
  { id: '3', title: 'Overdue actions', badge: 3, tone: 'medium' },
  { id: '4', title: 'Effectiveness reviews due', badge: 3, tone: 'info' },
  { id: '5', title: 'Weekly governance due', badge: 1, tone: 'neutral' },
];

const trajectoryTiles = [
  { label: 'Deteriorating', value: 3, tone: 'high' as const },
  { label: 'Stable', value: 6, tone: 'neutral' as const },
  { label: 'Improving', value: 2, tone: 'success' as const },
];

const sites = [
  { id: '1', name: 'Grafton Road', tone: 'high' as const, subtitle: '2 risks · 1 escalation' },
  { id: '2', name: '24 Hurst Grove', tone: 'medium' as const, subtitle: '4 risks · 1 escalation' },
];

export default function HomeScreen() {
  const { colors, spacing, radius, severityColor, mode } = useTheme();
  const navigation = useNavigation();

  return (
    <Screen scroll>
      <BoardHeader
        title="Good morning, Kuda"
        subtitle="Registered Manager"
        onBellPress={() => {}}
      />

      <SectionTitle title="Needs your attention" />
      <StatusList rows={attentionRows} onPressRow={() => {}} />

      <SectionTitle title="Trajectory changes" />
      <Row gap={spacing.md} style={{ marginBottom: spacing.lg }}>
        {trajectoryTiles.map((t) => {
          const c = severityColor(mode, t.tone === 'neutral' ? 'info' : t.tone);
          return (
            <Card key={t.label} style={{ flex: 1, backgroundColor: c.bg, borderWidth: 0, alignItems: 'center' }}>
              <Text style={{ color: c.fg }} variant="title" weight="800">
                {t.value}
              </Text>
              <Text style={{ color: c.fg }} variant="caption" weight="600">
                {t.label}
              </Text>
            </Card>
          );
        })}
      </Row>

      <SectionTitle title="Sites requiring attention" />
      {sites.map((s) => (
        <Card key={s.id} style={{ marginBottom: spacing.md }}>
          <Row justify="space-between">
            <Text weight="700">{s.name}</Text>
            <StatusPill tone={s.tone} />
          </Row>
          <Text muted variant="caption" style={{ marginTop: 4 }}>
            {s.subtitle}
          </Text>
        </Card>
      ))}
    </Screen>
  );
}

function StatusPill({ tone }: { tone: 'high' | 'medium' }) {
  const { severityColor, mode } = useTheme();
  const c = severityColor(mode, tone);
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ color: c.fg, fontSize: 12 }} weight="700">
        {tone === 'high' ? 'High' : 'Medium'}
      </Text>
    </View>
  );
}
