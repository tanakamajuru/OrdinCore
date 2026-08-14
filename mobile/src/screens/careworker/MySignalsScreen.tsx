/**
 * screens/careworker/MySignalsScreen.tsx
 * Filterable list of submitted signals — matches Care Worker screenshot 4.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { roleAccent } from '@/theme/roleAccents';
import { Screen, Text, Row, Card, SegmentedControl } from '@/components/ui';
import { BoardHeader } from '@/components/board';

type Signal = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  title: string;
  person: string;
  submitted: string;
  status: 'Under review' | 'Open' | 'Action assigned' | 'Actioned' | 'Closed';
};

const signals: Signal[] = [
  { id: '1', icon: 'heart', color: '#7B5CE0', title: 'Mental Health & Wellbeing', person: 'John S.', submitted: 'Submitted today, 09:42', status: 'Under review' },
  { id: '2', icon: 'home', color: '#1B8A3E', title: 'Environmental', person: 'Bedford House', submitted: 'Submitted yesterday, 14:20', status: 'Action assigned' },
  { id: '3', icon: 'user', color: '#E08A2B', title: 'Safeguarding', person: 'Mary P.', submitted: 'Submitted 2 days ago', status: 'Open' },
  { id: '4', icon: 'droplet', color: '#2E6FE0', title: 'Medication', person: 'John S.', submitted: 'Submitted 3 days ago', status: 'Actioned' },
  { id: '5', icon: 'star', color: '#E08A2B', title: 'Positive Engagement', person: 'Mary P.', submitted: 'Submitted 5 days ago', status: 'Closed' },
];

const statusColor: Record<Signal['status'], string> = {
  'Under review': '#7B5CE0',
  Open: '#E08A2B',
  'Action assigned': '#1B8A3E',
  Actioned: '#667085',
  Closed: '#667085',
};

export default function MySignalsScreen() {
  const { colors, spacing } = useTheme();
  const [tab, setTab] = useState('All');

  const filtered = signals.filter((s) => {
    if (tab === 'All') return true;
    if (tab === 'Open') return s.status === 'Open' || s.status === 'Under review';
    if (tab === 'Actioned') return s.status === 'Actioned' || s.status === 'Action assigned';
    if (tab === 'Closed') return s.status === 'Closed';
    return true;
  });

  return (
    <Screen scroll>
      <BoardHeader title="My signals" onBellPress={() => {}} />

      <SegmentedControl options={['All', 'Open', 'Actioned', 'Closed']} value={tab} onChange={setTab} />

      <View style={{ marginTop: spacing.lg }}>
        {filtered.map((s) => (
          <Card key={s.id} style={{ marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Feather name={s.icon} size={18} color={s.color} />
            <View style={{ flex: 1 } as any}>
              <Text weight="700">{s.title}</Text>
              <Text muted variant="caption">
                {s.person}
              </Text>
              <Text muted variant="caption">
                {s.submitted}
              </Text>
            </View>
            <View
              style={{
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
          </Card>
        ))}
      </View>
    </Screen>
  );
}
