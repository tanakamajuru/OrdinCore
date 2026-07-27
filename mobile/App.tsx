import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { LockScreen } from '@/screens/auth/LockScreen';
import { registerForPush } from '@/notifications/push';
import { NotificationsProvider } from '@/notifications/NotificationsContext';
import { queue } from '@/offline/queue';
import { navigationRef } from '@/navigation/navRef';
import { DrawerHost } from '@/components/AppDrawer';

function Gate() {
  const { status } = useAuth();
  const { c, scheme } = useTheme();

  useEffect(() => {
    if (status === 'authed') { void registerForPush(); void queue.flush(); }
  }, [status]);

  if (status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.accent} /></View>;
  }
  if (status === 'unauthed') return <LoginScreen />;
  if (status === 'locked') return <LockScreen />;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: c.paper, card: c.card, text: c.ink, primary: c.accent, border: c.line },
  };
  return (
    <NotificationsProvider>
      <DrawerHost>
        <NavigationContainer ref={navigationRef} theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      </DrawerHost>
    </NotificationsProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <StatusBarWrapper />
          <Gate />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function StatusBarWrapper() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}
