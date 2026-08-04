import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import { useTheme, AccentProvider } from '@/theme/ThemeProvider';
import { useNotifications } from '@/notifications/NotificationsContext';
import { RootStackParams, SWSignalsStackParams, SWActionsStackParams } from './types';

import { MyActionsScreen } from '@/screens/tl/MyActionsScreen';
import { TLMyActionsScreen } from '@/screens/tl/TLMyActionsScreen';
import { TLDailyGovernanceScreen } from '@/screens/tl/TLDailyGovernanceScreen';
import { RaiseSignalScreen } from '@/screens/tl/RaiseSignalScreen';
import { AlertsScreen } from '@/screens/shared/AlertsScreen';
import { SignalDetailScreen } from '@/screens/shared/SignalDetailScreen';
import { PipelineScreen } from '@/screens/rm/PipelineScreen';
import { PromoteScreen } from '@/screens/rm/PromoteScreen';
import { CloseRiskScreen } from '@/screens/rm/CloseRiskScreen';
import { DirectorAssuranceScreen } from '@/screens/director/AssuranceScreen';
import { ReviewsScreen } from '@/screens/director/ReviewsScreen';
import { ValidateReviewScreen } from '@/screens/director/ValidateReviewScreen';
import { RIAssuranceScreen } from '@/screens/ri/AssuranceScreen';
import { ProviderSignoffScreen } from '@/screens/ri/ProviderSignoffScreen';
import { ProfileScreen } from '@/screens/shared/ProfileScreen';
import { MyWorkScreen } from '@/screens/shared/MyWorkScreen';
import { RiskDetailScreen } from '@/screens/shared/RiskDetailScreen';
import { ReportDetailScreen } from '@/screens/shared/ReportDetailScreen';
import { RateEffectivenessScreen } from '@/screens/rm/RateEffectivenessScreen';
import { ActionDetailScreen } from '@/screens/shared/ActionDetailScreen';
import { SWTodayScreen } from '@/screens/sw/SWTodayScreen';
import { SWSignalsScreen } from '@/screens/sw/SWSignalsScreen';
import { SWRaiseSignalScreen } from '@/screens/sw/SWRaiseSignalScreen';
import { SWMyActionsScreen } from '@/screens/sw/SWMyActionsScreen';
import { SWSignalDetailScreen } from '@/screens/sw/SWSignalDetailScreen';
import { SWSignalTimelineScreen } from '@/screens/sw/SWSignalTimelineScreen';
import { SWSignalUpdateScreen } from '@/screens/sw/SWSignalUpdateScreen';
import { SWEscalationsScreen } from '@/screens/sw/SWEscalationsScreen';
import { TLMorningMeetingScreen } from '@/screens/tl/TLMorningMeetingScreen';
import { TLSignalsScreen } from '@/screens/tl/TLSignalsScreen';
import { TLDailyReviewScreen } from '@/screens/tl/TLDailyReviewScreen';
import { TLTeamOverviewScreen } from '@/screens/tl/TLTeamOverviewScreen';
import { TLEscalationsScreen } from '@/screens/tl/TLEscalationsScreen';
import { TLDocumentsScreen } from '@/screens/tl/TLDocumentsScreen';
import { TLNotesScreen } from '@/screens/tl/TLNotesScreen';
import { RMDashboardScreen, RMRiskRegisterScreen, RMEscalationsScreen, RMGovernanceReviewScreen, RMReportsScreen, RMHouseOverviewScreen, RMComplianceScreen, RMMyActionsScreen } from '@/screens/rm/RMScreens';
import { DirectorOverviewScreen, DirectorTrendsScreen, DirectorThemesScreen, DirectorGovernanceScreen, DirectorReportsScreen } from '@/screens/director/DirectorScreens';
import { RIProviderAssuranceScreen, RIOversightScreen, RIInspectionScreen, RINarrativeScreen, RIBoardReportsScreen } from '@/screens/ri/RIScreens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParams>();
const SWSignalsStack = createNativeStackNavigator<SWSignalsStackParams>();
const SWActionsStack = createNativeStackNavigator<SWActionsStackParams>();

type FeatherName = React.ComponentProps<typeof Feather>['name'];
const tabIcon = (name: FeatherName) => ({ color, size }: { color: string; size: number }) => <Feather name={name} size={size} color={color} />;

