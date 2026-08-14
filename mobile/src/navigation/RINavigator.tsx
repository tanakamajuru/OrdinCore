/**
 * navigation/RINavigator.tsx
 * Bottom tabs: Home, Oversight, Readiness, Narrative — matches the RI app
 * bottom bar. My Work / Board Reports are reached via the drawer.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';

import ProviderAssuranceScreen from '@/screens/ri/ProviderAssuranceScreen';
import OversightScreen from '@/screens/ri/OversightScreen';
import ReadinessScreen from '@/screens/ri/ReadinessScreen';
import NarrativeScreen from '@/screens/ri/NarrativeScreen';
import MyWorkScreen from '@/screens/ri/MyWorkScreen';
import BoardReportsScreen from '@/screens/ri/BoardReportsScreen';
import RiBoardAssuranceReportScreen from '@/screens/ri/RiBoardAssuranceReportScreen';

export type RITabParamList = {
  Home: undefined;
  Oversight: undefined;
  Readiness: undefined;
  Narrative: undefined;
  MyWork: undefined;
  BoardReports: undefined;
};

const Tab = createBottomTabNavigator<RITabParamList>();
const ReportsStack = createNativeStackNavigator();

function BoardReportsStackNavigator() {
  return (
    <ReportsStack.Navigator screenOptions={{ headerShown: false }}>
      <ReportsStack.Screen name="BoardReportsList" component={BoardReportsScreen} />
      <ReportsStack.Screen name="RiBoardAssuranceReport" component={RiBoardAssuranceReportScreen} />
    </ReportsStack.Navigator>
  );
}

const iconFor: Record<keyof RITabParamList, keyof typeof Feather.glyphMap> = {
  Home: 'home',
  Oversight: 'compass',
  Readiness: 'shield',
  Narrative: 'calendar',
  MyWork: 'clipboard',
  BoardReports: 'file-text',
};

export function RINavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => (
          <Feather name={iconFor[route.name as keyof RITabParamList]} color={color} size={size ?? 22} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={ProviderAssuranceScreen} />
      <Tab.Screen name="Oversight" component={OversightScreen} />
      <Tab.Screen name="Readiness" component={ReadinessScreen} />
      <Tab.Screen name="Narrative" component={NarrativeScreen} />
      {/* Reachable via drawer, kept as tabs too for direct dev testing */}
      <Tab.Screen name="MyWork" component={MyWorkScreen} options={{ title: 'My Work' }} />
      <Tab.Screen name="BoardReports" component={BoardReportsStackNavigator} options={{ title: 'Reports' }} />
    </Tab.Navigator>
  );
}
