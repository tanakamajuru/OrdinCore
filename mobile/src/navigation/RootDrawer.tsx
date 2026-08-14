/**
 * navigation/RootDrawer.tsx
 * Director shell — DirectorNavigator wrapped in the shared custom slide-in
 * drawer (AppDrawer content), via makeRoleDrawer. Reanimated-free.
 */
import { makeRoleDrawer } from './makeRoleDrawer';
import { DirectorNavigator } from './DirectorNavigator';

export const RootDrawer = makeRoleDrawer({
  role: 'Director',
  orgName: 'Gella Care Services',
  tabNavigator: DirectorNavigator,
  tabRouteName: 'DirectorTabs',
  tabScreenKeys: ['Home', 'Trends', 'Themes', 'Governance', 'MyWork'],
  navItems: [
    { key: 'MyWork', label: 'My Work', icon: 'clipboard', badge: 6 },
    { key: 'Home', label: 'Home', icon: 'home' },
    { key: 'Trends', label: 'Trends', icon: 'bar-chart-2' },
    { key: 'Themes', label: 'Themes', icon: 'compass' },
    { key: 'Governance', label: 'Governance', icon: 'shield' },
    { key: 'Reports', label: 'Reports', icon: 'file-text' },
    { key: 'Profile', label: 'Profile', icon: 'user' },
    { key: 'Help', label: 'Help', icon: 'help-circle' },
    { key: 'Settings', label: 'Settings', icon: 'settings' },
  ],
});
