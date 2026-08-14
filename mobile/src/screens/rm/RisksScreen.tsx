/**
 * screens/rm/RisksScreen.tsx
 * Active risk picture with severity, trajectory and linked signals —
 * matches RM Mobile screenshot 3/8.
 */
import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card, FilterPill, Chip } from '@/components/ui';
import { BoardHeader } from '@/components/board';

type Risk = {
  id: string;
  title: string;
  site: string;
  tone: 'high' | 'medium' | 'low';
  trend: 'Deteriorating' | 'Stable' | 'Improving';
  linkedSignals: number;
  lastSignal: string;
  decisionRequired?: boolean;
};

const risks: Risk[] = [
  {
    id: '1',
    title: 'Mental Health Stability – Bashit A',
    site: 'Grafton Road',
    tone: 'high',
    trend: 'Deteriorating',
    linkedSignals: 3,
    lastSignal: 'Last signal today',
    decisionRequired: true,
  },
  {
    id: '2',
    title: 'Self-Care – Bashit A',
    site: '24 Hurst Grove',
    tone: 'medium',
    trend: 'Stable',
    linkedSignals: 2,
    lastSignal: 'Last signal 2d ago',
  },
  {
    id: '3',
    title: 'Engagement – Bashit A',
    site: 'Grafton Road',
    tone: 'low',
    trend: 'Improving',
    linkedSignals: 1,
    lastSignal: 'Last signal 5d ago',
  },
  {
    id: '4',
    title: 'Medication Management – Bashit A',
    site: '24 Hurst Grove',
    tone: 'medium',
    trend: 'Stable',
    linkedSignals: 2,
    lastSignal: 'Last signal 3d ago',
  },
];

const trendIcon: Record<Risk['trend'], keyof typeof Feather.glyphMap> = {
  Deteriorating: 'trending-up',
  Stable: 'arrow-right',
  Improving: 'trending-down',
};

export default function RisksScreen() {
  const { colors, spacing, radius, severityColor, mode } = useTheme();

  return (
    <Screen scroll>
      <BoardHeader title="Risks" onBellPress={() => {}} />

      <Row gap={spacing.sm} style={{ marginBottom: spacing.lg }}>
        <FilterPill label="All Sites" />
        <FilterPill label="Open" />
        <FilterPill label="High, Med, Low" />
      </Row>

      {risks.map((r) => {
        const t = severityColor(mode, r.tone);
        return (
          <Card
            key={r.id}
            style={{
              marginBottom: spacing.md,
              borderColor: r.decisionRequired ? colors.danger : colors.border,
            }}
          >
            <Row justify="space-between" align="flex-start">
              <View style={{ flex: 1 }}>
                <Text weight="700">{r.title}</Text>
                <Text muted variant="caption" style={{ marginTop: 2 }}>
                  {r.site}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textMuted} />
            </Row>

            <Row gap={spacing.sm} style={{ marginTop: spacing.sm }}>
              <Chip label={r.tone === 'high' ? 'HIGH' : r.tone === 'medium' ? 'MEDIUM' : 'LOW'} tone={r.tone} size="sm" />
              <Row gap={4}>
                <Feather name={trendIcon[r.trend]} size={12} color={t.fg} />
                <Text style={{ color: t.fg }} variant="caption" weight="700">
                  {r.trend}
                </Text>
              </Row>
            </Row>

            <Text muted variant="caption" style={{ marginTop: spacing.sm }}>
              {r.linkedSignals} linked signal{r.linkedSignals > 1 ? 's' : ''} · {r.lastSignal}
            </Text>

            {r.decisionRequired ? (
              <Row gap={4} style={{ marginTop: spacing.sm }}>
                <Feather name="alert-circle" size={13} color={colors.danger} />
                <Text style={{ color: colors.danger }} variant="caption" weight="700">
                  Decision required
                </Text>
              </Row>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}
