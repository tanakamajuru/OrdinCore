/**
 * components/SidebarIcon.tsx
 * Icon chip used inside AppDrawer nav rows.
 */
import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';

export function SidebarIcon({
  name,
  active,
}: {
  name: keyof typeof Feather.glyphMap;
  active?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ width: 24, alignItems: 'center' }}>
      <Feather name={name} size={19} color={active ? '#fff' : colors.textMuted} />
    </View>
  );
}
