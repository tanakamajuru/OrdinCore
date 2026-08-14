/**
 * screens/ri/RiBoardAssuranceReportScreen.tsx
 * Full assurance report with donut summary — matches RI screenshot 8/8.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card, FilterPill, Button } from '@/components/ui';
import { PercentDonut } from '@/components/board';

const legend = [
  { label: 'Areas Strong', value: 3, color: '#1B8A3E' },
  { label: 'Areas Adequate', value: 2, color: '#2E6FE0' },
  { label: 'Areas Watch', value: 2, color: '#E08A2B' },
  { label: 'Areas Concern', value: 1, color: '#D64545' },
];

const keyMessages = [
  'Safeguarding remains the highest risk area across the provider.',
  'Workforce stability is improving.',
  'Governance actions are progressing with 78% effective.',
  'Sustained leadership focus required on risk management and audits.',
];

export default function RiBoardAssuranceReportScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();

  return (
    <Screen scroll>
      <Row gap={spacing.md} style={{ paddingTop: spacing.sm, marginBottom: spacing.lg }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text variant="subtitle">RI & Board Assurance Report</Text>
      </Row>

      <FilterPill label="August 2026" />

      <Card style={{ marginVertical: spacing.lg }}>
        <Row justify="space-between">
          <Text weight="700">Assurance Position</Text>
          <View style={{ backgroundColor: colors.warning + '1F', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ color: colors.warning, fontSize: 11 }} weight="700">
              WATCH
            </Text>
          </View>
        </Row>
        <Text muted variant="caption" style={{ marginTop: 4 }}>
          2 matters require RI attention
        </Text>
      </Card>

      <Text weight="700" style={{ marginBottom: spacing.sm }}>
        Assurance Summary
      </Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <Row gap={spacing.xl} align="center">
          <PercentDonut
            size={100}
            strokeWidth={14}
            label="62%"
            segments={legend.map((l) => ({ value: (l.value / 8) * 100, color: l.color }))}
          />
          <View style={{ gap: 6, flex: 1 } as any}>
            {legend.map((l) => (
              <Row key={l.label} justify="space-between">
                <Row gap={6}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: l.color }} />
                  <Text variant="caption">{l.label}</Text>
                </Row>
                <Text variant="caption" weight="700">
                  {l.value}
                </Text>
              </Row>
            ))}
          </View>
        </Row>
      </Card>

      <Text weight="700" style={{ marginBottom: spacing.sm }}>
        Key Messages
      </Text>
      <Card style={{ marginBottom: spacing.xl }}>
        {keyMessages.map((m) => (
          <Text key={m} variant="caption" style={{ marginBottom: 6 }}>
            • {m}
          </Text>
        ))}
      </Card>

      <Button label="View Full Report" icon="file-text" onPress={() => {}} />
    </Screen>
  );
}
