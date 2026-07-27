import React from 'react';
import { View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/api/useApi';
import { radius } from '@/theme/tokens';
import { Text, Row } from './ui';

type Outstanding = { open: number; overdue: number; due_today: number; oldest_overdue_days: number | null };
const unwrap = (v: any): Outstanding | null => (v && typeof v === 'object' ? (v.data ?? v) : null);

// Daily Outstanding Actions banner — the mobile half of the web OutstandingActionsBanner.
// Surfaces the signed-in user's own overdue / due-today work so the backlog is unmissable.
// Read-only and non-blocking (safeguarding must never be blocked); `onPress` opens My Actions.
export function OutstandingBanner({ onPress }: { onPress?: () => void }) {
  const { c } = useTheme();
  const { data } = useApi<any>('/governance/my-outstanding');
  const d = unwrap(data);
  if (!d || (d.overdue === 0 && d.due_today === 0)) return null;

  const urgent = d.overdue > 0;
  const col = urgent ? c.sevCrit : c.sevMod;
  const plural = (n: number) => (n === 1 ? '' : 's');

  const headline = [
    d.overdue > 0
      ? `${d.overdue} overdue action${plural(d.overdue)}${d.oldest_overdue_days != null ? ` · oldest ${d.oldest_overdue_days} day${plural(d.oldest_overdue_days)}` : ''}`
      : '',
    d.due_today > 0 ? `${d.due_today} due today` : '',
  ].filter(Boolean).join(' · ');

  const Wrap: any = onPress ? Pressable : View;
  return (
    <Wrap onPress={onPress} style={{ backgroundColor: col + '18', borderWidth: 1.5, borderColor: col + '66', borderRadius: radius.lg, padding: 13 }}>
      <Row style={{ alignItems: 'flex-start' }} gap={11}>
        <Feather name={urgent ? 'alert-triangle' : 'clock'} size={20} color={col} />
        <View style={{ flex: 1 }}>
          <Text size={13.5} weight="700" color={col}>{headline}</Text>
          <Text size={12} muted style={{ marginTop: 3 }}>
            Please complete or update these before taking on new routine work.{onPress ? ' Tap to open My Actions.' : ''}
          </Text>
        </View>
        {!!onPress && <Feather name="chevron-right" size={18} color={col} />}
      </Row>
    </Wrap>
  );
}
