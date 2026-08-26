/**
 * screens/careworker/MyActionsScreen.tsx
 * To do / Completed action checklist — matches Care Worker screenshot 5.
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
import { useAppDrawer } from '@/navigation/AppDrawerContext';

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

const dueLine = (x?: string, overdue?: boolean) => {
  if (!x) return 'No due date';
  const d = new Date(x);
  const days = Math.floor((d.getTime() - Date.now()) / 86400000);
  const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (overdue || days < 0) return `Overdue · was due ${d.toLocaleDateString()}`;
  return days <= 0 ? `Due today, ${t}` : days === 1 ? `Due tomorrow, ${t}` : `Due in ${days} days`;
};

const tagColorFor = (d?: string): string => {
  const s = String(d || '').toLowerCase();
  if (/safeguard/.test(s)) return '#E08A2B';
  if (/environment/.test(s)) return '#1B8A3E';
  if (/medicat/.test(s)) return '#2E6FE0';
  if (/care plan|wellbeing|mental/.test(s)) return '#7B5CE0';
  return '#2E6FE0';
};

const isDone = (a: any) => /complete|done|closed/i.test(String(a.status || ''));

export default function MyActionsScreen() {
  const { colors, spacing, radius } = useTheme();
  const { openDrawer } = useAppDrawer();
  const [tab, setTab] = useState('To do');
  const navigation = useNavigation<any>();
  const { data } = useApi<any>('/actions/my');

  const actions: Action[] = listOf(data).map((a: any) => {
    const domain = a.domain || a.risk_title || a.source || a.signal_domain;
    return {
      id: String(a.id),
      title: a.title || a.description || 'Action',
      location: a.house_name || a.service_user_name || a.service_name || '—',
      due: dueLine(a.due_at || a.due_by, a.overdue),
      urgent: !!(a.overdue || /high|critical|urgent/i.test(String(a.priority || ''))),
      tagLabel: domain ? `${domain} signal` : 'Governance action',
      tagColor: tagColorFor(domain),
      description: a.description || a.title || '',
      done: isDone(a),
    };
  });

  const visible = actions.filter((a) => (tab === 'To do' ? !a.done : a.done));

  return (
    <Screen scroll>
      <BoardHeader title="My actions" onMenuPress={() => openDrawer()} onBellPress={() => {}} />
      <SegmentedControl options={['To do', 'Completed']} value={tab} onChange={setTab} />

      <View style={{ marginTop: spacing.lg }}>
        {visible.length === 0 && <Text muted variant="caption">{tab === 'To do' ? 'Nothing to do right now.' : 'No completed actions yet.'}</Text>}
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
