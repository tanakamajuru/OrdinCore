/**
 * App.tsx
 * Entry point: SafeArea + Theme + NavigationContainer around a root stack
 * that lets you jump into any of the 5 role experiences (RoleSelectScreen).
 * In production, swap RoleSelectScreen for an auth flow that resolves the
 * signed-in user's role and navigates straight to their navigator.
 */
import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

import RoleSelectScreen from '@/screens/RoleSelectScreen';
import { RootDrawer as DirectorDrawer } from '@/navigation/RootDrawer';
import { RMDrawer } from '@/navigation/RMDrawer';
import { CareWorkerNavigator } from '@/navigation/CareWorkerNavigator';
import { TeamLeaderNavigator } from '@/navigation/TeamLeaderNavigator';
import { RIDrawer } from '@/navigation/RIDrawer';

const RootStack = createNativeStackNavigator();

function Root() {
  const { mode } = useTheme();
  return (
    <NavigationContainer>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="RoleSelect" component={RoleSelectScreen} />
        <RootStack.Screen name="Director" component={DirectorDrawer} />
        <RootStack.Screen name="RM" component={RMDrawer} />
        <RootStack.Screen name="CareWorker" component={CareWorkerNavigator} />
        <RootStack.Screen name="TeamLeader" component={TeamLeaderNavigator} />
        <RootStack.Screen name="RI" component={RIDrawer} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
