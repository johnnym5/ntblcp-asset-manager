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
    if (!settingsLoaded) {
      // Don't validate auth until the app settings (and thus authorized users) have been loaded.
      return;
    }

    try {
      const savedProfile = localStorage.getItem('ntblcp-user-profile');
      if (savedProfile) {
        const profile: LocalUserProfile = JSON.parse(savedProfile);
        
        const allUsers = [...appSettings.authorizedUsers, superAdmin];
        const authorizedUser = allUsers.find(u => u.loginName === profile.loginName);
        
        if (authorizedUser) {
          // User is valid. Check if permissions need to be updated in the current session.
          const permissionsChanged =
            (profile.isAdmin ?? false) !== (authorizedUser.isAdmin ?? false) ||
            (profile.canAddAssets ?? false) !== (authorizedUser.canAddAssets ?? false) ||
            (profile.canEditAssets ?? false) !== (authorizedUser.canEditAssets ?? false) ||
            (profile.canVerifyAssets ?? false) !== (authorizedUser.canVerifyAssets ?? false);

          let currentSessionProfile = profile;
          if (permissionsChanged) {
            // Permissions have changed in the main settings, so we update the active session profile
            currentSessionProfile = {
              ...profile,
              isAdmin: authorizedUser.isAdmin,
              canAddAssets: authorizedUser.canAddAssets,
              canEditAssets: authorizedUser.canEditAssets,
              canVerifyAssets: authorizedUser.canVerifyAssets,
            };
            // And also update localStorage so it's correct for the next page load
            localStorage.setItem('ntblcp-user-profile', JSON.stringify(currentSessionProfile));
          }
          setUserProfile(currentSessionProfile);
          setProfileSetupComplete(true);
        } else {
          // The user is no longer authorized (or the list is empty), so clear their stale profile.
          localStorage.removeItem('ntblcp-user-profile');
          setUserProfile(null);
          setProfileSetupComplete(false);
        }
      } else {
        // No profile in local storage, ensure state is cleared.
        setUserProfile(null);
        setProfileSetupComplete(false);
      }
    } catch (e) {
      console.error("Failed to process user profile from local storage", e);
      // Clear potentially corrupted data
      localStorage.removeItem('ntblcp-user-profile');
      setUserProfile(null);
      setProfileSetupComplete(false);
    } finally {
      // Whether a user was found or not, we have completed the authentication check.
      setLoading(false);
      setAuthInitialized(true);
    }
  }, [settingsLoaded, appSettings.authorizedUsers]);

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
