import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParams } from './types';

// A module-level navigation ref so overlays that live OUTSIDE the navigator tree (the app drawer)
// can navigate without a useNavigation() context.
export const navigationRef = createNavigationContainerRef<RootStackParams>();

export function navigate(name: keyof RootStackParams, params?: any) {
  if (navigationRef.isReady()) (navigationRef as any).navigate(name, params);
}

// Jump to a specific tab inside the role tab shell.
export function navigateTab(tab: string) {
  if (navigationRef.isReady()) (navigationRef as any).navigate('Tabs', { screen: tab });
}
