import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api } from '@/api/client';

// Offline-first capture. A signal (or action update) raised without a connection is persisted
// on the device and flushed automatically on reconnect — a calm queue, never a lost record.

export type QueuedItem = {
  id: string;
  kind: 'signal' | 'action-complete';
  path: string;
  body: any;
  createdAt: number;
  label: string;
};

const KEY = 'ordincore.queue';
type Listener = (items: QueuedItem[]) => void;
const listeners = new Set<Listener>();

async function read(): Promise<QueuedItem[]> {
  try { return JSON.parse((await AsyncStorage.getItem(KEY)) || '[]'); } catch { return []; }
}
async function write(items: QueuedItem[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l(items));
}

export const queue = {
  subscribe(l: Listener) { listeners.add(l); read().then(l); return () => listeners.delete(l); },

  async list() { return read(); },

  async enqueue(item: Omit<QueuedItem, 'id' | 'createdAt'>) {
    const items = await read();
    const full: QueuedItem = { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now() };
    items.push(full);
    await write(items);
    void queue.flush();
    return full;
  },

  // Try to send everything. Items that fail (offline / server error) stay queued for next time.
  async flush() {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;
    const items = await read();
    if (!items.length) return;
    const remaining: QueuedItem[] = [];
    for (const it of items) {
      try { await api.post(it.path, it.body); }
      catch { remaining.push(it); }
    }
    await write(remaining);
  },
};

// Flush whenever connectivity returns.
NetInfo.addEventListener((state) => { if (state.isConnected) void queue.flush(); });
