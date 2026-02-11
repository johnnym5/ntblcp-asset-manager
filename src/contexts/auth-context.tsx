'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';
import { v4 as uuidv4 } from 'uuid';
import type { AuthorizedUser } from '@/lib/types';


export interface LocalUserProfile {
  id: string; // Unique ID for this user session
  loginName: string;
  displayName: string;
  state: string; 
  isAdmin: boolean;
  isGuest?: boolean;
  canAddAssets?: boolean;
  canEditAssets?: boolean;
  canVerifyAssets?: boolean;
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
  password: 'setup',
  states: ['All'],
  isAdmin: true,
  isGuest: false,
  canAddAssets: true,
  canEditAssets: true,
  canVerifyAssets: true,
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<LocalUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  const { appSettings, settingsLoaded } = useAppState();

  useEffect(() => {
    // Wait until settings are loaded from local DB or first-time setup
    if (!settingsLoaded) return;

    try {
      const savedProfileJSON = localStorage.getItem('ntblcp-user-profile');
      if (savedProfileJSON) {
        const savedProfile: LocalUserProfile = JSON.parse(savedProfileJSON);
        
        // If there are no settings, we can't validate the user, so log them out.
        if (!appSettings) {
          localStorage.removeItem('ntblcp-user-profile');
          setUserProfile(null);
          setProfileSetupComplete(false);
          return;
        }

        const allUsers = [...appSettings.authorizedUsers, superAdmin];
        const authorizedUser = allUsers.find(u => u.loginName === savedProfile.loginName);
        
        if (authorizedUser) {
           // Always rebuild the profile from the source of truth (appSettings)
           // to ensure permissions are always up-to-date.
           const freshProfile: LocalUserProfile = {
              id: savedProfile.id || uuidv4(),
              loginName: authorizedUser.loginName,
              displayName: authorizedUser.displayName,
              state: savedProfile.state, // The chosen state is session-specific, so we keep it.
              isAdmin: authorizedUser.isAdmin,
              isGuest: authorizedUser.isGuest,
              canAddAssets: authorizedUser.canAddAssets,
              canEditAssets: authorizedUser.canEditAssets,
              canVerifyAssets: authorizedUser.canVerifyAssets,
           };

          localStorage.setItem('ntblcp-user-profile', JSON.stringify(freshProfile));
          setUserProfile(freshProfile);
          setProfileSetupComplete(true);
        } else {
          // User from storage is no longer in the authorized list.
          localStorage.removeItem('ntblcp-user-profile');
          setUserProfile(null);
          setProfileSetupComplete(false);
        }
      } else {
        setUserProfile(null);
        setProfileSetupComplete(false);
      }
    } catch (e) {
      console.error("Failed to process user profile from local storage", e);
      localStorage.removeItem('ntblcp-user-profile');
      setUserProfile(null);
      setProfileSetupComplete(false);
    } finally {
      setLoading(false);
      setAuthInitialized(true);
    }
  }, [settingsLoaded, appSettings]);

  const login = async (user: AuthorizedUser, state: string) => {
    setLoading(true);
    const newProfile: LocalUserProfile = {
      id: uuidv4(),
      loginName: user.loginName,
      displayName: user.displayName,
      state: state,
      isAdmin: user.isAdmin,
      isGuest: user.isGuest,
      canAddAssets: user.canAddAssets,
      canEditAssets: user.canEditAssets,
      canVerifyAssets: user.canVerifyAssets,
    };
    try {
      localStorage.setItem('ntblcp-user-profile', JSON.stringify(newProfile));
      setUserProfile(newProfile);
      setProfileSetupComplete(true);
    } catch(e) {
      console.error("Failed to save user profile", e);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    localStorage.removeItem('ntblcp-user-profile');
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
