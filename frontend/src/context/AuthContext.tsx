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
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Validate token by getting current user info
          // This would require an endpoint like /api/auth/me
          // For now, we'll assume the token is valid if it exists
          setIsLoading(false);
        } catch (error) {
          console.error('Token validation failed:', error);
          localStorage.removeItem('token');
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      const response = await apiClient.login(credentials);
      
      if (response.success && response.data) {
        const { user: userData } = response.data;
        setUser(userData);
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = (): void => {
    try {
      apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
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
