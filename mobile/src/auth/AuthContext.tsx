import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { api, setAuthToken, setRefreshToken, setOnRefreshFailed, setOnTokenRefreshed } from '@/api/client';
import { saveSession, loadSession, clearSession } from './storage';

export type Role =
  | 'SUPPORT_WORKER' | 'TEAM_LEADER' | 'REGISTERED_MANAGER' | 'DIRECTOR'
  | 'RESPONSIBLE_INDIVIDUAL' | 'ADMIN' | 'SUPER_ADMIN' | 'UNKNOWN';

export type User = {
  id?: string; user_id?: string; first_name?: string; last_name?: string;
  email?: string; role?: string; company_id?: string; assigned_house_ids?: string[];
};

type Status = 'loading' | 'unauthed' | 'locked' | 'authed';

type Ctx = {
  status: Status;
  user: User | null;
  role: Role;
  token: string | null;
  // Returns an MFA challenge when the account requires a second factor (privileged roles, or any
  // company with MFA_ENFORCE on) — the server has already emailed a one-time code at that point.
  // No session is established until verifyMfa completes it, mirroring the web login flow.
  login: (email: string, password: string) => Promise<{ mfaRequired?: boolean; mfaChallenge?: string }>;
  verifyMfa: (mfaChallenge: string, code: string) => Promise<void>;
  resendMfaCode: (mfaChallenge: string) => Promise<void>;
  unlock: () => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<Ctx>(null as any);

export const normalizeRole = (r?: string): Role => {
  const v = String(r || '').toUpperCase().replace(/-/g, '_');
  const known: Role[] = ['SUPPORT_WORKER', 'TEAM_LEADER', 'REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN'];
  if (v === 'RI') return 'RESPONSIBLE_INDIVIDUAL';
  if (v === 'RM') return 'REGISTERED_MANAGER';
  if (v === 'TL') return 'TEAM_LEADER';
  if (v === 'SW' || v === 'SUPPORT' || v === 'CARE_WORKER' || v === 'CAREWORKER') return 'SUPPORT_WORKER';
  return (known.includes(v as Role) ? v : 'UNKNOWN') as Role;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { token, user, refreshToken } = await loadSession();
      if (token) {
        setAuthToken(token);
        setRefreshToken(refreshToken);
        setToken(token);
        setUser(user);
        // A returning session is locked until the device owner re-authenticates.
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setStatus(hasHardware && enrolled ? 'locked' : 'authed');
      } else {
        setStatus('unauthed');
      }
    })();
  }, []);

  // If a silent refresh fails outright (refresh token itself expired/revoked), the client can't
  // recover on its own — fall back to the same fail-closed behaviour as any other invalid session.
  useEffect(() => {
    setOnRefreshFailed(() => { void logout(); });
    setOnTokenRefreshed((token, refreshToken) => {
      setToken(token);
      void saveSession(token, user, refreshToken);
    });
    return () => { setOnRefreshFailed(null); setOnTokenRefreshed(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Shared by password login and the MFA second factor — both end in a full session.
  const establishSession = useCallback(async (data: any) => {
    const token = data?.token as string | undefined;
    const refreshToken = data?.refreshToken as string | undefined;
    const u = data?.user as User;
    if (!token) throw new Error('No session token returned.');
    setAuthToken(token);
    setRefreshToken(refreshToken ?? null);
    setToken(token);
    await saveSession(token, u, refreshToken);
    setUser(u);
    setStatus('authed');
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data: any = await api.post('/auth/login', { email, password });
    if (data?.mfaRequired) return { mfaRequired: true, mfaChallenge: data.mfaChallenge as string };
    await establishSession(data);
    return {};
  }, [establishSession]);

  const verifyMfa = useCallback(async (mfaChallenge: string, code: string) => {
    const data: any = await api.post('/auth/mfa/verify', { mfaChallenge, code });
    await establishSession(data);
  }, [establishSession]);

  const resendMfaCode = useCallback(async (mfaChallenge: string) => {
    await api.post('/auth/mfa/resend', { mfaChallenge });
  }, []);

  const unlock = useCallback(async () => {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock OrdinCore',
      fallbackLabel: 'Use passcode',
    });
    if (res.success) { setStatus('authed'); return true; }
    return false;
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setAuthToken(null);
    setRefreshToken(null);
    setToken(null);
    setUser(null);
    setStatus('unauthed');
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, role: normalizeRole(user?.role), token, login, verifyMfa, resendMfaCode, unlock, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
