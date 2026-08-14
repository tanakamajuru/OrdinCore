/**
 * App.tsx
 * SafeArea > Theme > Auth > (role-resolved navigator).
 * The signed-in user's role selects their navigator; unauthenticated users see Login,
 * returning users see the biometric Lock.
 */
import 'react-native-gesture-handler';
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { navigationRef } from '@/navigation/navRef';

import { RootDrawer as DirectorDrawer } from '@/navigation/RootDrawer';
import { RMDrawer } from '@/navigation/RMDrawer';
import { CareWorkerNavigator } from '@/navigation/CareWorkerNavigator';
import { TeamLeaderNavigator } from '@/navigation/TeamLeaderNavigator';
import { RIDrawer } from '@/navigation/RIDrawer';
import LoginScreen from '@/screens/auth/LoginScreen';
import LockScreen from '@/screens/auth/LockScreen';

function navigatorForRole(role: string): React.ComponentType {
  switch (role) {
    case 'SUPPORT_WORKER': return CareWorkerNavigator;
    case 'TEAM_LEADER': return TeamLeaderNavigator;
    case 'DIRECTOR': return DirectorDrawer;
    case 'RESPONSIBLE_INDIVIDUAL': return RIDrawer;
    case 'REGISTERED_MANAGER':
    default: return RMDrawer;
  }
}

function Root() {
  const { mode, colors } = useTheme();
  const { status, role } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (status === 'unauthed') return <LoginScreen />;
  if (status === 'locked') return <LockScreen />;

  const RoleNav = navigatorForRole(role);
  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <RoleNav />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <Root />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
