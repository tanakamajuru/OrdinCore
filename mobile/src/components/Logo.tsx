import React from 'react';
import { View, Image } from 'react-native';
import { Text } from './ui';
import { useTheme } from '@/theme/ThemeProvider';

// The official ORDIN CORE brand lockup (shield + wordmark) — day and night variants so the logo
// matches the active theme (supplied day/night artwork).
const LOGO_DAY = require('../../assets/logo-day.png');
const LOGO_NIGHT = require('../../assets/logo-night.png');

export function LogoMark({ size = 72 }: { size?: number }) {
  const { scheme } = useTheme();
  return <Image source={scheme === 'dark' ? LOGO_NIGHT : LOGO_DAY} style={{ width: size, height: size }} resizeMode="contain" />;
}

// The logo image already carries the ORDIN CORE wordmark, so this adds only the tagline.
export function Logo({ size = 190, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <LogoMark size={size} />
      {showWordmark && <Text muted size={12.5}>Governance at the point of care</Text>}
    </View>
  );
}
