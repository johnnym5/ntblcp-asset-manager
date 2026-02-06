
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';
import { v4 as uuidv4 } from 'uuid';
import type { AuthorizedUser } from '@/lib/types';


export interface LocalUserProfile {
  id: string; // Unique ID for this user session
  loginName: string;
  displayName: string;
  email: string;
  state: string; 
  isAdmin: boolean;
  isGuest?: boolean;
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<LocalUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  const { setAssets, appSettings, setAppSettings } = useAppState();

  useEffect(() => {
    // If the authorized user list hasn't loaded yet, we can't make a decision.
    // We must wait for it to be populated by the AppStateProvider.
    if (appSettings.authorizedUsers.length === 0) {
      // As a special case, if there's no saved profile in local storage,
      // we know for sure the user is logged out, so we can initialize early.
      if (!localStorage.getItem('ntblcp-user-profile')) {
          setLoading(false);
          setAuthInitialized(true);
      }
      // Otherwise, we wait for the user list to load before proceeding.
      return;
    }

    // This part of the effect runs only after the authorized user list is available.
    try {
      const savedProfile = localStorage.getItem('ntblcp-user-profile');
      if (savedProfile) {
        const profile: LocalUserProfile = JSON.parse(savedProfile);
        // Check if the user from local storage is still in the authorized list
        const authorizedUser = appSettings.authorizedUsers.find(u => u.loginName === profile.loginName);
        
        if (authorizedUser) {
          // The user is valid, restore their session.
          setUserProfile(profile);
          setProfileSetupComplete(true);
        } else {
          // The user is no longer authorized, so clear their stale profile.
          localStorage.removeItem('ntblcp-user-profile');
        }
      }
    } catch (e) {
      console.error("Failed to process user profile from local storage", e);
      // Clear potentially corrupted data
      localStorage.removeItem('ntblcp-user-profile');
    } finally {
      // Whether a user was found or not, we have completed the authentication check.
      setLoading(false);
      setAuthInitialized(true);
    }
  }, [appSettings.authorizedUsers]);

  const login = async (user: AuthorizedUser, state: string) => {
    setLoading(true);
    const newProfile: LocalUserProfile = {
      id: uuidv4(),
      loginName: user.loginName,
      displayName: user.displayName,
      email: user.email,
      state: state,
      isAdmin: user.isAdmin,
      isGuest: user.isGuest,
      canAddAssets: user.canAddAssets,
      canEditAssets: user.canEditAssets,
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
