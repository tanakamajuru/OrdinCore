/**
 * navigation/CareWorkerDrawer.tsx
 * Care Worker drawer — wraps the Care Worker bottom-tab navigator in the same
 * shared slide-in sidebar every other role uses (Today, My Signals, My Actions,
 * Alerts, Raise Signal + Log Out), so the sidebar is available on the Care
 * Worker interface exactly as it is for the other roles.
 */
import { makeRoleDrawer } from './makeRoleDrawer';
import { CareWorkerNavigator } from './CareWorkerNavigator';

export const CareWorkerDrawer = makeRoleDrawer({
  role: 'Care Worker',
  orgName: 'Your service',
  tabNavigator: CareWorkerNavigator,
  tabRouteName: 'CWTabs',
  tabScreenKeys: ['Today', 'Signals', 'Actions', 'Alerts'],
  navItems: [
    { key: 'Today', label: 'Today', icon: 'sun' },
    { key: 'Signals', label: 'My Signals', icon: 'list' },
    { key: 'Actions', label: 'My Actions', icon: 'check-square' },
    { key: 'Alerts', label: 'Alerts', icon: 'bell' },
    { key: 'RaiseSignal', label: 'Raise Signal', icon: 'plus-circle' },
  ],
  // Raise Signal is a modal push inside the Today tab's nested stack.
  onSelectExtra: (key, nav) => {
    if (key === 'RaiseSignal') nav.navigate('CWTabs', { screen: 'Today', params: { screen: 'RaiseSignal' } });
  },
});