function LogoutButton() {
  const { logout } = useAuth();
  const { c } = useTheme();

  return (
    <Pressable onPress={() => void logout()} style={{ marginRight: 12 }}>
      <Text style={{ color: c.accent, fontWeight: '600' }}>Logout</Text>
    </Pressable>
  );
}

function HeaderAvatar() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const { c } = useTheme();
  const initials = `${(user?.first_name?.[0] || '')}${(user?.last_name?.[0] || '')}`.toUpperCase() || '·';
  return (
    <Pressable onPress={() => nav.navigate('Profile')} style={{ marginLeft: 12 }} hitSlop={8}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: c.accentInk, fontWeight: '600', fontSize: 12 }}>{initials}</Text>
      </View>
    </Pressable>
  );
}

/* ---------- Support Worker: nested stacks so the tab bar stays visible on detail screens ---------- */
function SWSignalsFlow() {
  return (
    <SWSignalsStack.Navigator screenOptions={{ headerShown: false }}>
      <SWSignalsStack.Screen name="SWSignals" component={SWSignalsScreen} />
      <SWSignalsStack.Screen name="SWRaiseSignal" component={SWRaiseSignalScreen} />
      <SWSignalsStack.Screen name="SWSignalDetail" component={SWSignalDetailScreen} />
      <SWSignalsStack.Screen name="SWSignalTimeline" component={SWSignalTimelineScreen} />
      <SWSignalsStack.Screen name="SWSignalUpdate" component={SWSignalUpdateScreen} />
    </SWSignalsStack.Navigator>
  );
}

function SWActionsFlow() {
  return (
    <SWActionsStack.Navigator screenOptions={{ headerShown: false }}>
      <SWActionsStack.Screen name="SWActions" component={SWMyActionsScreen} />
      <SWActionsStack.Screen name="ActionDetail" component={ActionDetailScreen} />
    </SWActionsStack.Navigator>
  );
}

function SupportWorkerTabs() {
  const { c } = useTheme(); // green — this component is rendered inside AccentProvider
  const { unread } = useNotifications();
  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: c.accent,
    tabBarInactiveTintColor: c.faint,
    tabBarStyle: { backgroundColor: c.card, borderTopColor: c.lineSoft },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
  };
  // Uniform with the other roles — "More" moved to the app drawer; the fourth tab is Alerts.
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Today" component={SWTodayScreen} options={{ tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="Signals" component={SWSignalsFlow} options={{ tabBarIcon: tabIcon('activity') }} />
      <Tab.Screen name="Actions" component={SWActionsFlow} options={{ tabBarIcon: tabIcon('check-square') }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ tabBarIcon: tabIcon('bell'), tabBarBadge: unread || undefined }} />
    </Tab.Navigator>
  );
}

function TeamLeaderTabs() {
  const { c } = useTheme(); // purple — rendered inside AccentProvider
  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: c.accent,
    tabBarInactiveTintColor: c.faint,
    tabBarStyle: { backgroundColor: c.card, borderTopColor: c.lineSoft },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
  };
  // Uniform with the RM layout — "More" moved to the app drawer; the fourth tab is Escalations.
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Today" component={TLMorningMeetingScreen} options={{ tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="Signals" component={TLSignalsScreen} options={{ tabBarIcon: tabIcon('activity') }} />
      <Tab.Screen name="Actions" component={TLMyActionsScreen} options={{ tabBarIcon: tabIcon('check-square') }} />
      <Tab.Screen name="Escalations" component={TLEscalationsScreen} options={{ tabBarIcon: tabIcon('flag') }} />
    </Tab.Navigator>
  );
}

function boardTabOptions(c: ReturnType<typeof useTheme>['c']) {
  return {
    headerShown: false,
    tabBarActiveTintColor: c.accent,
    tabBarInactiveTintColor: c.faint,
    tabBarStyle: { backgroundColor: c.card, borderTopColor: c.lineSoft },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
  };
}

