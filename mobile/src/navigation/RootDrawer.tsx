/**
 * navigation/RootDrawer.tsx
 * Wraps DirectorNavigator with a React Navigation drawer whose content is
 * the custom AppDrawer component (matches the sidebar screenshot exactly,
 * rather than the stock drawer look).
 */
import React from 'react';
import { createDrawerNavigator, type DrawerContentComponentProps } from '@react-navigation/drawer';
import { DirectorNavigator } from './DirectorNavigator';
import { AppDrawer, type DrawerNavItem } from '@/components/AppDrawer';

const Drawer = createDrawerNavigator();

const navItems: DrawerNavItem[] = [
  { key: 'MyWork', label: 'My Work', icon: 'clipboard', badge: 6 },
  { key: 'Home', label: 'Home', icon: 'home' },
  { key: 'Trends', label: 'Trends', icon: 'bar-chart-2' },
  { key: 'Themes', label: 'Themes', icon: 'compass' },
  { key: 'Governance', label: 'Governance', icon: 'shield' },
  { key: 'Reports', label: 'Reports', icon: 'file-text' },
  { key: 'Profile', label: 'Profile', icon: 'user' },
  { key: 'Help', label: 'Help', icon: 'help-circle' },
  { key: 'Settings', label: 'Settings', icon: 'settings' },
];

function DrawerContent(props: DrawerContentComponentProps) {
  const activeRoute = props.state.routeNames[props.state.index];
  return (
    <AppDrawer
      role="Director"
      orgName="Gella Care Services"
      items={navItems}
      activeKey={activeRoute}
      onSelect={(key) => {
        props.navigation.closeDrawer();
        if (['Home', 'Trends', 'Themes', 'Governance', 'MyWork'].includes(key)) {
          props.navigation.navigate('DirectorTabs', { screen: key });
        }
        // Reports / Profile / Help / Settings would route to their own
        // stacks once implemented — left as no-ops in this reference build.
      }}
    />
  );
}

export function RootDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false, drawerStyle: { width: '78%' } }}
      drawerContent={(props) => <DrawerContent {...props} />}
    >
      <Drawer.Screen name="DirectorTabs" component={DirectorNavigator} />
    </Drawer.Navigator>
  );
}
