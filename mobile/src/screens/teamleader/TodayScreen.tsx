/**
 * screens/teamleader/TodayScreen.tsx
 * Morning Meeting overview — matches Team Leader screenshot 1/8.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, Text, Row, Card, Button } from '@/components/ui';
import { Metrics } from '@/components/board';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/auth/AuthContext';
import { useAppDrawer } from '@/navigation/AppDrawerContext';
import { useApi } from '@/api/useApi';
import { listOf } from '@/api/mappers';

const domainOf = (s: any) => (Array.isArray(s.risk_domain) ? s.risk_domain[0] : s.risk_domain || s.governance_domain || s.category || 'Signal');
const isToday = (x?: string) => !!x && new Date(x).toDateString() === new Date().toDateString();
const submitted = (s: any) => { const dt = s.created_at || s.entry_date; if (!dt) return ''; const d = new Date(dt); return isToday(dt) ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : Math.floor((Date.now() - d.getTime()) / 86400000) === 1 ? 'Yesterday' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); };

export default function TodayScreen() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { openDrawer } = useAppDrawer();
  const { data: mw } = useApi<any>('/my-work');
  const { data: sigData } = useApi<any>('/pulses?limit=100');
  const { data: actData } = useApi<any>('/actions/my');

  const items: any[] = mw?.items ?? mw?.data?.items ?? [];
  const byKey = (k: string) => items.find((i: any) => i.key === k);
  const n = (v: any) => Number(v || 0);
  const signals = listOf(sigData);
  const newToday = signals.filter((s: any) => isToday(s.entry_date || s.created_at)).length;
  const concerns = signals.filter((s: any) => isToday(s.entry_date || s.created_at) && /high|critical/i.test(String(s.severity || ''))).length;
  const requiresAttention = n(byKey('signals')?.count) + n(byKey('escalations')?.count);
  const recentSignals = signals.slice(0, 4).map((s: any) => ({ label: `${domainOf(s)}${s.related_person ? ` · ${s.related_person}` : ''}`, time: submitted(s) }));
  const openActions = listOf(actData).filter((a: any) => !/complete|done|cancel/i.test(a.status || ''));
  const nextAction = [...openActions].sort((a: any, b: any) => new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime())[0];
  const house = (user as any)?.house_name || (user as any)?.assigned_house_name || 'Your service';
  const dateLine = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <Screen scroll>
      <Row justify="space-between" style={{ marginBottom: spacing.lg, marginTop: spacing.sm }}>
        <Row gap={spacing.md} align="center">
          <Feather name="menu" size={22} color={colors.text} onPress={() => openDrawer()} />
          <Logo size={28} />
        </Row>
        <Feather name="bell" size={20} color={colors.text} />
      </Row>

      <Text variant="title" style={{ fontSize: 22 }}>
        Morning Meeting
      </Text>
      <Text muted variant="caption" style={{ marginBottom: spacing.lg }}>
        {house} · {dateLine}
      </Text>

      <Text weight="700" style={{ marginBottom: spacing.sm }}>
        Since last review
      </Text>
      <Metrics
        columns={2}
        items={[
          { label: 'New today', value: newToday, tone: 'info' },
          { label: 'Requires attention', value: requiresAttention, tone: 'medium' },
        ]}
      />
      <Card style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <Text variant="title" style={{ color: concerns > 0 ? colors.warning : colors.success }}>
          {concerns}
        </Text>
        <Text muted variant="caption">
          high / critical today
        </Text>
      </Card>

      <Text weight="700" style={{ marginBottom: 4 }}>
        Priority
      </Text>
      <Card style={{ backgroundColor: colors.warning + '15', borderWidth: 0, marginBottom: spacing.lg }}>
        <Text>{concerns > 0 ? `${concerns} high/critical concern${concerns === 1 ? '' : 's'} recorded today — review promptly.` : 'No high-priority concerns recorded today.'}</Text>
      </Card>

      <Text weight="700" style={{ marginBottom: spacing.sm }}>
        Required today
      </Text>
      <Card onPress={() => navigation.navigate('Actions')} style={{ marginBottom: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Row gap={spacing.sm}>
          <Feather name="clock" size={15} color={colors.text} />
          <Text weight="600">{nextAction ? nextAction.title : 'No actions due'}</Text>
        </Row>
        <Row gap={6}>
          {nextAction?.due_date ? (
            <Text muted variant="caption">Due {new Date(nextAction.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Text>
          ) : null}
          <Feather name="chevron-right" size={14} color={colors.textMuted} />
        </Row>
      </Card>

      <Text weight="700" style={{ marginBottom: spacing.sm }}>
        Recent signals
      </Text>
      <Card style={{ marginBottom: spacing.xl }}>
        {recentSignals.map((s, i) => (
          <Row
            key={s.label}
            justify="space-between"
            style={{ paddingVertical: 6, borderBottomWidth: i < recentSignals.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
          >
            <Text variant="caption">{s.label}</Text>
            <Text muted variant="caption">
              {s.time}
            </Text>
          </Row>
        ))}
      </Card>

      <Button label="+  Record signal" onPress={() => navigation.navigate('RecordSignal')} />
    </Screen>
  );
}
