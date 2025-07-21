
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';

export interface UserProfile {
  displayName: string;
  state: string;
  role: 'admin' | 'user' | 'guest';
}

interface AuthContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  profileSetupComplete: boolean;
  login: (profile: UserProfile) => void;
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { setAssets, setGlobalStateFilter } = useAppState();

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('ntblcp-user-profile');
      if (savedProfile) {
        const profile: UserProfile = JSON.parse(savedProfile);
        setUserProfile(profile);
        setGlobalStateFilter(profile.state);
      }
    } catch (e) {
      console.error("Failed to load user profile", e);
    } finally {
      setLoading(false);
    }
  }, [setGlobalStateFilter]);

  const login = (profile: UserProfile) => {
    setLoading(true);
    try {
      localStorage.setItem('ntblcp-user-profile', JSON.stringify(profile));
      setUserProfile(profile);
      setGlobalStateFilter(profile.state);
    } catch (e) {
      console.error("Failed to save user profile", e);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setLoading(true);
    localStorage.removeItem('ntblcp-user-profile');
    setUserProfile(null);
    setAssets([]); // Clear assets from state
    window.location.reload(); // Force a hard reload to ensure all state is cleared
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
