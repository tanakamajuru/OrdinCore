/**
 * navigation/makeRoleDrawer.tsx
 * Factory that wraps any role's bottom-tab navigator in a drawer whose
 * content is the shared AppDrawer component. Keeps Director, RM, Care
 * Worker, Team Leader and RI all using the exact same nav shell.
 */
import React from 'react';
import { createDrawerNavigator, type DrawerContentComponentProps } from '@react-navigation/drawer';
import { AppDrawer, type DrawerNavItem } from '@/components/AppDrawer';

export function makeRoleDrawer({
  role,
  orgName,
  navItems,
  tabNavigator,
  tabRouteName,
  tabScreenKeys,
  onSelectExtra,
}: {
  role: string;
  orgName: string;
  navItems: DrawerNavItem[];
  tabNavigator: React.ComponentType<any>;
  tabRouteName: string;
  /** Drawer keys that map 1:1 onto tab screen names inside tabNavigator. */
  tabScreenKeys: string[];
  /** Handle drawer items that aren't tabs (Reports, Settings, etc.) */
  onSelectExtra?: (key: string, nav: any) => void;
}) {
  const Drawer = createDrawerNavigator();

  function DrawerContent(props: DrawerContentComponentProps) {
    const nestedState = props.state.routes[props.state.index]?.state as any;
    const activeRoute = nestedState?.routeNames?.[nestedState.index ?? 0] ?? tabScreenKeys[0];

    return (
      <AppDrawer
        role={role}
        orgName={orgName}
        items={navItems}
        activeKey={activeRoute}
        onSelect={(key) => {
          props.navigation.closeDrawer();
          if (tabScreenKeys.includes(key)) {
            props.navigation.navigate(tabRouteName, { screen: key });
          } else {
            onSelectExtra?.(key, props.navigation);
          }
        }}
      />
    );
  }

  return function RoleDrawer() {
    return (
      <Drawer.Navigator
        screenOptions={{ headerShown: false, drawerStyle: { width: '78%' } }}
        drawerContent={(props) => <DrawerContent {...props} />}
      >
        <Drawer.Screen name={tabRouteName} component={tabNavigator} />
      </Drawer.Navigator>
    );
  };
}
