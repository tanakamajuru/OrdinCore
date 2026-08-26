/**
 * components/AppDrawer.tsx
 * Custom drawer content for the Director role — replicates the left-hand
 * sidebar screen (profile switcher, nav list, footer badge). Rendered as
 * the `drawerContent` prop on a React Navigation drawer navigator, or
 * standalone as a full-bleed panel on larger/tablet layouts.
 */
import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, Row, Avatar } from './ui';
import { SidebarIcon } from './SidebarIcon';
import { Logo } from './Logo';

export type DrawerNavItem = {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  badge?: number;
};

export function AppDrawer({
  role,
  orgName,
  items,
  activeKey,
  onSelect,
  version = 'Ordin Core v1.0.0',
}: {
  role: string;
  orgName: string;
  items: DrawerNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  version?: string;
}) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.mode === 'dark' ? colors.bg : '#0F2A45', paddingTop: 56 }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Logo />

        <Row gap={spacing.md} style={{ marginTop: spacing.xl, marginBottom: spacing.lg }}>
          <Avatar initials={orgName.slice(0, 2).toUpperCase()} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff' }} weight="700">
              {role}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)' }} variant="caption">
              {orgName}
            </Text>
          </View>
          <Feather name="chevron-down" size={16} color="rgba(255,255,255,0.6)" />
        </Row>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.md }}>
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: 12,
                paddingHorizontal: spacing.md,
                borderRadius: radius.sm,
                backgroundColor: active ? 'rgba(20,161,158,0.9)' : 'transparent',
                marginBottom: 2,
              }}
            >
              <SidebarIcon name={item.icon} active={active} />
              <Text style={{ color: '#fff', flex: 1 }} weight={active ? '700' : '500'}>
                {item.label}
              </Text>
              {item.badge ? (
                <View
                  style={{
                    minWidth: 22,
                    height: 22,
                    borderRadius: 11,
                    paddingHorizontal: 6,
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 12 }} weight="700">
                    {item.badge}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Log out — always present at the foot of the sidebar for every role. */}
      <Pressable
        onPress={() => onSelect('LogOut')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          marginHorizontal: spacing.md,
          marginBottom: spacing.sm,
          paddingVertical: 12,
          paddingHorizontal: spacing.md,
          borderRadius: radius.sm,
          backgroundColor: 'rgba(214,69,69,0.15)',
        }}
      >
        <Feather name="log-out" size={18} color="#F7A6A6" />
        <Text style={{ color: '#F7A6A6', flex: 1 }} weight="700">
          Log Out
        </Text>
      </Pressable>

      <Row
        gap={spacing.sm}
        style={{
          padding: spacing.lg,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <Feather name="shield" size={16} color="rgba(255,255,255,0.5)" />
        <View>
          <Text style={{ color: 'rgba(255,255,255,0.7)' }} variant="caption">
            {version}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)' }} variant="caption">
            Secure · Compliant · Defensible
          </Text>
        </View>
      </Row>
    </View>
  );
}
