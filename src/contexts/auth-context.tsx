
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';
import { v4 as uuidv4 } from 'uuid';
import type { AuthorizedUser } from '@/lib/types';
import { clearLocalAssets, clearLockedOfflineAssets } from '@/lib/idb';


export interface LocalUserProfile {
  id: string; // Unique ID for this user session
  loginName: string;
  displayName: string;
  states: string[];
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
  initialSetupPending: boolean;
  login: (user: AuthorizedUser) => Promise<void>;
  logout: () => void;
  completeInitialSetup: () => void;
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
  const [initialSetupPending, setInitialSetupPending] = useState(false);
  
  const { appSettings, settingsLoaded, setAssets, setOfflineAssets } = useAppState();

  useEffect(() => {
    if (!settingsLoaded || !appSettings) {
      return;
    }

    try {
      const savedProfileJSON = localStorage.getItem('ntblcp-user-profile');
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
              canVerifyAssets: authorizedUser.canVerifyAssets,
           };

          localStorage.setItem('ntblcp-user-profile', JSON.stringify(freshProfile));
          setUserProfile(freshProfile);
          setProfileSetupComplete(true);
          setInitialSetupPending(false);
        } else {
          // Stale profile, clear it
          localStorage.removeItem('ntblcp-user-profile');
          setUserProfile(null);
          setProfileSetupComplete(false);
          setInitialSetupPending(false);
        }
      } else {
        // No profile, so no setup pending and not complete
        setUserProfile(null);
        setProfileSetupComplete(false);
        setInitialSetupPending(false);
      }
    } catch (e) {
      console.error("Failed to process user profile from local storage", e);
      localStorage.removeItem('ntblcp-user-profile');
      setUserProfile(null);
      setProfileSetupComplete(false);
      setInitialSetupPending(false);
    } finally {
      setLoading(false);
      setAuthInitialized(true);
    }
  }, [settingsLoaded, appSettings]);

  const login = async (user: AuthorizedUser) => {
    setLoading(true);
    const isNewDevice = !localStorage.getItem('ntblcp-user-profile');

    const newProfile: LocalUserProfile = {
      id: uuidv4(),
      loginName: user.loginName,
      displayName: user.displayName,
      states: user.states,
      isAdmin: user.isAdmin,
      isGuest: user.isGuest,
      canAddAssets: user.canAddAssets,
      canEditAssets: user.canEditAssets,
      canVerifyAssets: user.canVerifyAssets,
    };
    try {
      localStorage.setItem('ntblcp-user-profile', JSON.stringify(newProfile));
      setUserProfile(newProfile);
      
      if (isNewDevice) {
        setInitialSetupPending(true);
      } else {
        setProfileSetupComplete(true);
      }

    } catch(e) {
      console.error("Failed to save user profile", e);
    } finally {
      setLoading(false);
    }
  };

  const completeInitialSetup = () => {
    setInitialSetupPending(false);
    setProfileSetupComplete(true);
  }

  const logout = async () => {
    setLoading(true);
    localStorage.removeItem('ntblcp-user-profile');
    setUserProfile(null);
    setProfileSetupComplete(false);
    setInitialSetupPending(false);

    try {
      await clearLocalAssets();
      await clearLockedOfflineAssets();
      setAssets([]);
      setOfflineAssets([]);
    } catch (e) {
      console.error("Failed to clear local databases on logout", e);
    }

    window.location.href = '/';
  };

  const value = { userProfile, loading, login, logout, authInitialized, profileSetupComplete, initialSetupPending, completeInitialSetup };

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
