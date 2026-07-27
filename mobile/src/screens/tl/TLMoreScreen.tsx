import React from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Screen, Text, Row, Avatar, Button } from '@/components/ui';
import { SyncStatus } from '@/components/SyncStatus';

type Item = { icon: any; label: string; sub: string; go: () => void };

export function TLMoreScreen() {
  const { c } = useTheme();
  const nav = useNavigation<any>();
  const { user, logout } = useAuth();
  const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'You';
  const inits = `${(user?.first_name?.[0] || '')}${(user?.last_name?.[0] || '')}`.toUpperCase() || '·';

  const items: Item[] = [
    { icon: 'check-circle', label: 'Daily Review', sub: 'Today’s checks', go: () => nav.navigate('TLDailyReview') },
    { icon: 'users', label: 'Team Overview', sub: 'Staff & house activity', go: () => nav.navigate('TLTeamOverview') },
    { icon: 'trending-up', label: 'Escalations', sub: 'Open & overdue', go: () => nav.navigate('TLEscalations') },
    { icon: 'folder', label: 'Documents', sub: 'Care plans, policies, records', go: () => nav.navigate('TLDocuments') },
    { icon: 'edit-3', label: 'Notes', sub: 'Shift & handover notes', go: () => nav.navigate('TLNotes') },
    { icon: 'user', label: 'Profile', sub: 'Account & security', go: () => nav.navigate('Profile') },
  ];

  return (
    <Screen>
      <Row gap={12} style={{ paddingVertical: 4 }}>
        <Avatar initials={inits} />
        <View style={{ flex: 1 }}>
          <Text size={17} weight="700">{name}</Text>
          <Text size={12.5} muted>Team Leader</Text>
        </View>
      </Row>

      <SyncStatus />

      <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, overflow: 'hidden' }}>
        {items.map((it, i) => (
          <Pressable key={it.label} onPress={it.go}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.lineSoft }}>
            <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={it.icon} size={17} color={c.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text size={14.5} weight="600">{it.label}</Text>
              <Text size={11.5} muted>{it.sub}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={c.faint} />
          </Pressable>
        ))}
      </View>

      <Button title="Log out" tone="block" icon="log-out" onPress={() => logout()} style={{ marginTop: 6 }} />
    </Screen>
  );
}
