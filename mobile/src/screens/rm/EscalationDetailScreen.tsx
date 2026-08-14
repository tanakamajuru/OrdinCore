/**
 * screens/rm/EscalationDetailScreen.tsx
 * Escalation details + Take Action — matches RM Mobile screenshot 5/8.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card, Chip, Button } from '@/components/ui';

export default function EscalationDetailScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();

  const meta = [
    { label: 'Raised', value: 'Today at 07:45' },
    { label: 'SLA', value: '24 hours' },
    { label: 'Elapsed', value: '2 hours' },
    { label: 'Raised by', value: 'James Lewis (Support Worker)' },
    { label: 'Current owner', value: 'Kuda (You)' },
  ];

  return (
    <Screen scroll>
      <Row gap={spacing.md} style={{ paddingTop: spacing.sm, marginBottom: spacing.lg }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text variant="subtitle">Escalation Details</Text>
      </Row>

      <Chip label="HIGH" tone="high" />
      <Text variant="title" style={{ fontSize: 20, marginTop: spacing.sm }}>
        Mental Health Deterioration
      </Text>
      <Text muted style={{ marginBottom: spacing.lg }}>
        Grafton Road · Bashit A
      </Text>

      <Text weight="700" style={{ marginBottom: 4 }}>
        Why it escalated
      </Text>
      <Text muted style={{ marginBottom: spacing.lg }}>
        Multiple recent signals indicate a decline in mental health stability and increased anxiety.
      </Text>

      <Card style={{ marginBottom: spacing.lg }}>
        {meta.map((m, i) => (
          <Row key={m.label} justify="space-between" style={{ paddingVertical: 8, borderBottomWidth: i < meta.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
            <Text muted variant="caption">
              {m.label}
            </Text>
            <Text variant="caption" weight="700">
              {m.value}
            </Text>
          </Row>
        ))}
      </Card>

      <Text weight="700" style={{ marginBottom: spacing.sm }}>
        Linked to
      </Text>
      <Card style={{ marginBottom: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text weight="700">Mental Health Stability – Bashit A</Text>
          <Text muted variant="caption">
            Risk · Deteriorating
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={colors.textMuted} />
      </Card>

      <Text weight="700" style={{ marginBottom: spacing.sm }}>
        Latest signal
      </Text>
      <Card style={{ marginBottom: spacing.xl }}>
        <Text muted variant="caption">
          Today at 07:30
        </Text>
        <Text style={{ marginTop: 4 }}>Anxiety, poor sleep, withdrawn.</Text>
      </Card>

      <Button label="Take Action" onPress={() => {}} />
    </Screen>
  );
}
