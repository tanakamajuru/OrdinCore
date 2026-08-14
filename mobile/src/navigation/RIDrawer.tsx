/**
 * navigation/RIDrawer.tsx
 * Responsible Individual drawer — matches RI "Profile Menu" screenshot
 * (My Work, Home, Oversight, Readiness, Narrative, Board Reports, Profile,
 * Help & Guidance, Settings, Log Out).
 */
import { makeRoleDrawer } from './makeRoleDrawer';
import { RINavigator } from './RINavigator';

export const RIDrawer = makeRoleDrawer({
  role: 'Responsible Individual',
  orgName: 'Ordin Care Group',
  tabNavigator: RINavigator,
  tabRouteName: 'RITabs',
  tabScreenKeys: ['Home', 'Oversight', 'Readiness', 'Narrative', 'MyWork', 'BoardReports'],
  navItems: [
    { key: 'MyWork', label: 'My Work', icon: 'clipboard', badge: 5 },
    { key: 'Home', label: 'Home', icon: 'home' },
    { key: 'Oversight', label: 'Oversight', icon: 'compass' },
    { key: 'Readiness', label: 'Readiness', icon: 'shield' },
    { key: 'Narrative', label: 'Narrative', icon: 'calendar' },
    { key: 'BoardReports', label: 'Board Reports', icon: 'file-text' },
    { key: 'Profile', label: 'Profile', icon: 'user' },
    { key: 'Help', label: 'Help & Guidance', icon: 'help-circle' },
    { key: 'Settings', label: 'Settings', icon: 'settings' },
    { key: 'LogOut', label: 'Log Out', icon: 'log-out' },
  ],
});
