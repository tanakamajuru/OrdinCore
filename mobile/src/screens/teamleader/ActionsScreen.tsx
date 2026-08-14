/**
 * screens/teamleader/ActionsScreen.tsx
 * To do / Done actions with linked concern — matches screenshot 5/8.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card, SegmentedControl } from '@/components/ui';
import { BoardHeader } from '@/components/board';

type Action = {
  id: string;
  title: string;
  linkedConcern: string;
  assignee: string;
  due: string;
  dueTone: 'high' | 'medium' | 'low';
};

const actions: Action[] = [
  { id: '1', title: 'Contact CC to arrange psychiatric appointment', linkedConcern: 'Mental health deterioration', assignee: 'Matt H.', due: 'Due today', dueTone: 'high' },
  { id: '2', title: 'Environmental safety check', linkedConcern: 'House environment', assignee: 'Sarah T.', due: 'Due 12 Aug', dueTone: 'medium' },
  { id: '3', title: 'Medication review with John', linkedConcern: 'Medication refusal', assignee: 'Matt H.', due: 'Due 14 Aug', dueTone: 'medium' },
  { id: '4', title: 'Update risk assessment', linkedConcern: 'Behaviour', assignee: 'Matt H.', due: 'Due 16 Aug', dueTone: 'low' },
];

export default function ActionsScreen() {
  const { colors, spacing, severityColor, mode } = useTheme();
  const [tab, setTab] = useState('To do');
  const navigation = useNavigation<any>();

  return (
    <Screen scroll>
      <BoardHeader title="Actions" onBellPress={() => {}} />
      <SegmentedControl options={['To do', 'Done']} value={tab} onChange={setTab} />

      <View style={{ marginTop: spacing.lg }}>
        {actions.map((a) => (
          <Card
            key={a.id}
            onPress={() => navigation.navigate('ActionDetail', { id: a.id })}
            style={{ marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: severityColor(mode, a.dueTone).fg }}
          >
            <Row justify="space-between" align="flex-start">
              <View style={{ flex: 1 } as any}>
                <Text weight="700">{a.title}</Text>
                <Text muted variant="caption" style={{ marginTop: 4 }}>
                  Linked concern: {a.linkedConcern}
                </Text>
                <Text muted variant="caption" style={{ marginTop: 2 }}>
                  {a.assignee} · {a.due}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textMuted} />
            </Row>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
