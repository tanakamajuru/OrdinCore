/**
 * screens/teamleader/SignalsScreen.tsx
 * Signals needing review — matches Team Leader screenshot 3/8.
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

type Signal = { id: string; title: string; site: string; time: string; status: 'Needs review' | 'Escalated' | 'Closed'; ts: number };

const statusColor: Record<Signal['status'], string> = {
  'Needs review': '#E08A2B',
  Escalated: '#D64545',
  Closed: '#1B8A3E',
};

const recordedLine = (x?: string) => {
  if (!x) return 'Recorded';
  const days = Math.floor((Date.now() - new Date(x).getTime()) / 86400000);
  const t = new Date(x).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return days <= 0 ? `Recorded ${t}` : days === 1 ? 'Recorded yesterday' : `Recorded ${days} days ago`;
};

const sigStatus = (p: any): Signal['status'] => {
  const s = String(p.status || p.decision || '').toLowerCase();
  if (/escalat/.test(s)) return 'Escalated';
  if (/closed|reviewed|linked/.test(s)) return 'Closed';
  return 'Needs review';
};

export default function SignalsScreen() {
  const { colors, spacing } = useTheme();
  const { openDrawer } = useAppDrawer();
  const [tab, setTab] = useState('Needs review');
  const navigation = useNavigation<any>();
  const { data } = useApi<any>('/pulses?limit=150');

  const signals: Signal[] = listOf(data).map((p: any) => ({
    id: String(p.id),
    title: `${p.domain || p.pillar || p.theme || 'Signal'}${(p.service_user_name || p.related_person) ? ` · ${p.service_user_name || p.related_person}` : ''}`,
    site: p.house_name || '',
    time: recordedLine(p.created_at || p.entry_date),
    status: sigStatus(p),
    ts: p.created_at ? new Date(p.created_at).getTime() : 0,
  }));

  const weekAgo = Date.now() - 7 * 86400000;
  const filtered = signals.filter((s) =>
    tab === 'All' ? true : tab === 'Recent' ? s.ts >= weekAgo : tab === 'Escalated' ? s.status === 'Escalated' : s.status === 'Needs review'
  );

  return (
    <Screen scroll>
      <BoardHeader title="Signals" onMenuPress={() => openDrawer()} onBellPress={() => {}} />
      <SegmentedControl options={['Needs review', 'Recent', 'Escalated', 'All']} value={tab} onChange={setTab} />

      <View style={{ marginTop: spacing.lg }}>
        {filtered.length === 0 && <Text muted variant="caption">No signals in this view.</Text>}
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
