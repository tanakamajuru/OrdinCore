/**
 * screens/careworker/MySignalsScreen.tsx
 * Filterable list of submitted signals — matches Care Worker screenshot 4.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/auth/AuthContext';
import { useApi } from '@/api/useApi';
import { listOf } from '@/api/mappers';
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

const statusColor: Record<Signal['status'], string> = {
  'Under review': '#7B5CE0',
  Open: '#E08A2B',
  'Action assigned': '#1B8A3E',
  Actioned: '#667085',
  Closed: '#667085',
};

// Domain -> icon/colour, so each signal reads at a glance (reference visual language).
const domainVisual = (d?: string): { icon: keyof typeof Feather.glyphMap; color: string } => {
  const s = String(d || '').toLowerCase();
  if (/safeguard/.test(s)) return { icon: 'user', color: '#E08A2B' };
  if (/medicat/.test(s)) return { icon: 'droplet', color: '#2E6FE0' };
  if (/environment|propert/.test(s)) return { icon: 'home', color: '#1B8A3E' };
  if (/mental|wellbeing|behaviour/.test(s)) return { icon: 'heart', color: '#7B5CE0' };
  if (/positive|engage/.test(s)) return { icon: 'star', color: '#E08A2B' };
  return { icon: 'activity', color: '#2E6FE0' };
};

const submittedLine = (x?: string) => {
  if (!x) return 'Submitted';
  const days = Math.floor((Date.now() - new Date(x).getTime()) / 86400000);
  const t = new Date(x).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return days <= 0 ? `Submitted today, ${t}` : days === 1 ? `Submitted yesterday, ${t}` : `Submitted ${days} days ago`;
};

const statusOf = (p: any): Signal['status'] => {
  const s = String(p.status || p.decision || '').toLowerCase();
  if (/closed/.test(s)) return 'Closed';
  if (/monitor/.test(s)) return 'Action assigned';
  if (/reviewed|linked|action/.test(s)) return 'Actioned';
  if (/open/.test(s)) return 'Open';
  return 'Under review';
};

export default function MySignalsScreen() {
  const { colors, spacing } = useTheme();
  const { user } = useAuth();
  const uid = user?.id || user?.user_id;
  const [tab, setTab] = useState('All');
  const { data } = useApi<any>(uid ? `/pulses?created_by=${uid}&limit=100` : '/pulses?limit=100');

  const signals: Signal[] = listOf(data).map((p: any) => {
    const v = domainVisual(p.domain || p.pillar || p.theme);
    return {
      id: String(p.id),
      icon: v.icon,
      color: v.color,
      title: p.domain || p.pillar || p.theme || p.signal_type || 'Signal',
      person: p.service_user_name || p.person || p.house_name || p.service_name || '—',
      submitted: submittedLine(p.created_at || p.entry_date),
      status: statusOf(p),
    };
  });

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
        {filtered.length === 0 && <Text muted variant="caption">No signals to show.</Text>}
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
