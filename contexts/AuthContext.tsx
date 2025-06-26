import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';
import Cookies from 'js-cookie';

interface User {
  id: number;
  email: string;
  full_name: string;
  veterinary_license?: string;
  role: 'admin' | 'vet' | 'staff' | 'trial';
  is_active: boolean;
  trial_expires_at?: string;
  subscription_plan: string;
  created_at: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    full_name: string;
    veterinary_license?: string;
  }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  trialDaysRemaining: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('auth_token');
    const refreshToken = Cookies.get('refresh_token');
    if (token && refreshToken) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
      
      // Check if trial has expired
      if (userData.role === 'trial' && userData.trial_expires_at) {
        const trialExpiry = new Date(userData.trial_expires_at);
        const now = new Date();
        if (now > trialExpiry) {
          // Trial expired, could show a notification here
          console.warn('Trial period has expired');
        }
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      Cookies.remove('auth_token');
      Cookies.remove('refresh_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { user } = await authAPI.login(email, password);
      setUser(user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    full_name: string;
    veterinary_license?: string;
  }) => {
    try {
      const { user } = await authAPI.register(userData);
      setUser(user);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    authAPI.logout();
  };

  // Calculate trial days remaining
  const trialDaysRemaining = user?.role === 'trial' && user?.trial_expires_at
    ? Math.max(0, Math.ceil((new Date(user.trial_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    trialDaysRemaining,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};