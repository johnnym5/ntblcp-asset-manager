'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';
import { v4 as uuidv4 } from 'uuid';
import type { AuthorizedUser } from '@/lib/types';
import { getLocalAssets, clearLocalAssets, saveLockedOfflineAssets } from '@/lib/idb';
import { getInitialAdminCreds } from '@/lib/auth-constants';
import { NIGERIAN_ZONES } from '@/lib/constants';


export interface LocalUserProfile {
  id: string; // Unique ID for this user session
  loginName: string;
  displayName: string;
  states: string[];
  isAdmin: boolean;
  isZonalAdmin?: boolean;
  assignedZone?: string;
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<LocalUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  const { appSettings, settingsLoaded, setAssets, setOfflineAssets, setFirstTimeSetupStatus, setGlobalStateFilters } = useAppState();

  useEffect(() => {
    if (!settingsLoaded || !appSettings) {
      return;
    }

    try {
      const savedProfileJSON = localStorage.getItem('assetain-user-profile');
      if (savedProfileJSON) {
        const savedProfile: LocalUserProfile = JSON.parse(savedProfileJSON);
        
        const { u: adminLogin, p: adminPass } = getInitialAdminCreds();
        const superAdmin: AuthorizedUser = {
          loginName: adminLogin,
          displayName: 'Super Admin',
          password: adminPass,
          states: ['All'],
          isAdmin: true,
          isGuest: false,
          canAddAssets: true,
          canEditAssets: true,
          canVerifyAssets: true,
        };

        const allUsers = [...(appSettings.authorizedUsers || []), superAdmin];
        const authorizedUser = allUsers.find(u => u.loginName === savedProfile.loginName);
        
        if (authorizedUser) {
           const freshProfile: LocalUserProfile = {
              id: savedProfile.id || uuidv4(),
              loginName: authorizedUser.loginName,
              displayName: authorizedUser.displayName,
              states: authorizedUser.states,
              isAdmin: authorizedUser.isAdmin,
              isZonalAdmin: authorizedUser.isZonalAdmin,
              assignedZone: authorizedUser.assignedZone,
              isGuest: authorizedUser.isGuest,
              canAddAssets: authorizedUser.canAddAssets,
              canEditAssets: authorizedUser.canEditAssets,
           };

          localStorage.setItem('assetain-user-profile', JSON.stringify(freshProfile));
          setUserProfile(freshProfile);
          setProfileSetupComplete(true);
        } else {
          localStorage.removeItem('assetain-user-profile');
          setUserProfile(null);
          setProfileSetupComplete(false);
        }
      } else {
        setUserProfile(null);
        setProfileSetupComplete(false);
      }
    } catch (e) {
      console.error("Failed to process user profile", e);
      localStorage.removeItem('assetain-user-profile');
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
      isZonalAdmin: user.isZonalAdmin,
      assignedZone: user.assignedZone,
      isGuest: user.isGuest,
      canAddAssets: user.canAddAssets,
      canEditAssets: user.canEditAssets,
    };

    try {
      localStorage.setItem('assetain-user-profile', JSON.stringify(newProfile));
      setUserProfile(newProfile);
      setProfileSetupComplete(true);

      // Handle Initial Context Scope
      if (user.isAdmin) {
          setGlobalStateFilters(['All']);
      } else if (user.isZonalAdmin && user.assignedZone) {
          const zoneStates = NIGERIAN_ZONES[user.assignedZone as keyof typeof NIGERIAN_ZONES] || [];
          setGlobalStateFilters(zoneStates);
      } else {
          setGlobalStateFilters(user.states.length > 0 ? [user.states[0]] : ['All']);
      }

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
    localStorage.removeItem('assetain-user-profile');
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

    setLoading(false);
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
