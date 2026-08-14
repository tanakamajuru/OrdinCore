/**
 * navigation/CareWorkerNavigator.tsx
 * Bottom tabs: Today, Signals, Actions, Alerts — matches the green-themed
 * Care Worker app bottom bar. Raise Signal is a modal-style push from Today.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { roleAccent } from '@/theme/roleAccents';

import TodayScreen from '@/screens/careworker/TodayScreen';
import RaiseSignalScreen from '@/screens/careworker/RaiseSignalScreen';
import MySignalsScreen from '@/screens/careworker/MySignalsScreen';
import MyActionsScreen from '@/screens/careworker/MyActionsScreen';
import ActionDetailsScreen from '@/screens/careworker/ActionDetailsScreen';
import AlertsScreen from '@/screens/careworker/AlertsScreen';

const Tab = createBottomTabNavigator();
const TodayStack = createNativeStackNavigator();
const ActionsStack = createNativeStackNavigator();

function TodayStackNavigator() {
  return (
    <TodayStack.Navigator screenOptions={{ headerShown: false }}>
      <TodayStack.Screen name="TodayHome" component={TodayScreen} />
      <TodayStack.Screen name="RaiseSignal" component={RaiseSignalScreen} options={{ presentation: 'modal' }} />
    </TodayStack.Navigator>
  );
}

function ActionsStackNavigator() {
  return (
    <ActionsStack.Navigator screenOptions={{ headerShown: false }}>
      <ActionsStack.Screen name="MyActionsList" component={MyActionsScreen} />
      <ActionsStack.Screen name="ActionDetails" component={ActionDetailsScreen} />
    </ActionsStack.Navigator>
  );
}

const iconFor: Record<string, keyof typeof Feather.glyphMap> = {
  Today: 'sun',
  Signals: 'list',
  Actions: 'check-square',
  Alerts: 'bell',
};

export function CareWorkerNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: roleAccent.careWorker,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => <Feather name={iconFor[route.name]} color={color} size={size ?? 22} />,
      })}
    >
      <Tab.Screen name="Today" component={TodayStackNavigator} />
      <Tab.Screen name="Signals" component={MySignalsScreen} />
      <Tab.Screen name="Actions" component={ActionsStackNavigator} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
    </Tab.Navigator>
  );
}
