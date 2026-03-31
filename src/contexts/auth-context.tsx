'use client';

/**
 * @fileOverview AuthContext - Identity & Access Gateway.
 * Hardened to prioritize deep hydration before releasing the UI.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';
import { v4 as uuidv4 } from 'uuid';
import type { AuthorizedUser, UserRole } from '@/types/domain';

export interface LocalUserProfile {
  id: string; 
  loginName: string;
  displayName: string;
  email: string;
  state: string; 
  isAdmin: boolean;
  role: UserRole;
  canAddAssets?: boolean;
  canEditAssets?: boolean;
}

interface AuthContextType {
  userProfile: LocalUserProfile | null;
  loading: boolean;
  profileSetupComplete: boolean;
  authInitialized: boolean;
  login: (user: AuthorizedUser, state: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const superAdmin: AuthorizedUser = {
  loginName: 'admin',
  displayName: 'Super Admin',
  email: 'admin',
  password: 'setup',
  states: ['All'],
  isAdmin: true,
  role: 'ADMIN',
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<LocalUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  const { appSettings, settingsLoaded, isHydrated } = useAppState();

  useEffect(() => {
    // CRITICAL: Block until the local database hydration pulse is complete.
    // This ensures no per-page loading screens after initial entry.
    if (!settingsLoaded || !isHydrated) {
      return;
    }

    try {
      const savedProfile = localStorage.getItem('assetain-user-session');
      if (savedProfile) {
        const profile: LocalUserProfile = JSON.parse(savedProfile);
        const authorizedUsersList = appSettings?.authorizedUsers || [];
        const allUsers = [...authorizedUsersList, superAdmin];
        const authorizedUser = allUsers.find(u => u.loginName === profile.loginName);
        
        if (authorizedUser) {
          setUserProfile(profile);
          setProfileSetupComplete(true);
        } else {
          localStorage.removeItem('assetain-user-session');
          setUserProfile(null);
          setProfileSetupComplete(false);
        }
      } else {
        setUserProfile(null);
        setProfileSetupComplete(false);
      }
    } catch (e) {
      console.error("Auth: Failed to restore session pulse", e);
      localStorage.removeItem('assetain-user-session');
      setUserProfile(null);
      setProfileSetupComplete(false);
    } finally {
      setLoading(false);
      setAuthInitialized(true);
    }
  }, [settingsLoaded, isHydrated, appSettings]);

  const login = async (user: AuthorizedUser, state: string) => {
    setLoading(true);
    const newProfile: LocalUserProfile = {
      id: uuidv4(),
      loginName: user.loginName,
      displayName: user.displayName,
      email: user.email,
      state: state,
      isAdmin: user.isAdmin || user.role === 'ADMIN',
      role: user.role,
    };
    
    try {
      localStorage.setItem('assetain-user-session', JSON.stringify(newProfile));
      setUserProfile(newProfile);
      setProfileSetupComplete(true);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    localStorage.removeItem('assetain-user-session');
    setUserProfile(null);
    setProfileSetupComplete(false);
    window.location.href = '/';
  };

  const value = { userProfile, loading, profileSetupComplete, login, logout, authInitialized };

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
