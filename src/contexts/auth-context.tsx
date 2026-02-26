
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';
import { v4 as uuidv4 } from 'uuid';
import type { AuthorizedUser } from '@/lib/types';
import { getLocalAssets, clearLocalAssets, saveLockedOfflineAssets } from '@/lib/idb';


export interface LocalUserProfile {
  id: string; // Unique ID for this user session
  loginName: string;
  displayName: string;
  states: string[];
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
  login: (user: AuthorizedUser) => Promise<void>;
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
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<LocalUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  const { appSettings, settingsLoaded, setAssets, setOfflineAssets, setFirstTimeSetupStatus } = useAppState();

  useEffect(() => {
    if (!settingsLoaded || !appSettings) {
      return;
    }

    try {
      const savedProfileJSON = localStorage.getItem('assetbase-user-profile');
      if (savedProfileJSON) {
        const savedProfile: LocalUserProfile & { state?: string } = JSON.parse(savedProfileJSON);
        
        const allUsers = [...(appSettings.authorizedUsers || []), superAdmin];
        const authorizedUser = allUsers.find(u => u.loginName === savedProfile.loginName);
        
        if (authorizedUser) {
           const freshProfile: LocalUserProfile = {
              id: savedProfile.id || uuidv4(),
              loginName: authorizedUser.loginName,
              displayName: authorizedUser.displayName,
              states: authorizedUser.states,
              isAdmin: authorizedUser.isAdmin,
              isGuest: authorizedUser.isGuest,
              canAddAssets: authorizedUser.canAddAssets,
              canEditAssets: authorizedUser.canEditAssets,
           };

          localStorage.setItem('assetbase-user-profile', JSON.stringify(freshProfile));
          setUserProfile(freshProfile);
          setProfileSetupComplete(true);
        } else {
          // Stale profile, clear it
          localStorage.removeItem('assetbase-user-profile');
          setUserProfile(null);
          setProfileSetupComplete(false);
        }
      } else {
        // No profile, so not complete
        setUserProfile(null);
        setProfileSetupComplete(false);
      }
    } catch (e) {
      console.error("Failed to process user profile from local storage", e);
      localStorage.removeItem('assetbase-user-profile');
      setUserProfile(null);
      setProfileSetupComplete(false);
    } finally {
      setLoading(false);
      setAuthInitialized(true);
    }
  }, [settingsLoaded, appSettings]);

  const login = async (user: AuthorizedUser) => {
    setLoading(true);

    const existingAssets = await getLocalAssets();
    const isFirstTimeLogin = existingAssets.length === 0;

    const newProfile: LocalUserProfile = {
      id: uuidv4(),
      loginName: user.loginName,
      displayName: user.displayName,
      states: user.states,
      isAdmin: user.isAdmin,
      isGuest: user.isGuest,
      canAddAssets: user.canAddAssets,
      canEditAssets: user.canEditAssets,
    };
    try {
      localStorage.setItem('assetbase-user-profile', JSON.stringify(newProfile));
      setUserProfile(newProfile);
      setProfileSetupComplete(true);

      if (isFirstTimeLogin && typeof window !== 'undefined' && navigator.onLine) {
        setFirstTimeSetupStatus('syncing');
      }

    } catch(e) {
      console.error("Failed to save user profile", e);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    localStorage.removeItem('assetbase-user-profile');
    setUserProfile(null);
    setProfileSetupComplete(false);

    try {
      await clearLocalAssets();
      await saveLockedOfflineAssets([]);
      setAssets([]);
      setOfflineAssets([]);
    } catch (e) {
      console.error("Failed to clear local databases on logout", e);
    }

    window.location.href = '/';
  };

  const value = { userProfile, loading, login, logout, authInitialized, profileSetupComplete };

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
