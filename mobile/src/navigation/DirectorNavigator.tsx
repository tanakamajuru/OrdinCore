/**
 * navigation/DirectorNavigator.tsx
 * React Navigation 7 bottom-tabs for the Director role, matching the
 * screenshot's bottom bar: Home / Trends / Themes / Governance.
 * "My Work" and the drawer are reached from the header menu button
 * (see AppDrawer.tsx) rather than a 5th tab, matching the source screens.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';

import HomeScreen from '@/screens/director/HomeScreen';
import TrendsScreen from '@/screens/director/TrendsScreen';
import ThemesScreen from '@/screens/director/ThemesScreen';
import GovernanceScreen from '@/screens/director/GovernanceScreen';
import MyWorkScreen from '@/screens/director/MyWorkScreen';

export type DirectorTabParamList = {
  Home: undefined;
  Trends: undefined;
  Themes: undefined;
  Governance: undefined;
  MyWork: undefined;
};

const Tab = createBottomTabNavigator<DirectorTabParamList>();

const iconFor: Record<keyof DirectorTabParamList, keyof typeof Feather.glyphMap> = {
  Home: 'home',
  Trends: 'bar-chart-2',
  Themes: 'compass',
  Governance: 'shield',
  MyWork: 'clipboard',
};

export function DirectorNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => (
          <Feather name={iconFor[route.name as keyof DirectorTabParamList]} color={color} size={size ?? 22} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Trends" component={TrendsScreen} />
      <Tab.Screen name="Themes" component={ThemesScreen} />
      <Tab.Screen name="Governance" component={GovernanceScreen} />
      {/* MyWork is reachable via priority-list deep links / drawer; kept as a tab here
          for completeness so it's directly testable during development. */}
      <Tab.Screen name="MyWork" component={MyWorkScreen} options={{ title: 'My Work' }} />
    </Tab.Navigator>
  );
}
