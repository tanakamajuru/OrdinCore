/**
 * screens/rm/SiteOverviewScreen.tsx
 * Per-site metric grid — matches RM Mobile "Site Overview" screen.
 */
import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card } from '@/components/ui';
import { BoardHeader, Metrics } from '@/components/board';

const sites = [
  {
    name: 'Grafton Road',
    tone: 'high' as const,
    metrics: [
      { label: 'Open risks', value: 2, tone: 'success' as const },
      { label: 'Deteriorating', value: 1, tone: 'high' as const },
      { label: 'Escalation awaiting response', value: 1, tone: 'high' as const },
      { label: 'Overdue action', value: 2, tone: 'medium' as const },
      { label: 'Signals awaiting review', value: 12, tone: 'info' as const },
    ],
  },
  {
    name: '24 Hurst Grove',
    tone: 'medium' as const,
    metrics: [
      { label: 'Open risks', value: 4, tone: 'success' as const },
      { label: 'High risks', value: 2, tone: 'high' as const },
      { label: 'Escalation awaiting response', value: 1, tone: 'high' as const },
      { label: 'Overdue actions', value: 2, tone: 'medium' as const },
      { label: 'Signals awaiting review', value: 8, tone: 'info' as const },
    ],
  },
];

export default function SiteOverviewScreen() {
  const { colors, spacing, severityColor, mode } = useTheme();

  return (
    <Screen scroll>
      <BoardHeader title="Site Overview" onBellPress={() => {}} />

      {sites.map((site) => {
        const t = severityColor(mode, site.tone);
        return (
          <View key={site.name} style={{ marginBottom: spacing.xl }}>
            <Row justify="space-between" style={{ marginBottom: spacing.sm }}>
              <Text variant="subtitle" style={{ fontSize: 16 }}>
                {site.name}
              </Text>
              <View style={{ backgroundColor: t.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ color: t.fg, fontSize: 12 }} weight="700">
                  {site.tone === 'high' ? 'High' : 'Medium'}
                </Text>
              </View>
            </Row>
            <Row wrap gap={spacing.md}>
              {site.metrics.map((m) => {
                const mt = severityColor(mode, m.tone);
                return (
                  <View
                    key={m.label}
                    style={{
                      width: '31%',
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      padding: spacing.sm,
                    }}
                  >
                    <Text style={{ color: mt.fg }} variant="title" weight="800">
                      {m.value}
                    </Text>
                    <Text muted variant="caption" style={{ fontSize: 11 }}>
                      {m.label}
                    </Text>
                  </View>
                );
              })}
            </Row>
          </View>
        );
      })}
    </Screen>
  );
}
