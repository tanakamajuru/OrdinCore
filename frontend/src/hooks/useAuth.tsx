import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { apiClient } from '@/services/api';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'DIRECTOR' | 'RESPONSIBLE_INDIVIDUAL' | 'REGISTERED_MANAGER' | 'TEAM_LEADER' | 'super-admin' | 'admin' | 'director' | 'responsible-individual' | 'registered-manager' | 'team-leader';
  company_id?: string;
  assigned_house_id?: string;
  assigned_house_name?: string;
  pulse_days?: string[];
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

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('authToken');

      if (storedToken) {
        try {
          // Validate token by calling /auth/me
          const response = await apiClient.me();
          if (response.success && response.data) {
            const userData = response.data as unknown as User;
            setUser(userData);
            setToken(storedToken);
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('userRole', userData.role);
          } else {
            // Token invalid
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
          }
        } catch {
          // Token expired or server error — fall back to stored user data
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
              setToken(storedToken);
            } catch {
              localStorage.removeItem('authToken');
              localStorage.removeItem('user');
            }
          } else {
            localStorage.removeItem('authToken');
          }
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
    } else {
      throw new Error((response as any).message || 'Login failed');
    }
  };

  const logout = () => {
    apiClient.logout().catch(console.error);
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
  };

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
