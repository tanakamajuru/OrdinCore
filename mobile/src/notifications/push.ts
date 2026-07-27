import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '@/api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true,
    shouldShowBanner: true, shouldShowList: true,
  }),
});

// Register for push and hand the Expo token to the backend so the existing notifications
// pipeline (action assigned, escalation acknowledged, effectiveness due…) can reach the device.
export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Governance alerts',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#0e7490',
    });
  }
  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return null;

  try {
    const projectId = (Constants.expoConfig as any)?.extra?.eas?.projectId ?? (Constants as any)?.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    // Best-effort: the endpoint may not exist yet server-side — never block the app on it.
    try { await api.post('/notifications/register-device', { token, platform: Platform.OS }); } catch { /* noop */ }
    return token;
  } catch {
    return null;
  }
}
