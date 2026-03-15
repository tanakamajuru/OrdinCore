import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, LoginRequest, LoginResponse } from '@/types';
import { apiClient } from '@/services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');

      if (token) {
        try {
          // Validate token by calling /auth/me endpoint
          const response = await apiClient.me();
          if (response.success && response.data) {
            setUser(response.data as unknown as User);
          } else {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
          }
        } catch (error) {
          // If /auth/me fails, try falling back to stored user data
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch {
              localStorage.removeItem('authToken');
              localStorage.removeItem('user');
            }
          } else {
            console.error('Token validation failed:', error);
            localStorage.removeItem('authToken');
          }
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest): Promise<void> => {
    const response = await apiClient.login(credentials);

    if (response.success && response.data) {
      const { user: userData } = response.data;
      setUser(userData);
    } else {
      throw new Error((response as any).message || 'Login failed');
    }
  };

  const logout = (): void => {
    apiClient.logout().catch(console.error);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('refreshToken');
  };

  const refreshToken = async (): Promise<void> => {
    try {
      const response = await apiClient.refreshToken();

      if (response.success && response.data) {
        const { user: userData } = response.data;
        setUser(userData);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
