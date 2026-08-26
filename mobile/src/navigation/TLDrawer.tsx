/**
 * navigation/TLDrawer.tsx
 * Team Leader drawer — wraps the Team Leader bottom-tab navigator in the same
 * shared slide-in sidebar every other role uses (My Work, Signals, Actions,
 * Escalations, Governance Brief + Log Out), so the sidebar is available on the
 * Team Leader interface exactly as it is for RM / Director / RI.
 */
import { makeRoleDrawer } from './makeRoleDrawer';
import { TeamLeaderNavigator } from './TeamLeaderNavigator';

export const TLDrawer = makeRoleDrawer({
  role: 'Team Leader',
  orgName: 'Your service',
  tabNavigator: TeamLeaderNavigator,
  tabRouteName: 'TLTabs',
  tabScreenKeys: ['Today', 'Signals', 'Actions', 'Escalations'],
  navItems: [
    { key: 'Today', label: 'Today', icon: 'calendar' },
    { key: 'MyWork', label: 'My Work', icon: 'clipboard' },
    { key: 'Signals', label: 'Signals', icon: 'radio' },
    { key: 'Actions', label: 'Actions', icon: 'check-square' },
    { key: 'Escalations', label: 'Escalations', icon: 'alert-triangle' },
    { key: 'GovernanceBrief', label: 'Governance Brief', icon: 'file-text' },
  ],
  // MyWork and GovernanceBrief live inside the Today tab's nested stack.
  onSelectExtra: (key, nav) => {
    if (key === 'MyWork') nav.navigate('TLTabs', { screen: 'Today', params: { screen: 'MyWork' } });
    if (key === 'GovernanceBrief') nav.navigate('TLTabs', { screen: 'Today', params: { screen: 'GovernanceBrief' } });
  },
});
