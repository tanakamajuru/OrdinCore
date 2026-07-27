import React from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useNotifications, Notif } from '@/notifications/NotificationsContext';
import { Screen, AppHeader, Row, Text, Loading, Empty } from '@/components/ui';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const iconFor = (type?: string): { icon: FeatherName; tone: 'accent' | 'low' | 'high' | 'mod' } => {
  const t = String(type || '').toLowerCase();
  if (t.includes('escalation')) return { icon: 'shield', tone: t.includes('acknowledg') || t.includes('resolved') ? 'low' : 'high' };
  if (t.includes('effectiveness')) return { icon: 'activity', tone: 'mod' };
  if (t.includes('action')) return { icon: 'check-square', tone: 'accent' };
  if (t.includes('review') || t.includes('weekly')) return { icon: 'file-text', tone: 'accent' };
  if (t.includes('incident') || t.includes('safeguard')) return { icon: 'flag', tone: 'high' };
  return { icon: 'bell', tone: 'accent' };
};

export function AlertsScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { notifications, unread, loading, refresh, markRead, markAllRead } = useNotifications();
  const toneColor = { accent: c.accent, low: c.sevLow, high: c.sevHigh, mod: c.sevMod } as const;

  const open = async (n: Notif) => {
    if (!(n.is_read ?? n.read)) await markRead(n.id);
    const m = /\/signals\/([\w-]+)/.exec(n.link || '');
    if (m) nav.navigate('SignalDetail', { id: m[1] });
  };

  return (
    <Screen refreshing={loading} onRefresh={refresh}>
      <AppHeader title="Alerts" subtitle={unread ? `${unread} unread` : 'Closing your loop'}
        right={unread > 0 ? <Pressable onPress={() => markAllRead()} hitSlop={8}><Text size={12} color={c.accent} weight="600">Mark all read</Text></Pressable> : undefined} />

      {loading && notifications.length === 0 ? <Loading /> : notifications.length === 0 ? (
        <Empty icon="bell" title="You're all caught up." />
      ) : notifications.slice(0, 50).map((n) => {
        const { icon, tone } = iconFor(n.type);
        const unreadItem = !(n.is_read ?? n.read);
        return (
          <Pressable key={n.id} onPress={() => open(n)}
            style={{ flexDirection: 'row', gap: 11, alignItems: 'flex-start', backgroundColor: unreadItem ? c.accentTint : c.card, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 12 }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: toneColor[tone] + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={icon} size={15} color={toneColor[tone]} />
            </View>
            <View style={{ flex: 1 }}>
              <Row gap={6}>
                {unreadItem && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent }} />}
                <Text size={13} weight="600" style={{ flex: 1 }}>{n.title || 'Notification'}</Text>
              </Row>
              {!!n.body && <Text muted size={11.5} style={{ marginTop: 2 }}>{n.body}</Text>}
              {!!n.created_at && <Text faint size={10.5} style={{ marginTop: 3 }}>{new Date(n.created_at).toLocaleString('en-GB')}</Text>}
            </View>
          </Pressable>
        );
      })}
    </Screen>
  );
}
