/**
 * screens/director/ThemesScreen.tsx
 * "Recurring cross-service themes" — matches screenshot 4/6.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
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

const themes: Theme[] = [
  { id: '1', label: 'Physical Health', icon: 'heart', color: '#D64545', signals: 12, services: 3, trend: 'Increasing' },
  { id: '2', label: 'Environmental Safety', icon: 'shield', color: '#E08A2B', signals: 9, services: 2, trend: 'Increasing' },
  { id: '3', label: 'Behaviour & Risk', icon: 'alert-triangle', color: '#7B5CE0', signals: 6, services: 2, trend: 'Stable' },
  { id: '4', label: 'Environment & Property', icon: 'home', color: '#1B8A3E', signals: 5, services: 2, trend: 'Improving' },
  { id: '5', label: 'Mental Health Stability', icon: 'life-buoy', color: '#2E6FE0', signals: 4, services: 2, trend: 'Stable' },
  { id: '6', label: 'Medication', icon: 'plus-circle', color: '#14A19E', signals: 2, services: 2, trend: 'Improving' },
];

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

export default function ThemesScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();

  return (
    <Screen scroll>
      <BoardHeader title="Themes" onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())} onBellPress={() => {}} />

      <Row gap={6} style={{ marginBottom: 2 }}>
        <Text variant="subtitle" style={{ fontSize: 16 }}>
          Recurring cross-service themes
        </Text>
        <Feather name="info" size={14} color={colors.textMuted} />
      </Row>
      <Text muted variant="caption" style={{ marginBottom: spacing.md }}>
        Themes occurring across multiple services
      </Text>

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
