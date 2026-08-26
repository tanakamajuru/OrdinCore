/**
 * screens/ri/BoardReportsScreen.tsx
 * List of governance reports — matches RI screenshot 7/8.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card } from '@/components/ui';
import { BoardHeader } from '@/components/board';
import { useAppDrawer } from '@/navigation/AppDrawerContext';

type Report = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
};

const reports: Report[] = [
  { id: '1', title: 'RI & Board Assurance Report', subtitle: 'Current organisational assurance position', icon: 'file-text', color: '#2E6FE0' },
  { id: '2', title: 'Monthly Governance Narrative', subtitle: 'Leadership interpretation and movement', icon: 'file-text', color: '#1B8A3E' },
  { id: '3', title: 'Strategic Risk Register', subtitle: 'Material organisational risks', icon: 'file-text', color: '#E08A2B' },
  { id: '4', title: 'Escalations & Effectiveness Report', subtitle: 'Significant responses and outcomes', icon: 'bar-chart-2', color: '#7B5CE0' },
  { id: '5', title: 'Weekly Governance Reviews', subtitle: 'Operational evidence and assurance', icon: 'file-text', color: '#2E6FE0' },
];

export default function BoardReportsScreen() {
  const { colors, spacing, radius } = useTheme();
  const { openDrawer } = useAppDrawer();
  const navigation = useNavigation<any>();

  return (
    <Screen scroll>
      <BoardHeader title="Board Reports" subtitle="Reports for governance and assurance" onMenuPress={() => openDrawer()} />

      {reports.map((r) => (
        <Card
          key={r.id}
          onPress={() => (r.id === '1' ? navigation.navigate('RiBoardAssuranceReport') : undefined)}
          style={{ marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: radius.sm,
              backgroundColor: r.color + '1F',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name={r.icon} size={17} color={r.color} />
          </View>
          <View style={{ flex: 1 } as any}>
            <Text weight="700">{r.title}</Text>
            <Text muted variant="caption">
              {r.subtitle}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
        </Card>
      ))}
    </Screen>
  );
}
