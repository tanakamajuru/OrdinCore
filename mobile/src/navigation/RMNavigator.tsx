/**
 * navigation/RMNavigator.tsx
 * Registered Manager: bottom tabs (Home, Risks, Escalations, Actions)
 * wrapping a native-stack per tab so list -> detail pushes work
 * (Escalations -> Escalation Detail, Weekly Governance -> Report).
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';

import HomeScreen from '@/screens/rm/HomeScreen';
import RisksScreen from '@/screens/rm/RisksScreen';
import EscalationsScreen from '@/screens/rm/EscalationsScreen';
import EscalationDetailScreen from '@/screens/rm/EscalationDetailScreen';
import MyWorkScreen from '@/screens/rm/MyWorkScreen';
import WeeklyGovernanceScreen from '@/screens/rm/WeeklyGovernanceScreen';
import WeeklyGovernanceReportScreen from '@/screens/rm/WeeklyGovernanceReportScreen';
import SiteOverviewScreen from '@/screens/rm/SiteOverviewScreen';

const Tab = createBottomTabNavigator();
const EscalationsStack = createNativeStackNavigator();
const ActionsStack = createNativeStackNavigator();

function EscalationsStackNavigator() {
  return (
    <EscalationsStack.Navigator screenOptions={{ headerShown: false }}>
      <EscalationsStack.Screen name="EscalationsList" component={EscalationsScreen} />
      <EscalationsStack.Screen name="EscalationDetail" component={EscalationDetailScreen} />
    </EscalationsStack.Navigator>
  );
}

/** "Actions" tab surfaces My Work + Weekly Governance + its Report + Site Overview. */
function ActionsStackNavigator() {
  return (
    <ActionsStack.Navigator screenOptions={{ headerShown: false }}>
      <ActionsStack.Screen name="MyWork" component={MyWorkScreen} />
      <ActionsStack.Screen name="WeeklyGovernance" component={WeeklyGovernanceScreen} />
      <ActionsStack.Screen name="WeeklyGovernanceReport" component={WeeklyGovernanceReportScreen} />
      <ActionsStack.Screen name="SiteOverview" component={SiteOverviewScreen} />
    </ActionsStack.Navigator>
  );
}

const iconFor: Record<string, keyof typeof Feather.glyphMap> = {
  Home: 'home',
  Risks: 'shield',
  Escalations: 'alert-triangle',
  Actions: 'check-square',
};

export function RMNavigator() {
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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Risks" component={RisksScreen} />
      <Tab.Screen name="Escalations" component={EscalationsStackNavigator} />
      <Tab.Screen name="Actions" component={ActionsStackNavigator} />
    </Tab.Navigator>
  );
}
