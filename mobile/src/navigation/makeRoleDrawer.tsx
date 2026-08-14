/**
 * navigation/makeRoleDrawer.tsx
 * Factory that wraps a role's bottom-tab navigator in a custom slide-in
 * drawer whose content is the shared AppDrawer component. Built on core
 * React Native (Animated + Modal) — NO @react-navigation/drawer and NO
 * reanimated — so the app boots in Expo Go and any existing native build
 * without a rebuild. Keeps Director, RM, Care Worker, Team Leader and RI
 * all using the exact same nav shell.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Modal, Pressable, Animated, Dimensions } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppDrawer, type DrawerNavItem } from '@/components/AppDrawer';
import { AppDrawerContext } from './AppDrawerContext';
import { navigationRef } from './navRef';
import { useAuth } from '@/auth/AuthContext';

function DrawerOverlay({
  open,
  onClose,
  role,
  orgName,
  items,
  activeKey,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  role: string;
  orgName: string;
  items: DrawerNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const width = Math.round(Dimensions.get('window').width * 0.82);
  const tx = useRef(new Animated.Value(-width)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(tx, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(tx, { toValue: -width, duration: 200, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Animated.View style={{ width, transform: [{ translateX: tx }] }}>
          <AppDrawer role={role} orgName={orgName} items={items} activeKey={activeKey} onSelect={onSelect} />
        </Animated.View>
        <Animated.View style={{ flex: 1, opacity: fade, backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
      </View>
    </Modal>
  );
}

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
  const Stack = createNativeStackNavigator();

  return function RoleShell() {
    const [open, setOpen] = useState(false);
    const [activeKey, setActiveKey] = useState(tabScreenKeys[0]);
    const { logout } = useAuth();

    const openDrawer = useCallback(() => setOpen(true), []);
    const closeDrawer = useCallback(() => setOpen(false), []);

    const handleSelect = (key: string) => {
      closeDrawer();
      if (key === 'LogOut') {
        logout();
        return;
      }
      if (tabScreenKeys.includes(key)) {
        setActiveKey(key);
        if (navigationRef.isReady()) (navigationRef as any).navigate(tabRouteName, { screen: key });
      } else {
        onSelectExtra?.(key, navigationRef);
      }
    };

    return (
      <AppDrawerContext.Provider value={{ openDrawer, closeDrawer }}>
        <View style={{ flex: 1 }}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name={tabRouteName} component={tabNavigator} />
          </Stack.Navigator>
          <DrawerOverlay
            open={open}
            onClose={closeDrawer}
            role={role}
            orgName={orgName}
            items={navItems}
            activeKey={activeKey}
            onSelect={handleSelect}
          />
        </View>
      </AppDrawerContext.Provider>
    );
  };
}
