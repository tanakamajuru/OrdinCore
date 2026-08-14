/**
 * screens/ri/NarrativeScreen.tsx
 * Governance narrative — matches RI screenshot 4/8.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card, Button, FilterPill } from '@/components/ui';
import { BoardHeader } from '@/components/board';

export default function NarrativeScreen() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation();

  return (
    <Screen scroll>
      <BoardHeader
        title="Narrative"
        subtitle="Governance narrative"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      />

      <FilterPill label="August 2026" />

      <Row gap={spacing.xl} style={{ marginTop: spacing.lg, marginBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {['Summary', 'Details', 'Evidence'].map((t, i) => (
          <Text key={t} weight={i === 0 ? '700' : '500'} style={i === 0 ? { color: colors.primary, borderBottomWidth: 2, borderBottomColor: colors.primary, paddingBottom: 8 } : { color: colors.textMuted, paddingBottom: 8 }}>
            {t}
          </Text>
        ))}
      </Row>

      <Card style={{ marginBottom: spacing.lg }}>
        <Row justify="space-between" style={{ marginBottom: spacing.sm }}>
          <Text weight="700">Overall Position</Text>
          <View style={{ backgroundColor: colors.warning + '1F', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ color: colors.warning, fontSize: 11 }} weight="700">
              WATCH
            </Text>
          </View>
        </Row>
        <Text muted style={{ marginBottom: spacing.lg }}>
          Governance is developing with areas of concern requiring sustained leadership focus and improvement.
        </Text>

        <Section title="What Changed" items={[
          { text: 'Safeguarding concerns increased across 2 services', icon: 'trending-up', color: colors.danger },
          { text: 'Medication incidents remain stable', icon: 'arrow-right', color: colors.textMuted },
          { text: 'Staffing levels have improved', icon: 'trending-down', color: colors.success },
        ]} />

        <Section title="Areas of Concern" items={[
          { text: 'Safeguarding trajectory deteriorating', icon: 'circle', color: colors.danger },
          { text: 'High-risk escalation overdue', icon: 'circle', color: colors.danger },
          { text: 'Workforce audit overdue', icon: 'circle', color: colors.danger },
        ]} />

        <Section title="Areas Improving" items={[
          { text: 'Staffing levels improving', icon: 'circle', color: colors.success },
          { text: 'Record keeping compliance improving', icon: 'circle', color: colors.success },
          { text: 'Medication incidents stable', icon: 'circle', color: colors.success },
        ]} last />

        <Text weight="700" style={{ marginBottom: 4 }}>
          Leadership Response
        </Text>
        <Text muted style={{ marginBottom: spacing.lg }}>
          Additional safeguarding support deployed to affected services.
        </Text>

        <Button label="Acknowledge & Comment" onPress={() => {}} />
      </Card>
    </Screen>
  );
}

function Section({
  title,
  items,
  last,
}: {
  title: string;
  items: { text: string; icon: keyof typeof Feather.glyphMap; color: string }[];
  last?: boolean;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ marginBottom: last ? spacing.lg : spacing.lg }}>
      <Text weight="700" style={{ marginBottom: spacing.sm }}>
        {title}
      </Text>
      {items.map((it) => (
        <Row key={it.text} gap={8} style={{ marginBottom: 4 }}>
          <Feather name={it.icon} size={10} color={it.color} />
          <Text variant="caption" style={{ flex: 1 }}>
            {it.text}
          </Text>
        </Row>
      ))}
    </View>
  );
}
