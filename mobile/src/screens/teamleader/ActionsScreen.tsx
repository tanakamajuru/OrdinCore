/**
 * screens/teamleader/ActionsScreen.tsx
 * To do / Done actions with linked concern — matches screenshot 5/8.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { listOf } from '@/api/mappers';
import { Screen, Text, Row, Card, SegmentedControl } from '@/components/ui';
import { BoardHeader } from '@/components/board';

type Action = {
  id: string;
  title: string;
  linkedConcern: string;
  assignee: string;
  due: string;
  dueTone: 'high' | 'medium' | 'low';
  done: boolean;
};

const dueLine = (x?: string, overdue?: boolean) => {
  if (!x) return 'No due date';
  const d = new Date(x);
  const days = Math.floor((d.getTime() - Date.now()) / 86400000);
  if (overdue || days < 0) return 'Overdue';
  return days <= 0 ? 'Due today' : `Due ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
};

const dueToneOf = (a: any): Action['dueTone'] =>
  a.overdue || /high|critical|urgent/i.test(String(a.priority || '')) ? 'high' : /med|mod/i.test(String(a.priority || '')) ? 'medium' : 'low';

export default function ActionsScreen() {
  const { colors, spacing, severityColor, mode } = useTheme();
  const [tab, setTab] = useState('To do');
  const navigation = useNavigation<any>();
  const { data } = useApi<any>('/actions/my');

  const actions: Action[] = listOf(data).map((a: any) => ({
    id: String(a.id),
    title: a.title || a.description || 'Action',
    linkedConcern: a.risk_title || a.domain || a.linked_concern || '—',
    assignee: a.assigned_to_name || a.owner_name || 'Unassigned',
    due: dueLine(a.due_at || a.due_by, a.overdue),
    dueTone: dueToneOf(a),
    done: /complete|done|closed/i.test(String(a.status || '')),
  }));

  const visible = actions.filter((a) => (tab === 'To do' ? !a.done : a.done));

  return (
    <Screen scroll>
      <BoardHeader title="Actions" onBellPress={() => {}} />
      <SegmentedControl options={['To do', 'Done']} value={tab} onChange={setTab} />

      <View style={{ marginTop: spacing.lg }}>
        {visible.length === 0 && <Text muted variant="caption">{tab === 'To do' ? 'Nothing outstanding.' : 'No completed actions yet.'}</Text>}
        {visible.map((a) => (
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
