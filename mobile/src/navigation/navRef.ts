/**
 * navigation/navRef.ts
 * Container-level navigation ref so the custom drawer overlay (which lives
 * outside any navigator) can drive navigation without React Navigation's
 * reanimated-based Drawer.
 */
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();
