import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import * as Notifications from 'expo-notifications';
import { api } from '@/api/client';
import { WS_BASE_URL } from '@/config';
import { useAuth } from '@/auth/AuthContext';

export type Notif = {
  id: string; type?: string; title?: string; body?: string; link?: string;
  is_read?: boolean; read?: boolean; created_at?: string;
};

type Ctx = {
  notifications: Notif[];
  unread: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<Ctx>({ notifications: [], unread: 0, loading: false, refresh: async () => {}, markRead: async () => {}, markAllRead: async () => {} });

const isUnread = (n: Notif) => !(n.is_read ?? n.read);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { token, status } = useAuth();
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const refresh = useCallback(async () => {
    if (status !== 'authed') return;
    setLoading(true);
    try {
      const data = await api.get<any>('/notifications');
      const list: Notif[] = Array.isArray(data) ? data : data?.notifications || data?.items || [];
      setNotifications(list);
    } catch { /* keep current */ }
    finally { setLoading(false); }
  }, [status]);

  // Fetch + live socket while signed in.
  useEffect(() => {
    if (status !== 'authed' || !token) { setNotifications([]); return; }
    refresh();

    const socket = io(WS_BASE_URL, { auth: { token }, transports: ['websocket', 'polling'], reconnection: true });
    socketRef.current = socket;

    socket.on('notification', async (n: Notif) => {
      setNotifications((prev) => (prev.some((x) => x.id === n.id) ? prev : [{ ...n, is_read: false }, ...prev]));
      // Pop an OS-level banner even while the app is open — the "alert" on the device.
      try { await Notifications.scheduleNotificationAsync({ content: { title: n.title || 'OrdinCore', body: n.body || '' }, trigger: null }); } catch { /* no-op */ }
    });
    socket.on('connect', () => { refresh(); });

    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });

    return () => { sub.remove(); socket.off('notification'); socket.disconnect(); socketRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, token]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true, read: true } : n)));
    try { await api.patch(`/notifications/${id}/read`); } catch { /* optimistic */ }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read: true })));
    try { await api.patch('/notifications/read-all'); } catch { /* optimistic */ }
  }, []);

  const unread = notifications.filter(isUnread).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unread, loading, refresh, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
