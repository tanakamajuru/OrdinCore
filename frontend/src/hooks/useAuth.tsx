import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { apiClient } from '@/services/api';
import { toast } from 'sonner';

// Security: end an unattended session automatically so an unlocked device can't be used by someone
// else. Any genuine user activity resets the timer.
const IDLE_LOGOUT_MS = 5 * 60 * 1000;

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'DIRECTOR' | 'RESPONSIBLE_INDIVIDUAL' | 'REGISTERED_MANAGER' | 'TEAM_LEADER' | 'super-admin' | 'admin' | 'director' | 'responsible-individual' | 'registered-manager' | 'team-leader';
  company_id?: string;
  assigned_house_id?: string;
  assigned_house_ids?: string[];
  assigned_house_name?: string;
  pulse_days?: string[];
  granted_roles?: string[];
  active_role?: string;
  primary_role?: string;
  profile?: {
    avatar_url?: string;
    job_title?: string;
    phone?: string;
  };
  isActive?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Single teardown for a session — clears every cached token/profile field and drops auth state.
  const clearSession = () => {
    setUser(null);
    setToken(null);
    ['authToken', 'user', 'userRole', 'userName', 'userEmail', 'userId', 'refreshToken'].forEach((k) => localStorage.removeItem(k));
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('authToken');

      if (storedToken) {
        // M-06 — fail CLOSED. The session is restored ONLY from a successful /auth/me. A rejected or
        // failed validation clears everything and returns the user to login — cached profile data
        // must never resurrect a logged-in interface.
        try {
          const response = await apiClient.me();
          if (response.success && response.data) {
            const userData = response.data as unknown as User;
            setUser(userData);
            setToken(storedToken);
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('userRole', userData.role);
          } else {
            clearSession();
          }
        } catch {
          clearSession();
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.login({ email, password });

    if (response.success && (response as any).data) {
      const { user: userData, token: userToken } = (response as any).data;
      setUser(userData);
      setToken(userToken);
      
      // Store authentication data consistently
      localStorage.setItem('authToken', userToken);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userRole', userData.role);
      localStorage.setItem('userName', `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email);
      localStorage.setItem('userEmail', userData.email);
      localStorage.setItem('userId', userData.id);
      // 45-day password expiry: the server flags an expired password; mark it so the app routes the
      // user to change it. Cleared when the password is successfully changed.
      if ((response as any).data.passwordExpired) localStorage.setItem('passwordExpired', '1');
      else localStorage.removeItem('passwordExpired');
    } else {
      throw new Error((response as any).message || 'Login failed');
    }
  };

  const logout = () => {
    apiClient.logout().catch(console.error);
    clearSession();
  };

  // Idle auto-logout: while signed in, reset a 5-minute timer on any activity; on expiry, end the
  // session (fail-closed) so an idle screen returns to login. Uses a ref so re-renders don't reset it.
  const idleTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!token) return;
    const endIdleSession = () => {
      try { sessionStorage.setItem('idleLogout', '1'); } catch { /* ignore */ }
      toast.message('Signed out after 5 minutes of inactivity.');
      logout();
    };
    const reset = () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(endIdleSession, IDLE_LOGOUT_MS);
    };
    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'visibilitychange'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true } as any));
    reset();
    return () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
