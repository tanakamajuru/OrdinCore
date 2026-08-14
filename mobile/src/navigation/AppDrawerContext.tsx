/**
 * navigation/AppDrawerContext.tsx
 * Lightweight open/close context for the custom slide-in drawer. Screens call
 * useAppDrawer().openDrawer() from their BoardHeader menu button instead of
 * dispatching DrawerActions (which required @react-navigation/drawer +
 * reanimated). Reanimated-free so the app runs in Expo Go and any existing
 * native build with no rebuild.
 */
import { createContext, useContext } from 'react';

export type AppDrawerApi = { openDrawer: () => void; closeDrawer: () => void };

export const AppDrawerContext = createContext<AppDrawerApi>({
  openDrawer: () => {},
  closeDrawer: () => {},
});

export const useAppDrawer = () => useContext(AppDrawerContext);
