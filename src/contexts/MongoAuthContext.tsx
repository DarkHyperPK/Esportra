import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import apiClient from '@/lib/api';

interface User {
  _id: string;
  username: string;
  email: string;
  fullName: string;
  avatar?: string;
  bio?: string;
  role: 'casual' | 'organizer' | 'venue_owner' | 'admin';
  isAdmin: boolean;
  adminRoles: string[];
  isVerified: boolean;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  gamingProfile?: {
    favoriteGames: string[];
    skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'professional';
    achievements: Array<{
      title: string;
      description: string;
      earnedAt: Date;
    }>;
  };
  socialLinks?: {
    discord?: string;
    twitter?: string;
    twitch?: string;
    youtube?: string;
    website?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    username: string;
    email: string;
    password: string;
    fullName: string;
  }) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
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

export const MongoAuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await apiClient.getCurrentUser();
      if (response.success) {
        setUser(response.data.user);
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('token');
        apiClient.setToken(null);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('token');
      apiClient.setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.login(email, password);
      
      if (response.success) {
        setUser(response.data.user);
        apiClient.setToken(response.data.token);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: {
    username: string;
    email: string;
    password: string;
    fullName: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.register(userData);
      
      if (response.success) {
        setUser(response.data.user);
        apiClient.setToken(response.data.token);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    apiClient.setToken(null);
    localStorage.removeItem('token');
  };

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.updateProfile(profileData);
      
      if (response.success) {
        setUser(response.data.user);
      } else {
        throw new Error(response.message || 'Profile update failed');
      }
    } catch (err: any) {
      setError(err.message || 'Profile update failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await apiClient.getCurrentUser();
      if (response.success) {
        setUser(response.data.user);
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
