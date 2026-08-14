/**
 * screens/teamleader/SignalsScreen.tsx
 * Signals needing review — matches Team Leader screenshot 3/8.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card, SegmentedControl } from '@/components/ui';
import { BoardHeader } from '@/components/board';

type Signal = { id: string; title: string; site: string; time: string; status: 'Needs review' | 'Escalated' | 'Closed' };

const signals: Signal[] = [
  { id: '1', title: 'Medication refusal · John', site: '', time: 'Recorded 08:15', status: 'Needs review' },
  { id: '2', title: 'Environmental safety · House', site: '', time: 'Recorded yesterday', status: 'Escalated' },
  { id: '3', title: 'Mental health deterioration · Bashit', site: '', time: 'Recorded yesterday', status: 'Needs review' },
  { id: '4', title: 'Positive community engagement · John', site: '', time: 'Recorded 2 days ago', status: 'Closed' },
  { id: '5', title: 'Medication side effect · John', site: '', time: 'Recorded 3 days ago', status: 'Closed' },
];

const statusColor: Record<Signal['status'], string> = {
  'Needs review': '#E08A2B',
  Escalated: '#D64545',
  Closed: '#1B8A3E',
};

export default function SignalsScreen() {
  const { colors, spacing } = useTheme();
  const [tab, setTab] = useState('Needs review');
  const navigation = useNavigation<any>();

  const filtered = signals.filter((s) => (tab === 'All' ? true : tab === 'Recent' ? true : tab === 'Escalated' ? s.status === 'Escalated' : s.status === 'Needs review'));

  return (
    <Screen scroll>
      <BoardHeader title="Signals" onBellPress={() => {}} />
      <SegmentedControl options={['Needs review', 'Recent', 'Escalated', 'All']} value={tab} onChange={setTab} />

      <View style={{ marginTop: spacing.lg }}>
        {filtered.map((s) => (
          <Card key={s.id} style={{ marginBottom: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 } as any}>
              <Text weight="700">{s.title}</Text>
              <Text muted variant="caption" style={{ marginTop: 4 }}>
                {s.time}
              </Text>
              <View
                style={{
                  alignSelf: 'flex-start',
                  marginTop: spacing.sm,
                  backgroundColor: statusColor[s.status] + '1F',
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ color: statusColor[s.status], fontSize: 11 }} weight="700">
                  {s.status}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textMuted} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}
