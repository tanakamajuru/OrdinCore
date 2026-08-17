/**
 * screens/ri/RiBoardAssuranceReportScreen.tsx
 * Full assurance report with donut summary — matches RI screenshot 8/8.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { Screen, Text, Row, Card, FilterPill, Button } from '@/components/ui';
import { PercentDonut } from '@/components/board';

const band = (v: any): 'Strong' | 'Adequate' | 'Watch' | 'Concern' => {
  const s = String(v || '').toLowerCase();
  if (/concern/.test(s)) return 'Concern';
  if (/warn|watch/.test(s)) return 'Watch';
  if (/adequate/.test(s)) return 'Adequate';
  return 'Strong';
};

export default function RiBoardAssuranceReportScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();
  const { data: assur } = useApi<any>('/ri/assurance-summary');
  const d: any = assur?.data ?? assur ?? {};

  const indicators = [
    { name: 'Risks identified early', v: d.risks_identified_early },
    { name: 'Escalations timely', v: d.escalations_timely },
    { name: 'Actions effective', v: d.actions_effective },
    { name: 'Closures evidenced', v: d.closures_evidenced },
  ];
  const bands = indicators.map((i) => band(i.v));
  const count = (b: string) => bands.filter((x) => x === b).length;
  const legend = [
    { label: 'Areas Strong', value: count('Strong'), color: '#1B8A3E' },
    { label: 'Areas Adequate', value: count('Adequate'), color: '#2E6FE0' },
    { label: 'Areas Watch', value: count('Watch'), color: '#E08A2B' },
    { label: 'Areas Concern', value: count('Concern'), color: '#D64545' },
  ];
  const total = indicators.length;
  const goodPct = Math.round(((count('Strong') + count('Adequate')) / total) * 100);
  const attention = count('Watch') + count('Concern');
  const position = count('Concern') > 0 ? { label: 'CONCERN', color: colors.danger } : attention > 0 ? { label: 'WATCH', color: colors.warning } : { label: 'STRONG', color: colors.success };
  const effPct = Math.round(Number(d.resolution_effectiveness_rate ?? 0));

  const keyMessages = [
    `Governance actions are ${effPct}% effective across ${Number(d.resolved_total ?? 0)} resolved concerns.`,
    Number(d.overdue_reviews ?? 0) > 0 ? `${Number(d.overdue_reviews)} governance review(s) overdue.` : 'All governance reviews are current.',
    Number(d.reopened_risks ?? 0) > 0 ? `${Number(d.reopened_risks)} risk(s) reopened — sustained focus required.` : 'No risks reopened this period.',
    attention > 0 ? `${attention} assurance area(s) require RI attention.` : 'All assurance areas are strong or adequate.',
  ];

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
          <View style={{ backgroundColor: position.color + '1F', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ color: position.color, fontSize: 11 }} weight="700">
              {position.label}
            </Text>
          </View>
        </Row>
        <Text muted variant="caption" style={{ marginTop: 4 }}>
          {attention === 0 ? 'No matters require RI attention' : `${attention} matter${attention === 1 ? '' : 's'} require RI attention`}
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
            label={`${goodPct}%`}
            segments={legend.map((l) => ({ value: (l.value || 0.0001), color: l.color }))}
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
