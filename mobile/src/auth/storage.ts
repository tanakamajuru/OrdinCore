import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Safeguarding-adjacent data never sits in plain cache — the session token and cached user
// profile live in the device keychain / keystore via expo-secure-store when available.
// On web or unsupported environments, we fall back to AsyncStorage so the app still works.
const TOKEN_KEY = 'ordincore.token';
const USER_KEY = 'ordincore.user';

const readValue = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
};

const writeValue = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
};

const removeValue = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    await AsyncStorage.removeItem(key);
  }
};

export const saveSession = async (token: string, user: any) => {
  await writeValue(TOKEN_KEY, token);
  await writeValue(USER_KEY, JSON.stringify(user ?? null));
};

export const loadSession = async (): Promise<{ token: string | null; user: any | null }> => {
  const token = await readValue(TOKEN_KEY);
  const rawUser = await readValue(USER_KEY);
  let user: any = null;
  try { user = rawUser ? JSON.parse(rawUser) : null; } catch { user = null; }
  return { token, user };
};

export const clearSession = async () => {
  await removeValue(TOKEN_KEY);
  await removeValue(USER_KEY);
};
