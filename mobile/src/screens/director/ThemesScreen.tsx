/**
 * screens/director/ThemesScreen.tsx
 * "Recurring cross-service themes" — matches screenshot 4/6.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDrawer } from '@/navigation/AppDrawerContext';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { authoritativeTrajectory } from '@/api/mappers';
import { Screen, Text, Row, Card } from '@/components/ui';
import { BoardHeader } from '@/components/board';

type Theme = {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  signals: number;
  services: number;
  trend: 'Increasing' | 'Stable' | 'Improving';
};

const trendColor: Record<Theme['trend'], string> = {
  Increasing: '#D64545',
  Stable: '#667085',
  Improving: '#1B8A3E',
};
const trendIcon: Record<Theme['trend'], keyof typeof Feather.glyphMap> = {
  Increasing: 'trending-up',
  Stable: 'arrow-right',
  Improving: 'trending-down',
};

const themeVisual = (label?: string): { icon: keyof typeof Feather.glyphMap; color: string } => {
  const s = String(label || '').toLowerCase();
  if (/physical|health/.test(s)) return { icon: 'heart', color: '#D64545' };
  if (/safeguard|behaviour|risk/.test(s)) return { icon: 'alert-triangle', color: '#7B5CE0' };
  if (/environment|propert|safety/.test(s)) return { icon: 'home', color: '#1B8A3E' };
  if (/mental|wellbeing/.test(s)) return { icon: 'life-buoy', color: '#2E6FE0' };
  if (/medicat/.test(s)) return { icon: 'plus-circle', color: '#14A19E' };
  return { icon: 'shield', color: '#E08A2B' };
};

// Doctrine exception roll-up: any Deteriorating risk -> Increasing; all Improving -> Improving; else Stable.
const themeTrend = (t: any): Theme['trend'] => {
  const dir = t?.trajectory?.direction || t?.direction;
  if (dir) return /deteriorat|increas/i.test(dir) ? 'Increasing' : /improv/i.test(dir) ? 'Improving' : 'Stable';
  const rts: any[] = t?.risk_trajectories || t?.risks || [];
  if (rts.length) {
    const dirs = rts.map((r) => authoritativeTrajectory(r));
    if (dirs.some((d) => d === 'Deteriorating')) return 'Increasing';
    if (dirs.every((d) => d === 'Improving')) return 'Improving';
  }
  return 'Stable';
};

export default function ThemesScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();
  const { openDrawer } = useAppDrawer();
  const { data } = useApi<any>('/interventions/themes');

  const raw: any[] = data?.themes ?? data?.data ?? (Array.isArray(data) ? data : []);
  const themes: Theme[] = raw.map((t: any, i: number) => {
    const label = t.name || t.theme || t.label || t.domain || 'Theme';
    const v = themeVisual(label);
    return {
      id: String(t.id ?? i),
      label,
      icon: v.icon,
      color: v.color,
      signals: Number(t.signal_count ?? t.signals ?? t.total_signals ?? 0),
      services: Number(t.service_count ?? t.services ?? t.house_count ?? 0),
      trend: themeTrend(t),
    };
  });

  return (
    <Screen scroll>
      <BoardHeader title="Themes" onMenuPress={() => openDrawer()} onBellPress={() => {}} />

      <Row gap={6} style={{ marginBottom: 2 }}>
        <Text variant="subtitle" style={{ fontSize: 16 }}>
          Recurring cross-service themes
        </Text>
        <Feather name="info" size={14} color={colors.textMuted} />
      </Row>
      <Text muted variant="caption" style={{ marginBottom: spacing.md }}>
        Themes occurring across multiple services
      </Text>

      {themes.length === 0 && <Text muted variant="caption" style={{ marginBottom: spacing.md }}>No recurring cross-service themes yet.</Text>}
      {themes.map((t) => (
        <Card key={t.id} style={{ marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.sm,
              backgroundColor: t.color + '1F',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name={t.icon} size={18} color={t.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text weight="700">{t.label}</Text>
            <Text muted variant="caption">
              {t.signals} signals · {t.services} services
            </Text>
          </View>
          <Row gap={4}>
            <Feather name={trendIcon[t.trend]} size={13} color={trendColor[t.trend]} />
            <Text style={{ color: trendColor[t.trend] }} variant="caption" weight="700">
              {t.trend}
            </Text>
          </Row>
        </Card>
      ))}

      <Card style={{ backgroundColor: colors.surfaceAlt, borderWidth: 0 }}>
        <Row gap={spacing.sm} align="flex-start">
          <Feather name="shield" size={16} color={colors.primary} />
          <Text variant="caption" style={{ flex: 1 }}>
            <Text weight="700" variant="caption">
              How themes are identified{'\n'}
            </Text>
            Themes appear here when the same concern is recorded across two or more services and shows a recurring trend or pattern.
          </Text>
        </Row>
      </Card>
    </Screen>
  );
}
