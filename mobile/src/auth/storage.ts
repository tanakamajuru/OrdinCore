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

  // Native: the bearer token / cached profile live ONLY in the secure keychain/keystore.
  // If SecureStore is unavailable, fail closed (return null) instead of reading a credential
  // from plaintext AsyncStorage — the user simply re-authenticates (security P4.14).
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
};

const writeValue = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }

  // Native: never downgrade a bearer credential to plaintext storage. If the secure store
  // rejects the write, surface the error rather than silently persisting it less securely.
  await SecureStore.setItemAsync(key, value);
};

const removeValue = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* nothing to remove / secure store unavailable — the credential was never persisted here */
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
