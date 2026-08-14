/**
 * navigation/RMDrawer.tsx
 * Registered Manager drawer content, matching the "Drawer Menu" list
 * shown in the RM Mobile reference sheet (My Work, Site Overview,
 * Weekly Governance, Reports, Help & Guidance, Profile/Settings).
 */
import { makeRoleDrawer } from './makeRoleDrawer';
import { RMNavigator } from './RMNavigator';

export const RMDrawer = makeRoleDrawer({
  role: 'Registered Manager',
  orgName: 'Bashit A',
  tabNavigator: RMNavigator,
  tabRouteName: 'RMTabs',
  tabScreenKeys: ['Home', 'Risks', 'Escalations', 'Actions'],
  navItems: [
    { key: 'Home', label: 'Home', icon: 'home' },
    { key: 'Actions', label: 'My Work', icon: 'clipboard', badge: 9 },
    { key: 'SiteOverview', label: 'Site Overview', icon: 'grid' },
    { key: 'WeeklyGovernance', label: 'Weekly Governance', icon: 'shield' },
    { key: 'Reports', label: 'Reports', icon: 'file-text' },
    { key: 'Help', label: 'Help & Guidance', icon: 'help-circle' },
    { key: 'Settings', label: 'Profile / Settings', icon: 'settings' },
  ],
  // SiteOverview / WeeklyGovernance live inside the "Actions" tab's nested
  // stack (see RMNavigator.ActionsStackNavigator) rather than as top-level
  // tabs, so route to that nested screen explicitly.
  onSelectExtra: (key, nav) => {
    if (key === 'SiteOverview' || key === 'WeeklyGovernance') {
      nav.navigate('RMTabs', { screen: 'Actions', params: { screen: key } });
    }
    // Reports / Help / Settings would route to their own stacks once
    // implemented — no-ops in this reference build.
  },
});
