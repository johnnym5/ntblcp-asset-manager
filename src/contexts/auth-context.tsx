
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';
import { AUTHORIZED_USERS } from '@/lib/authorized-users';
import type { AuthorizedUser } from '@/lib/authorized-users';
import { clearAssets as clearLocalAssets } from '@/lib/idb';
import { ensureAnonymousSession } from '@/lib/auth';


export interface UserProfile extends AuthorizedUser {
  state: string; // The specific state the user is currently logged into.
}

interface AuthContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  profileSetupComplete: boolean;
  authInitialized: boolean;
  login: (profile: { displayName: string, state: string, role: 'admin' | 'user' }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  userProfile: null,
  loading: true,
  profileSetupComplete: false,
  authInitialized: false,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  const { setAssets, setGlobalStateFilter } = useAppState();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Step 1: Ensure we have an anonymous Firebase session for Firestore access.
        await ensureAnonymousSession();
        setAuthInitialized(true); // Firebase connection is now ready.

        // Step 2: Check for a locally saved user profile for the UI.
        const savedProfileJson = localStorage.getItem('ntblcp-user-profile');
        if (savedProfileJson) {
            const savedProfile: UserProfile = JSON.parse(savedProfileJson);
            const authorizedUser = AUTHORIZED_USERS.find(u => u.loginName === savedProfile.loginName);
            if (authorizedUser) {
                setUserProfile(savedProfile);
                setGlobalStateFilter(savedProfile.state);
                setProfileSetupComplete(true);
            } else {
                localStorage.removeItem('ntblcp-user-profile');
            }
        }
      } catch (error) {
          console.error("Firebase authentication failed:", error);
          // Handle auth error, maybe show a message to the user
      } finally {
          setLoading(false);
      }
    };
    
    initializeAuth();
  }, [setGlobalStateFilter]);

  const login = (profile: { displayName: string, state: string, role: 'admin' | 'user' }) => {
    const authorizedUser = AUTHORIZED_USERS.find(u => u.loginName === profile.displayName.toLowerCase());
    if (!authorizedUser) return;

    const fullProfile: UserProfile = {
      ...authorizedUser,
      state: profile.state,
    };

    localStorage.setItem('ntblcp-user-profile', JSON.stringify(fullProfile));
    setUserProfile(fullProfile);
    setGlobalStateFilter(profile.state);
    setProfileSetupComplete(true);
  };

  const logout = async () => {
    await clearLocalAssets();
    localStorage.removeItem('ntblcp-user-profile');
    setUserProfile(null);
    setProfileSetupComplete(false);
    setGlobalStateFilter('');
    setAssets([]); 
    window.location.reload(); // Force a full reload to clear all state
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
