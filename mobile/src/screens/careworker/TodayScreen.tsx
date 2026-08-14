/**
 * screens/careworker/TodayScreen.tsx
 * "Good morning, Sam" — Raise a signal CTA, actions requiring you, recent
 * signals. Matches Care Worker screenshot 1/7.
 */
import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { roleAccent } from '@/theme/roleAccents';
import { useAuth } from '@/auth/AuthContext';
import { useApi } from '@/api/useApi';
import { listOf } from '@/api/mappers';
import { Screen, Text, Row, Card, Button } from '@/components/ui';
import { BoardHeader } from '@/components/board';

const domainOf = (s: any) => (Array.isArray(s.risk_domain) ? s.risk_domain[0] : s.risk_domain || s.governance_domain || s.category || 'Signal');
const iconFor = (s: any) => { const d = String(domainOf(s)).toLowerCase(); if (/health|wellbeing|mental/.test(d)) return 'heart'; if (/environment|property/.test(d)) return 'home'; if (/engagement|positive|social/.test(d)) return 'star'; if (/medicat/.test(d)) return 'thermometer'; if (/safeguard/.test(d)) return 'shield'; return 'activity'; };
const swStatus = (s: any) => { const rs = String(s.review_status || '').toLowerCase(); return !rs || rs === 'new' ? 'Under review' : rs === 'linked' ? 'Action assigned' : rs === 'monitoring' ? 'Monitoring' : rs === 'closed' ? 'Closed' : 'Recorded'; };
const submitted = (s: any) => { const dt = s.created_at || s.entry_date; if (!dt) return ''; const d = new Date(dt); const days = Math.floor((Date.now() - d.getTime()) / 86400000); return days <= 0 ? `Submitted ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : days === 1 ? 'Submitted yesterday' : `Submitted ${days} days ago`; };

export default function TodayScreen() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const uid = user?.id || user?.user_id;
  const { data: actData } = useApi<any>('/actions/my');
  const { data: sigData } = useApi<any>(uid ? `/pulses?created_by=${uid}&limit=50` : '/pulses?limit=50');
  const openActions = listOf(actData).filter((a: any) => !/complete|done|cancel/i.test(a.status || '')).length;
  const recentSignals = listOf(sigData).slice(0, 5).map((s: any) => ({ id: s.id, icon: iconFor(s), color: roleAccent.careWorker, title: domainOf(s), subtitle: `${s.related_person || s.house_name || ''} · ${submitted(s)}`.replace(/^ · /, ''), badge: swStatus(s) }));
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <Screen scroll>
      <BoardHeader title={`${greet}${user?.first_name ? `, ${user.first_name}` : ''}`} subtitle="Capture. Act. Make a difference." onBellPress={() => {}} />

      <Button
        label="+  Raise a signal"
        accentColor={roleAccent.careWorker}
        onPress={() => navigation.navigate('RaiseSignal')}
      />

      <Card
        onPress={() => navigation.navigate('MyActions')}
        style={{ marginTop: spacing.lg, marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
      >
        <Feather name="clipboard" size={20} color={roleAccent.careWorker} />
        <Text style={{ flex: 1 }} weight="700">
          {openActions} Action{openActions === 1 ? '' : 's'} requiring you
        </Text>
        <Feather name="chevron-right" size={16} color={colors.textMuted} />
      </Card>

      <Row justify="space-between" style={{ marginBottom: spacing.sm }}>
        <Text variant="subtitle" style={{ fontSize: 16 }}>
          Your recent signals
        </Text>
        <Text style={{ color: roleAccent.careWorker }} weight="600" variant="caption">
          View all
        </Text>
      </Row>

      <Card style={{ padding: spacing.sm }}>
        {recentSignals.map((s, i) => (
          <Row
            key={s.id}
            gap={spacing.md}
            style={{ paddingVertical: spacing.sm, borderBottomWidth: i < recentSignals.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
          >
            <Feather name={s.icon as any} size={18} color={s.color} />
            <View style={{ flex: 1 } as any}>
              <Text weight="600">{s.title}</Text>
              <Text muted variant="caption">
                {s.subtitle}
              </Text>
            </View>
            <Text muted variant="caption">
              {s.badge}
            </Text>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}
