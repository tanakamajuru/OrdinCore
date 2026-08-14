/**
 * navigation/TeamLeaderNavigator.tsx
 * Bottom tabs: Today, Signals, Actions, Escalations. Record Signal,
 * Action Detail and Governance Brief are pushed from within their tabs.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';

import TodayScreen from '@/screens/teamleader/TodayScreen';
import RecordSignalScreen from '@/screens/teamleader/RecordSignalScreen';
import SignalsScreen from '@/screens/teamleader/SignalsScreen';
import ActionsScreen from '@/screens/teamleader/ActionsScreen';
import ActionDetailScreen from '@/screens/teamleader/ActionDetailScreen';
import EscalationsScreen from '@/screens/teamleader/EscalationsScreen';
import GovernanceBriefScreen from '@/screens/teamleader/GovernanceBriefScreen';
import MyWorkScreen from '@/screens/teamleader/MyWorkScreen';

const Tab = createBottomTabNavigator();
const TodayStack = createNativeStackNavigator();
const ActionsStack = createNativeStackNavigator();

function TodayStackNavigator() {
  return (
    <TodayStack.Navigator screenOptions={{ headerShown: false }}>
      <TodayStack.Screen name="TodayHome" component={TodayScreen} />
      <TodayStack.Screen name="RecordSignal" component={RecordSignalScreen} options={{ presentation: 'modal' }} />
      <TodayStack.Screen name="GovernanceBrief" component={GovernanceBriefScreen} />
      <TodayStack.Screen name="MyWork" component={MyWorkScreen} />
    </TodayStack.Navigator>
  );
}

function ActionsStackNavigator() {
  return (
    <ActionsStack.Navigator screenOptions={{ headerShown: false }}>
      <ActionsStack.Screen name="ActionsList" component={ActionsScreen} />
      <ActionsStack.Screen name="ActionDetail" component={ActionDetailScreen} />
    </ActionsStack.Navigator>
  );
}

const iconFor: Record<string, keyof typeof Feather.glyphMap> = {
  Today: 'calendar',
  Signals: 'radio',
  Actions: 'check-square',
  Escalations: 'alert-triangle',
};

export function TeamLeaderNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => <Feather name={iconFor[route.name]} color={color} size={size ?? 22} />,
      })}
    >
      <Tab.Screen name="Today" component={TodayStackNavigator} />
      <Tab.Screen name="Signals" component={SignalsScreen} />
      <Tab.Screen name="Actions" component={ActionsStackNavigator} />
      <Tab.Screen name="Escalations" component={EscalationsScreen} />
    </Tab.Navigator>
  );
}
