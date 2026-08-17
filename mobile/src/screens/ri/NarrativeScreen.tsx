/**
 * screens/ri/NarrativeScreen.tsx
 * Governance narrative — matches RI screenshot 4/8.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDrawer } from '@/navigation/AppDrawerContext';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { authoritativeTrajectory } from '@/api/mappers';
import { Screen, Text, Row, Card, Button, FilterPill } from '@/components/ui';
import { BoardHeader } from '@/components/board';

const themeDir = (t: any): 'Deteriorating' | 'Stable' | 'Improving' => {
  const dir = t?.trajectory?.direction || t?.direction;
  if (dir) return /deteriorat|increas/i.test(dir) ? 'Deteriorating' : /improv/i.test(dir) ? 'Improving' : 'Stable';
  const rts: any[] = t?.risk_trajectories || t?.risks || [];
  if (rts.some((r) => authoritativeTrajectory(r) === 'Deteriorating')) return 'Deteriorating';
  if (rts.length && rts.every((r) => authoritativeTrajectory(r) === 'Improving')) return 'Improving';
  return 'Stable';
};

export default function NarrativeScreen() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation();
  const { openDrawer } = useAppDrawer();
  const { data: assur } = useApi<any>('/ri/assurance-summary');
  const { data: themeData } = useApi<any>('/interventions/themes');

  const d: any = assur?.data ?? assur ?? {};
  const rags = [d.risks_identified_early, d.escalations_timely, d.actions_effective, d.closures_evidenced];
  const concerns = rags.filter((x: any) => /concern/i.test(String(x))).length;
  const warnings = rags.filter((x: any) => /warn|watch|adequate/i.test(String(x))).length;
  const position = concerns > 0 ? { label: 'CONCERN', color: colors.danger } : warnings >= 1 ? { label: 'WATCH', color: colors.warning } : { label: 'STRONG', color: colors.success };

  const rawThemes: any[] = themeData?.themes ?? themeData?.data ?? (Array.isArray(themeData) ? themeData : []);
  const named = rawThemes.map((t: any) => ({ label: t.name || t.theme || t.label || 'Theme', dir: themeDir(t) }));
  const deteriorating = named.filter((t) => t.dir === 'Deteriorating');
  const improving = named.filter((t) => t.dir === 'Improving');
  const stable = named.filter((t) => t.dir === 'Stable');

  const monthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <Screen scroll>
      <BoardHeader
        title="Narrative"
        subtitle="Governance narrative"
        onMenuPress={() => openDrawer()}
      />

      <FilterPill label={monthLabel} />

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
          <View style={{ backgroundColor: position.color + '1F', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ color: position.color, fontSize: 11 }} weight="700">
              {position.label}
            </Text>
          </View>
        </Row>
        <Text muted style={{ marginBottom: spacing.lg }}>
          {concerns > 0
            ? 'Governance shows areas of concern requiring sustained leadership focus.'
            : warnings > 0
            ? 'Governance is developing with some areas to watch.'
            : 'Governance position is strong across the assurance indicators.'}
        </Text>

        <Section title="Areas of Concern" items={
          deteriorating.length
            ? deteriorating.map((t) => ({ text: `${t.label} deteriorating`, icon: 'circle', color: colors.danger }))
            : [{ text: 'No deteriorating themes this period', icon: 'circle', color: colors.textMuted }]
        } />

        <Section title="Stable" items={
          stable.length
            ? stable.map((t) => ({ text: `${t.label} stable`, icon: 'arrow-right', color: colors.textMuted }))
            : [{ text: 'No stable themes recorded', icon: 'arrow-right', color: colors.textMuted }]
        } />

        <Section title="Areas Improving" items={
          improving.length
            ? improving.map((t) => ({ text: `${t.label} improving`, icon: 'circle', color: colors.success }))
            : [{ text: 'No improving themes this period', icon: 'circle', color: colors.textMuted }]
        } last />

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
