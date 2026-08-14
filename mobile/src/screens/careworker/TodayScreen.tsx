/**
 * screens/careworker/TodayScreen.tsx
 * "Good morning, Sam" — Raise a signal CTA, actions requiring you, recent
 * signals. Matches Care Worker screenshot 1/7.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { roleAccent } from '@/theme/roleAccents';
import { Screen, Text, Row, Card, Button } from '@/components/ui';
import { BoardHeader, BoardItem, type StatusRow } from '@/components/board';

const recentSignals = [
  { id: '1', icon: 'heart' as const, color: '#7B5CE0', title: 'Mental Health & Wellbeing', subtitle: 'John S. · Submitted 09:42', badge: 'Under review' },
  { id: '2', icon: 'home' as const, color: '#1B8A3E', title: 'Environmental', subtitle: 'Bedford House · Submitted Yesterday', badge: 'Action assigned' },
  { id: '3', icon: 'star' as const, color: '#E08A2B', title: 'Positive Engagement', subtitle: 'Mary P. · Submitted 2 days ago', badge: 'Recorded' },
];

export default function TodayScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <Screen scroll>
      <BoardHeader title="Good morning, Sam" subtitle="Capture. Act. Make a difference." onBellPress={() => {}} />

      <Button
        label="+  Raise a signal"
        accentColor={roleAccent.careWorker}
        onPress={() => navigation.navigate('RaiseSignal')}
      />

      <Card
        onPress={() => navigation.navigate('MyActions')}
        style={{ marginTop: spacing.lg, marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
      >
        <Feather name="clipboard" size={20} color={roleAccent.careWorker} />
        <Text style={{ flex: 1 }} weight="700">
          2 Actions requiring you
        </Text>
        <Feather name="chevron-right" size={16} color={colors.textMuted} />
      </Card>

      <Row justify="space-between" style={{ marginBottom: spacing.sm }}>
        <Text variant="subtitle" style={{ fontSize: 16 }}>
          Your recent signals
        </Text>
        <Text style={{ color: roleAccent.careWorker }} weight="600" variant="caption">
          View all
        </Text>
      </Row>

      <Card style={{ padding: spacing.sm }}>
        {recentSignals.map((s, i) => (
          <Row
            key={s.id}
            gap={spacing.md}
            style={{ paddingVertical: spacing.sm, borderBottomWidth: i < recentSignals.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
          >
            <Feather name={s.icon} size={18} color={s.color} />
            <View style={{ flex: 1 } as any}>
              <Text weight="600">{s.title}</Text>
              <Text muted variant="caption">
                {s.subtitle}
              </Text>
            </View>
            <Text muted variant="caption">
              {s.badge}
            </Text>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}
