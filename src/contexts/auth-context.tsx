
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';
import { AUTHORIZED_USERS } from '@/lib/authorized-users';
import type { AuthorizedUser } from '@/lib/authorized-users';
import { clearAssets as clearLocalAssets } from '@/lib/idb';


export interface UserProfile extends AuthorizedUser {
  state: string; // The specific state the user is currently logged into.
}

interface AuthContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  profileSetupComplete: boolean;
  authInitialized: boolean;
  login: (profile: { displayName: string, state: string, role: 'admin' | 'user' | 'guest' }) => void;
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
  const [authInitialized, setAuthInitialized] = useState(false);
  
  const { setAssets, setGlobalStateFilter } = useAppState();

  useEffect(() => {
    // This effect runs only on the client, after the initial render.
    // This prevents hydration errors.
    const initializeAuth = () => {
      try {
        const savedProfileJson = localStorage.getItem('ntblcp-user-profile');
        if (savedProfileJson) {
            const savedProfile: UserProfile = JSON.parse(savedProfileJson);
            const authorizedUser = AUTHORIZED_USERS.find(u => u.loginName === savedProfile.loginName.toLowerCase());
            
            if (authorizedUser) {
                // Restore the valid session
                setUserProfile(savedProfile);
                setGlobalStateFilter(savedProfile.state);
            } else {
                // Clear invalid profile from storage
                localStorage.removeItem('ntblcp-user-profile');
            }
        }
      } catch (error) {
          console.error("Auth initialization failed:", error);
          localStorage.removeItem('ntblcp-user-profile');
      } finally {
          setAuthInitialized(true);
          setLoading(false);
      }
    };
    
    initializeAuth();
  }, [setGlobalStateFilter]);

  const login = (profile: { displayName: string, state: string, role: 'admin' | 'user' | 'guest' }) => {
    const authorizedUser = AUTHORIZED_USERS.find(u => u.displayName === profile.displayName);
    if (!authorizedUser) return;

    const fullProfile: UserProfile = {
      ...authorizedUser,
      state: profile.state,
    };

    localStorage.setItem('ntblcp-user-profile', JSON.stringify(fullProfile));
    setUserProfile(fullProfile);
    setGlobalStateFilter(profile.state);
  };

  const logout = async () => {
    localStorage.removeItem('ntblcp-user-profile');
    setUserProfile(null);
    setGlobalStateFilter('');
    setAssets([]); 
    window.location.reload(); 
  };
  
  const profileSetupComplete = !!userProfile;

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