function RegisteredManagerTabs() {
  const { c } = useTheme(); // blue accent
  // "More" is gone — its destinations moved to the app drawer (avatar, top-right). The fourth tab
  // is now My Actions, so the RM's own work is one tap away.
  return (
    <Tab.Navigator screenOptions={boardTabOptions(c)}>
      <Tab.Screen name="Home" component={RMDashboardScreen} options={{ tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="Signals" component={RMRiskRegisterScreen} options={{ tabBarIcon: tabIcon('activity') }} />
      <Tab.Screen name="Reports" component={RMReportsScreen} options={{ tabBarIcon: tabIcon('file-text') }} />
      <Tab.Screen name="My Actions" component={RMMyActionsScreen} options={{ tabBarIcon: tabIcon('check-square') }} />
    </Tab.Navigator>
  );
}

function DirectorTabs() {
  const { c } = useTheme(); // orange accent
  return (
    <Tab.Navigator screenOptions={boardTabOptions(c)}>
      <Tab.Screen name="Home" component={DirectorOverviewScreen} options={{ tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="Trends" component={DirectorTrendsScreen} options={{ tabBarIcon: tabIcon('trending-up') }} />
      <Tab.Screen name="Themes" component={DirectorThemesScreen} options={{ tabBarIcon: tabIcon('bar-chart-2') }} />
      <Tab.Screen name="Governance" component={DirectorGovernanceScreen} options={{ tabBarIcon: tabIcon('shield') }} />
    </Tab.Navigator>
  );
}

function ResponsibleIndividualTabs() {
  const { c } = useTheme(); // violet accent
  return (
    <Tab.Navigator screenOptions={boardTabOptions(c)}>
      <Tab.Screen name="Home" component={RIProviderAssuranceScreen} options={{ tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="Oversight" component={RIOversightScreen} options={{ tabBarIcon: tabIcon('grid') }} />
      <Tab.Screen name="Readiness" component={RIInspectionScreen} options={{ tabBarIcon: tabIcon('check-square') }} />
      <Tab.Screen name="Narrative" component={RINarrativeScreen} options={{ tabBarIcon: tabIcon('book-open') }} />
    </Tab.Navigator>
  );
}

function RoleTabs() {
  const { role } = useAuth();
  const { c } = useTheme();
  const { unread } = useNotifications();
  const alertsOptions = { tabBarIcon: tabIcon('bell'), tabBarBadge: unread || undefined };
  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: c.accent,
    tabBarInactiveTintColor: c.faint,
    tabBarStyle: { backgroundColor: c.card, borderTopColor: c.lineSoft },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
  };

  if (role === 'SUPPORT_WORKER') {
    return <AccentProvider role="green"><SupportWorkerTabs /></AccentProvider>;
  }
  if (role === 'REGISTERED_MANAGER' || role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return <AccentProvider role="blue"><RegisteredManagerTabs /></AccentProvider>;
  }
  if (role === 'DIRECTOR') {
    return <AccentProvider role="orange"><DirectorTabs /></AccentProvider>;
  }
  if (role === 'RESPONSIBLE_INDIVIDUAL') {
    return <AccentProvider role="violet"><ResponsibleIndividualTabs /></AccentProvider>;
  }
  // Team Leader (default)
  return <AccentProvider role="purple"><TeamLeaderTabs /></AccentProvider>;
}

// Pushed hub screens live at the root (outside the tab's AccentProvider), so wrap each in its
// role accent to keep buttons/links on-brand. Defined at module scope for stable identity.
const withAccent = (role: React.ComponentProps<typeof AccentProvider>['role'], C: React.ComponentType) =>
  function Accented() { return <AccentProvider role={role}><C /></AccentProvider>; };

const TLEscalationsA = withAccent('purple', TLEscalationsScreen);
const TLDocumentsA = withAccent('purple', TLDocumentsScreen);
const TLNotesA = withAccent('purple', TLNotesScreen);
const TLMyActionsA = withAccent('purple', TLMyActionsScreen);
const TLDailyReviewA = withAccent('purple', TLDailyReviewScreen);
const TLDailyGovernanceA = withAccent('purple', TLDailyGovernanceScreen);
const TLTeamOverviewA = withAccent('purple', TLTeamOverviewScreen);
const RMEscalationsA = withAccent('blue', RMEscalationsScreen);
const RMGovernanceReviewA = withAccent('blue', RMGovernanceReviewScreen);
const RMHouseOverviewA = withAccent('blue', RMHouseOverviewScreen);
const RMComplianceA = withAccent('blue', RMComplianceScreen);
const RMMyActionsA = withAccent('blue', RMMyActionsScreen);
const DirectorGovernanceA = withAccent('orange', DirectorGovernanceScreen);
const DirectorReportsA = withAccent('orange', DirectorReportsScreen);
const RINarrativeA = withAccent('violet', RINarrativeScreen);
const RIBoardReportsA = withAccent('violet', RIBoardReportsScreen);

export function RootNavigator() {
  const { c } = useTheme();
  const { role } = useAuth();
  // Every role now uses board-style screens that carry their own in-content title, so the
  // app-chrome header is hidden on the tab shell (pushed hub screens keep their own back-bar).
  const boardRole = ['SUPPORT_WORKER', 'TEAM_LEADER', 'REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'].includes(role);
  const headerOptions = {
    headerStyle: { backgroundColor: c.paper },
    headerTitleStyle: { color: c.ink },
    headerTintColor: c.accent,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: c.paper },
  };
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="Tabs"
        component={RoleTabs}
        options={{
          title: 'OrdinCore',
          headerShown: !boardRole,
          headerLeft: () => <HeaderAvatar />,
          headerRight: () => <LogoutButton />,
        }}
      />
      <Stack.Screen name="RaiseSignal" component={RaiseSignalScreen} options={{ title: 'Raise a signal', presentation: 'modal' }} />
      <Stack.Screen name="SignalDetail" component={SignalDetailScreen} options={{ title: 'Signal' }} />
      <Stack.Screen name="RiskDetail" component={RiskDetailScreen} options={{ title: 'Risk' }} />
      <Stack.Screen name="ReportDetail" component={ReportDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="SWEscalations" component={SWEscalationsScreen} options={{ title: 'My Escalations' }} />
      <Stack.Screen name="Promote" component={PromoteScreen} options={{ title: 'Promote to risk' }} />
      <Stack.Screen name="CloseRisk" component={CloseRiskScreen} options={{ title: 'Close risk' }} />
      <Stack.Screen name="ValidateReview" component={ValidateReviewScreen} options={{ title: 'Validate review' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="MyWork" component={MyWorkScreen} options={{ title: 'My Work' }} />
      <Stack.Screen name="RateEffectiveness" component={RateEffectivenessScreen} options={{ title: 'Rate effectiveness' }} />
      <Stack.Screen name="ActionDetail" component={ActionDetailScreen} options={{ title: 'Action' }} />
      <Stack.Screen name="TLEscalations" component={TLEscalationsA} options={{ title: 'Escalations' }} />
      <Stack.Screen name="TLDocuments" component={TLDocumentsA} options={{ title: 'Documents' }} />
      <Stack.Screen name="TLNotes" component={TLNotesA} options={{ title: 'Notes' }} />
      <Stack.Screen name="TLMyActions" component={TLMyActionsA} options={{ title: 'My actions' }} />
      <Stack.Screen name="TLDailyGovernance" component={TLDailyGovernanceA} options={{ title: 'Daily Governance' }} />
      <Stack.Screen name="TLDailyReview" component={TLDailyReviewA} options={{ title: '' }} />
      <Stack.Screen name="TLTeamOverview" component={TLTeamOverviewA} options={{ title: '' }} />
      {/* RM / Director / RI hub screens carry their own in-content header, so the nav bar is a bare back-bar */}
      <Stack.Screen name="RMEscalations" component={RMEscalationsA} options={{ title: '' }} />
      <Stack.Screen name="RMGovernanceReview" component={RMGovernanceReviewA} options={{ title: '' }} />
      <Stack.Screen name="RMHouseOverview" component={RMHouseOverviewA} options={{ title: '' }} />
      <Stack.Screen name="RMCompliance" component={RMComplianceA} options={{ title: '' }} />
      <Stack.Screen name="RMMyActions" component={RMMyActionsA} options={{ title: '' }} />
      <Stack.Screen name="DirectorGovernance" component={DirectorGovernanceA} options={{ title: '' }} />
      <Stack.Screen name="DirectorReports" component={DirectorReportsA} options={{ title: '' }} />
      <Stack.Screen name="RINarrative" component={RINarrativeA} options={{ title: '' }} />
      <Stack.Screen name="RIBoardReports" component={RIBoardReportsA} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
