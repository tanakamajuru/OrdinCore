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
import { Screen, Text, Row, Card } from '@/components/ui';
import { BoardHeader } from '@/components/board';

const summary = [
  { label: 'Governance reviews current', value: '92%', ok: true },
  { label: 'Leadership narratives current', value: '100%', ok: true },
  { label: 'Critical risks have decisions', value: '100%', ok: true },
  { label: 'Escalations within threshold', value: '1 exception', ok: false },
  { label: 'Effectiveness reviews complete', value: '88%', ok: true },
  { label: 'Evidence gaps', value: '2', ok: false },
];

const gaps = [
  { label: 'Workforce audit', status: 'Overdue', tone: 'high' as const },
  { label: 'Fire safety audit', status: 'Due in 10 days', tone: 'medium' as const },
];

export default function ReadinessScreen() {
  const { colors, spacing, radius, severityColor, mode } = useTheme();
  const navigation = useNavigation();
  const { openDrawer } = useAppDrawer();

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
            92%
          </Text>
          <View style={{ backgroundColor: colors.success + '1F', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ color: colors.success, fontSize: 12 }} weight="700">
              Good
            </Text>
          </View>
        </Row>
        <Text muted variant="caption" style={{ marginTop: 4 }}>
          Evidence position is strong
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
