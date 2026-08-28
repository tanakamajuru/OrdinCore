import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

// At-rest protection for the offline queue (security P4.13). Sensitive signal/action payloads
// are AES-encrypted before they touch AsyncStorage; the 256-bit key lives in the device
// keychain/keystore via expo-secure-store, so a stolen/lost device does not expose queued
// safeguarding data. No second queue is introduced — this only protects the existing one.
const KEY_NAME = 'ordincore.queue.key';
let cachedKey: string | null = null;

async function getKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  let existing: string | null = null;
  try { existing = await SecureStore.getItemAsync(KEY_NAME); } catch { existing = null; }
  const key: string = existing || CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex); // 256-bit
  if (!existing) {
    try { await SecureStore.setItemAsync(KEY_NAME, key); } catch { /* key remains in-memory for this session only */ }
  }
  cachedKey = key;
  return key;
}

export async function encryptBlob(plain: string): Promise<string> {
  const key = await getKey();
  return CryptoJS.AES.encrypt(plain, key).toString();
}

export async function decryptBlob(cipher: string): Promise<string | null> {
  const key = await getKey();
  try {
    const out = CryptoJS.AES.decrypt(cipher, key).toString(CryptoJS.enc.Utf8);
    return out || null;
  } catch {
    return null;
  }
}
