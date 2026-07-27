import React from 'react';
import { View, Image } from 'react-native';
import { Text } from './ui';

// The official ORDIN CORE brand lockup (shield + wordmark).
const LOGO = require('../../assets/logo.png');

export function LogoMark({ size = 72 }: { size?: number }) {
  return <Image source={LOGO} style={{ width: size, height: size }} resizeMode="contain" />;
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
