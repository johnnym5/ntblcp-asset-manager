
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';

export interface LocalUserProfile {
  id: string;
  displayName: string;
  state: string; 
  role: 'admin' | 'user' | 'guest';
}

interface AuthContextType {
  userProfile: LocalUserProfile | null;
  loading: boolean;
  profileSetupComplete: boolean;
  login: (profile: Omit<LocalUserProfile, 'id'>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  userProfile: null,
  loading: true,
  profileSetupComplete: false,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<LocalUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { setAssets } = useAppState();

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('ntblcp-user-profile');
      if (savedProfile) {
        setUserProfile(JSON.parse(savedProfile));
      }
    } catch (e) {
      console.error("Failed to load user profile", e);
      localStorage.removeItem('ntblcp-user-profile');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (profile: Omit<LocalUserProfile, 'id'>) => {
    const newProfile: LocalUserProfile = {
      id: `${profile.displayName}-${Date.now()}`,
      ...profile,
    };
    localStorage.setItem('ntblcp-user-profile', JSON.stringify(newProfile));
    setUserProfile(newProfile);
  };

  const logout = () => {
    localStorage.removeItem('ntblcp-user-profile');
    setUserProfile(null);
    setAssets([]);
    window.location.href = '/'; 
  };

  const profileSetupComplete = !!userProfile;
  const value = { userProfile, loading, profileSetupComplete, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
