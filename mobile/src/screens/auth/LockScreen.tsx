import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, Button } from '@/components/ui';
import { LogoMark } from '@/components/Logo';

export function LockScreen() {
  const { c } = useTheme();
  const { unlock, logout, user } = useAuth();

  useEffect(() => { void unlock(); }, [unlock]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16, alignItems: 'center' }}>
        <LogoMark size={140} />
        <Text size={18} weight="600">Welcome back{user?.first_name ? `, ${user.first_name}` : ''}</Text>
        <Text muted size={13} style={{ textAlign: 'center' }}>OrdinCore is locked. Confirm it's you to continue.</Text>
        <View style={{ width: '100%', gap: 10, marginTop: 8 }}>
          <Button title="Unlock" icon="unlock" onPress={() => unlock()} />
          <Button title="Use a different account" tone="ghost" onPress={() => logout()} />
        </View>
      </View>
    </SafeAreaView>
  );
}
