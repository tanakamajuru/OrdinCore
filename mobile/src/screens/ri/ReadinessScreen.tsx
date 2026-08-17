/**
 * screens/ri/ReadinessScreen.tsx
 * Governance evidence readiness — matches RI screenshot 3/8.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDrawer } from '@/navigation/AppDrawerContext';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { Screen, Text, Row, Card } from '@/components/ui';
import { BoardHeader } from '@/components/board';

const ragOk = (v: any) => /good|strong/i.test(String(v || ''));
const ragWord = (v: any) => String(v || '—');

export default function ReadinessScreen() {
  const { colors, spacing, radius, severityColor, mode } = useTheme();
  const navigation = useNavigation();
  const { openDrawer } = useAppDrawer();
  const { data: assur } = useApi<any>('/ri/assurance-summary');
  const { data: wr } = useApi<any>('/rm/weekly-readiness');

  const d: any = assur?.data ?? assur ?? {};
  const w: any = wr?.data ?? wr ?? {};
  const n = (v: any) => Number(v || 0);

  const summary = [
    { label: 'Risks identified early', value: ragWord(d.risks_identified_early), ok: ragOk(d.risks_identified_early) },
    { label: 'Escalations timely', value: ragWord(d.escalations_timely), ok: ragOk(d.escalations_timely) },
    { label: 'Actions effective', value: ragWord(d.actions_effective), ok: ragOk(d.actions_effective) },
    { label: 'Closures evidenced', value: ragWord(d.closures_evidenced), ok: ragOk(d.closures_evidenced) },
    { label: 'Reopened risks', value: `${n(d.reopened_risks)}`, ok: n(d.reopened_risks) === 0 },
    { label: 'Overdue reviews', value: `${n(d.overdue_reviews)}`, ok: n(d.overdue_reviews) === 0 },
  ];

  // Overall readiness = share of the four RAG indicators that are Good/Strong.
  const rags = [d.risks_identified_early, d.escalations_timely, d.actions_effective, d.closures_evidenced];
  const goods = rags.filter(ragOk).length;
  const overallPct = Math.round((goods / 4) * 100);
  const concerns = rags.filter((x: any) => /concern/i.test(String(x))).length;
  const band = concerns > 0 ? { label: 'Concern', color: colors.danger } : goods >= 3 ? { label: 'Good', color: colors.success } : { label: 'Watch', color: colors.warning };

  const gaps = [
    n(d.overdue_reviews) > 0 ? { label: 'Overdue governance reviews', status: `${n(d.overdue_reviews)} overdue`, tone: 'high' as const } : null,
    n(d.reopened_risks) > 0 ? { label: 'Reopened risks', status: `${n(d.reopened_risks)} to re-evidence`, tone: 'medium' as const } : null,
    w && w.ready === false ? { label: 'Weekly governance', status: 'Not ready', tone: 'medium' as const } : null,
  ].filter(Boolean) as { label: string; status: string; tone: 'high' | 'medium' }[];

  return (
    <Screen scroll>
      <BoardHeader
        title="Readiness"
        subtitle="Governance evidence readiness"
        onMenuPress={() => openDrawer()}
      />

      <Card style={{ marginBottom: spacing.lg }}>
        <Text weight="700" variant="subtitle" style={{ fontSize: 16 }}>
          Governance Evidence Readiness
        </Text>
        <Text muted variant="caption" style={{ marginBottom: spacing.sm }}>
          Overall readiness
        </Text>
        <Row gap={spacing.sm} align="center">
          <Text variant="title" style={{ fontSize: 32 }}>
            {overallPct}%
          </Text>
          <View style={{ backgroundColor: band.color + '1F', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ color: band.color, fontSize: 12 }} weight="700">
              {band.label}
            </Text>
          </View>
        </Row>
        <Text muted variant="caption" style={{ marginTop: 4 }}>
          {goods} of 4 assurance indicators strong
        </Text>
      </Card>

      <Text variant="subtitle" style={{ fontSize: 16, marginBottom: spacing.sm }}>
        Readiness Summary
      </Text>
      <Card style={{ marginBottom: spacing.lg }}>
        {summary.map((s, i) => (
          <Row
            key={s.label}
            justify="space-between"
            style={{ paddingVertical: 8, borderBottomWidth: i < summary.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
          >
            <Text variant="caption">{s.label}</Text>
            <Row gap={4}>
              <Text variant="caption" weight="700">
                {s.value}
              </Text>
              <Feather name={s.ok ? 'check-circle' : 'alert-triangle'} size={14} color={s.ok ? colors.success : colors.warning} />
            </Row>
          </Row>
        ))}
      </Card>

      <Text variant="subtitle" style={{ fontSize: 16, marginBottom: spacing.sm }}>
        Top Evidence Gaps
      </Text>
      <Card>
        {gaps.length === 0 && <Text muted variant="caption">No evidence gaps — assurance position is complete.</Text>}
        {gaps.map((g, i) => {
          const t = severityColor(mode, g.tone);
          return (
            <Row
              key={g.label}
              justify="space-between"
              style={{ paddingVertical: 8, borderBottomWidth: i < gaps.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
            >
              <Text variant="caption">{g.label}</Text>
              <View style={{ backgroundColor: t.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ color: t.fg, fontSize: 11 }} weight="700">
                  {g.status}
                </Text>
              </View>
            </Row>
          );
        })}
      </Card>
    </Screen>
  );
}
