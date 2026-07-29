import React, { createContext, useContext, useState } from 'react';
import { View, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth, normalizeRole } from '@/auth/AuthContext';
import { useTheme, ThemeMode } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { Text } from './ui';
import { SidebarIcon } from './SidebarIcon';
import { navigate, navigateTab } from '@/navigation/navRef';

type FeatherName = React.ComponentProps<typeof Feather>['name'];
type DrawerItem = { icon: FeatherName; label: string; go?: () => void; info?: string };

/* ---------- context so any screen header can open the drawer ---------- */
const DrawerContext = createContext<{ open: () => void; close: () => void }>({ open: () => {}, close: () => {} });
export const useDrawer = () => useContext(DrawerContext);

const prettyRole = (r?: string) => normalizeRole(r || '').split('_').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ');

// Role-aware menu — the destinations that used to live on the "More" tab now live here.
function itemsForRole(role: string, close: () => void): DrawerItem[] {
  const go = (fn: () => void) => () => { close(); setTimeout(fn, 10); };
  const r = normalizeRole(role);
  const common = (arr: DrawerItem[]): DrawerItem[] => [
    ...arr,
    { icon: 'user', label: 'Profile', go: go(() => navigate('Profile')) },
    { icon: 'help-circle', label: 'Help', go: go(() => Alert.alert('Help & Guides', 'In-app guides are coming soon. For now, the full help centre is on the OrdinCore web app.')) },
    { icon: 'settings', label: 'Settings', go: go(() => Alert.alert('Settings', 'Theme is set above. More device settings are coming soon.')) },
  ];
  if (r === 'REGISTERED_MANAGER' || r === 'ADMIN' || r === 'SUPER_ADMIN') {
    return common([
      { icon: 'home', label: 'Home', go: go(() => navigateTab('Home')) },
      { icon: 'check-square', label: 'My Actions', go: go(() => navigate('RMMyActions')) },
      { icon: 'trending-up', label: 'Escalations', go: go(() => navigate('RMEscalations')) },
      { icon: 'clipboard', label: 'Governance Review', go: go(() => navigate('RMGovernanceReview')) },
      { icon: 'home', label: 'Site Overview', go: go(() => navigate('RMHouseOverview')) },
      { icon: 'shield', label: 'Compliance', go: go(() => navigate('RMCompliance')) },
    ]);
  }
  if (r === 'TEAM_LEADER') {
    return common([
      { icon: 'home', label: 'Home', go: go(() => navigateTab('Today')) },
      { icon: 'check-square', label: 'My Actions', go: go(() => navigate('TLMyActions')) },
      { icon: 'trending-up', label: 'Escalations', go: go(() => navigate('TLEscalations')) },
      { icon: 'file-text', label: 'Documents', go: go(() => navigate('TLDocuments')) },
      { icon: 'edit-3', label: 'Notes', go: go(() => navigate('TLNotes')) },
      { icon: 'users', label: 'Team Overview', go: go(() => navigate('TLTeamOverview')) },
    ]);
  }
  if (r === 'DIRECTOR') {
    return common([
      { icon: 'home', label: 'Home', go: go(() => navigateTab('Home')) },
      { icon: 'clipboard', label: 'Governance', go: go(() => navigate('DirectorGovernance')) },
      { icon: 'file-text', label: 'Reports', go: go(() => navigate('DirectorReports')) },
    ]);
  }
  if (r === 'RESPONSIBLE_INDIVIDUAL') {
    return common([
      { icon: 'home', label: 'Home', go: go(() => navigateTab('Home')) },
      { icon: 'book-open', label: 'Narrative', go: go(() => navigate('RINarrative')) },
      { icon: 'file-text', label: 'Board Reports', go: go(() => navigate('RIBoardReports')) },
    ]);
  }
  // Support Worker
  return common([
    { icon: 'home', label: 'Home', go: go(() => navigateTab('Today')) },
    { icon: 'activity', label: 'Signals', go: go(() => navigateTab('Signals')) },
    { icon: 'check-square', label: 'My Actions', go: go(() => navigateTab('Actions')) },
  ]);
}

/* ---------- the theme switcher (Light / Dark) ---------- */
function ThemeSwitcher() {
  const { c, scheme, setMode } = useTheme();
  const opts: { mode: ThemeMode; label: string; icon: FeatherName }[] = [
    { mode: 'light', label: 'Light', icon: 'sun' },
    { mode: 'dark', label: 'Dark', icon: 'moon' },
  ];
  return (
    <View>
      <Text size={12} muted style={{ marginBottom: 8 }}>Theme</Text>
      <View style={{ flexDirection: 'row', backgroundColor: c.paper, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: 3, alignSelf: 'flex-start' }}>
        {opts.map((o) => {
          const on = scheme === o.mode;
          return (
            <Pressable key={o.mode} onPress={() => setMode(o.mode)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: on ? c.card : 'transparent', borderWidth: on ? 1 : 0, borderColor: c.line }}>
              <Feather name={o.icon} size={15} color={on ? c.ink : c.faint} />
              <Text size={13.5} weight={on ? '600' : '400'} color={on ? c.ink : c.faint}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ---------- the drawer panel (in-tree overlay, so it stays within the app bounds) ---------- */
function DrawerOverlay({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const { user, logout, role } = useAuth();
  const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'there';
  const inits = `${(user?.first_name?.[0] || '')}${(user?.last_name?.[0] || '')}`.toUpperCase() || '·';
  const items = itemsForRole(role || '', onClose);

  return (
    // Absolutely fills the DrawerHost container (= the app view), so the panel can never spill
    // outside the phone frame the way a full-screen Modal does on web / in a device mock.
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', zIndex: 1000, elevation: 1000 }}>
      <View style={{ width: '82%', maxWidth: 340, backgroundColor: c.paper, borderRightWidth: 1, borderRightColor: c.line }}>
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: c.lineSoft }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text size={17} weight="700" color={c.accentInk}>{inits}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text size={19} weight="700">Hello,</Text>
              <Text size={13} muted>{name}{role ? ` · ${prettyRole(role)}` : ''}</Text>
            </View>
            {/* The open-state sidebar icon closes the drawer (matches the toggle in the header). */}
            <Pressable onPress={onClose} hitSlop={10} style={{ padding: 4 }}>
              <SidebarIcon size={22} color={c.faint} open />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 8, gap: 4 }}>
            <View style={{ marginBottom: 14 }}><ThemeSwitcher /></View>

            {items.map((it) => (
              <Pressable key={it.label} onPress={it.go}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 13, opacity: pressed ? 0.6 : 1 })}>
                <Feather name={it.icon} size={20} color={c.ink} />
                <Text size={15.5} weight="500">{it.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Logout pinned to the bottom */}
          <Pressable onPress={() => { onClose(); setTimeout(() => logout(), 10); }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 15, padding: 18, borderTopWidth: 1, borderTopColor: c.lineSoft, opacity: pressed ? 0.6 : 1 })}>
            <Feather name="log-out" size={20} color={c.ink} />
            <Text size={15.5} weight="500">Logout</Text>
          </Pressable>
        </SafeAreaView>
      </View>
      {/* Scrim — tap to close */}
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: c.overlay }} />
    </View>
  );
}

/* ---------- host: provides open/close context + renders the overlay in-tree ---------- */
export function DrawerHost({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const close = () => setVisible(false);
  return (
    <DrawerContext.Provider value={{ open: () => setVisible(true), close }}>
      <View style={{ flex: 1 }}>
        {children}
        {visible && <DrawerOverlay onClose={close} />}
      </View>
    </DrawerContext.Provider>
  );
}
