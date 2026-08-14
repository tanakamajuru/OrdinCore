/**
 * screens/careworker/MyActionsScreen.tsx
 * To do / Completed action checklist — matches Care Worker screenshot 5.
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
  location: string;
  due: string;
  urgent?: boolean;
  tagLabel: string;
  tagColor: string;
  description: string;
  done?: boolean;
};

const actions: Action[] = [
  {
    id: '1',
    title: 'Check bedroom smoke detector',
    location: 'Bedford House',
    due: 'Due today, 10:00',
    urgent: true,
    tagLabel: 'Environmental signal',
    tagColor: '#1B8A3E',
    description: 'Check the smoke detector in the bedroom and ensure it is working correctly.',
  },
  {
    id: '2',
    title: 'Update care plan review',
    location: 'Mary P.',
    due: 'Due tomorrow, 12:00',
    tagLabel: 'Care planning signal',
    tagColor: '#7B5CE0',
    description: 'Review and update the care plan following recent signal activity.',
  },
];

export default function MyActionsScreen() {
  const { colors, spacing, radius } = useTheme();
  const [tab, setTab] = useState('To do');
  const navigation = useNavigation<any>();

  const visible = actions.filter((a) => (tab === 'To do' ? !a.done : a.done));

  return (
    <Screen scroll>
      <BoardHeader title="My actions" onBellPress={() => {}} />
      <SegmentedControl options={['To do', 'Completed']} value={tab} onChange={setTab} />

      <View style={{ marginTop: spacing.lg }}>
        {visible.map((a) => (
          <Card
            key={a.id}
            onPress={() => navigation.navigate('ActionDetails', { id: a.id })}
            style={{ marginBottom: spacing.md }}
          >
            <Row gap={spacing.md} align="flex-start">
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  borderWidth: 2,
                  borderColor: colors.border,
                  marginTop: 2,
                }}
              />
              <View style={{ flex: 1 } as any}>
                <Text weight="700">{a.title}</Text>
                <Text muted variant="caption" style={{ marginTop: 2 }}>
                  {a.location}
                </Text>
                <Row gap={6} style={{ marginTop: spacing.sm }}>
                  <Feather name="clock" size={12} color={a.urgent ? colors.warning : colors.textMuted} />
                  <Text style={{ color: a.urgent ? colors.warning : colors.textMuted }} variant="caption" weight="600">
                    {a.due}
                  </Text>
                </Row>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: spacing.sm,
                    backgroundColor: a.tagColor + '1F',
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ color: a.tagColor, fontSize: 11 }} weight="700">
                    {a.tagLabel}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textMuted} />
            </Row>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
