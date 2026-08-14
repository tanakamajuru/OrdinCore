/**
 * screens/auth/LockScreen.tsx
 * Biometric re-unlock for a returning, already-authenticated user.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '@/auth/AuthContext';
import { Screen, Text, Button } from '@/components/ui';
import { Logo } from '@/components/Logo';

export default function LockScreen() {
  const { unlock, logout, user } = useAuth() as any;
  const [busy, setBusy] = useState(false);

  const tryUnlock = useCallback(async () => {
    setBusy(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = hasHardware && (await LocalAuthentication.isEnrolledAsync());
      if (enrolled) {
        const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock OrdinCore' });
        if (res.success) { await unlock(); return; }
      } else {
        await unlock();
        return;
      }
    } catch {
      /* leave locked; user can retry or sign out */
    } finally {
      setBusy(false);
    }
  }, [unlock]);

  useEffect(() => { tryUnlock(); }, [tryUnlock]);

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <Logo size={64} wordmark={false} />
        <Text variant="title" weight="800">Welcome back{user?.first_name ? `, ${user.first_name}` : ''}</Text>
        <Text muted>Unlock to continue</Text>
        <View style={{ alignSelf: 'stretch', paddingHorizontal: 24, gap: 10, marginTop: 8 }}>
          <Button label={busy ? 'Unlocking…' : 'Unlock'} icon="unlock" onPress={tryUnlock} loading={busy} />
          <Button label="Sign out" variant="ghost" onPress={logout} />
        </View>
      </View>
    </Screen>
  );
}
