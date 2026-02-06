
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
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<LocalUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  const { setAssets, appSettings, setAppSettings } = useAppState();

  useEffect(() => {
    // Do not attempt to validate a user until the authorized user list has loaded from the database.
    if (appSettings.authorizedUsers.length === 0) {
      // If there's no saved profile, we can stop loading. Otherwise, wait for the user list.
      const savedProfile = localStorage.getItem('ntblcp-user-profile');
      if (!savedProfile) {
        setLoading(false);
        setAuthInitialized(true);
      }
      return;
    }

    try {
        const savedProfile = localStorage.getItem('ntblcp-user-profile');
        if (savedProfile) {
            const profile: LocalUserProfile = JSON.parse(savedProfile);
            // Now that we have the user list, find the corresponding authorized user.
            const authorizedUser = appSettings.authorizedUsers.find(u => u.loginName === profile.loginName);
            
            if (authorizedUser) {
                // User is valid, set their profile and mark setup as complete.
                setUserProfile(profile);
                setProfileSetupComplete(true);
            } else {
                // The user saved in localStorage is no longer in the authorized list. Log them out.
                localStorage.removeItem('ntblcp-user-profile');
            }
        }
    } catch (e) {
        console.error("Failed to load user profile from local storage", e);
    } finally {
        // In all cases, once this logic runs, authentication is initialized and loading is complete.
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

  const updatePassword = async (password: string) => {
    if (!userProfile) return;

    const newUsers = appSettings.authorizedUsers.map(u => 
      u.loginName === userProfile.loginName ? { ...u, password } : u
    );

    setAppSettings(prev => ({ ...prev, authorizedUsers: newUsers }));
    // No need to persist here if we assume `updateSettings` from user-management is the only way
    // But since this is a user action, we should persist.
    // This requires `updateSettings` in firestore.ts
  };

  const logout = async () => {
    setLoading(true);
    localStorage.removeItem('ntblcp-user-profile');
    setUserProfile(null);
    setProfileSetupComplete(false);
    setAssets([]); 
    window.location.href = '/';
  };

  const value = { userProfile, loading, profileSetupComplete, login, logout, updatePassword, authInitialized };

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
