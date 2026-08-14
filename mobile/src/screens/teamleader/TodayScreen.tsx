/**
 * screens/teamleader/TodayScreen.tsx
 * Morning Meeting overview — matches Team Leader screenshot 1/8.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card, Button } from '@/components/ui';
import { BoardHeader, Metrics } from '@/components/board';
import { Logo } from '@/components/Logo';

const recentSignals = [
  { label: 'Mental health deterioration', time: '07:40' },
  { label: 'Medication refusal', time: '07:15' },
  { label: 'Positive community engagement', time: 'Yesterday' },
];

export default function TodayScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <Screen scroll>
      <Row justify="space-between" style={{ marginBottom: spacing.lg, marginTop: spacing.sm }}>
        <Logo size={28} />
        <Feather name="bell" size={20} color={colors.text} />
      </Row>

      <Text variant="title" style={{ fontSize: 22 }}>
        Morning Meeting
      </Text>
      <Text muted variant="caption" style={{ marginBottom: spacing.lg }}>
        47 Walcourt Road · Mon 10 Aug
      </Text>

      <Text weight="700" style={{ marginBottom: spacing.sm }}>
        Since last review
      </Text>
      <Metrics
        columns={2}
        items={[
          { label: 'New since last review', value: 3, tone: 'info' },
          { label: 'Requires attention', value: 2, tone: 'medium' },
        ]}
      />
      <Card style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <Text variant="title" style={{ color: colors.success }}>
          0
        </Text>
        <Text muted variant="caption">
          concerns
        </Text>
      </Card>

      <Text weight="700" style={{ marginBottom: 4 }}>
        Priority
      </Text>
      <Card style={{ backgroundColor: colors.warning + '15', borderWidth: 0, marginBottom: spacing.lg }}>
        <Text>Medication refusal repeated overnight.</Text>
      </Card>

      <Text weight="700" style={{ marginBottom: spacing.sm }}>
        Required today
      </Text>
      <Card style={{ marginBottom: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Row gap={spacing.sm}>
          <Feather name="clock" size={15} color={colors.text} />
          <Text weight="600">Contact CMHT</Text>
        </Row>
        <Row gap={6}>
          <Text muted variant="caption">
            Due 11:00
          </Text>
          <Feather name="chevron-right" size={14} color={colors.textMuted} />
        </Row>
      </Card>

      <Text weight="700" style={{ marginBottom: spacing.sm }}>
        Recent signals
      </Text>
      <Card style={{ marginBottom: spacing.xl }}>
        {recentSignals.map((s, i) => (
          <Row
            key={s.label}
            justify="space-between"
            style={{ paddingVertical: 6, borderBottomWidth: i < recentSignals.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
          >
            <Text variant="caption">{s.label}</Text>
            <Text muted variant="caption">
              {s.time}
            </Text>
          </Row>
        ))}
      </Card>

      <Button label="+  Record signal" onPress={() => navigation.navigate('RecordSignal')} />
    </Screen>
  );
}
