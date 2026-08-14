/**
 * components/Logo.tsx
 * Small mark + wordmark used in the drawer header and splash areas.
 */
import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, Row } from './ui';

export function Logo({ size = 32, wordmark = true }: { size?: number; wordmark?: boolean }) {
  const { colors, radius } = useTheme();
  return (
    <Row gap={10} align="center">
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius.sm,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name="shield" size={size * 0.55} color="#fff" />
      </View>
      {wordmark ? (
        <Text variant="subtitle" style={{ fontSize: 17 }}>
          ORDIN<Text style={{ color: colors.primary, fontSize: 17 }} weight="700">CORE</Text>
        </Text>
      ) : null}
    </Row>
  );
}
