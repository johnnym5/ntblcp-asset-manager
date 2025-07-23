
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
  login: (profile: { displayName: string, state: string, role: 'admin' | 'user' | 'guest', password?: string, passwordChanged?: boolean }) => void;
  updatePassword: (newPassword: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  userProfile: null,
  loading: true,
  profileSetupComplete: false,
  authInitialized: false,
  login: () => {},
  updatePassword: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  const { setAssets, setGlobalStateFilter } = useAppState();

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const savedProfileJson = localStorage.getItem('ntblcp-user-profile');
        if (savedProfileJson) {
            const savedProfile: UserProfile = JSON.parse(savedProfileJson);
            // Re-validate that the user is still in the authorized list.
            const authorizedUser = AUTHORIZED_USERS.find(u => u.loginName === savedProfile.loginName.toLowerCase());
            if (authorizedUser) {
              // The user is valid. Use the profile from local storage as the source of truth,
              // as it contains the potentially updated password.
              setUserProfile(savedProfile);
              setGlobalStateFilter(savedProfile.state);
            } else {
              // The user was removed from the authorized list in the code.
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

  const login = (profile: { displayName: string, state: string, role: 'admin' | 'user' | 'guest', password?: string, passwordChanged?: boolean }) => {
    const authorizedUser = AUTHORIZED_USERS.find(u => u.displayName === profile.displayName);
    if (!authorizedUser) return;

    // The user's saved profile is the source of truth for password.
    const savedProfileJson = localStorage.getItem('ntblcp-user-profile');
    const savedProfile = savedProfileJson ? JSON.parse(savedProfileJson) : null;

    let finalPassword = profile.password || authorizedUser.password;
    let finalPasswordChanged = profile.passwordChanged || authorizedUser.passwordChanged;
    
    // If a saved profile exists for this user, use its password details.
    if (savedProfile && savedProfile.loginName === authorizedUser.loginName) {
        finalPassword = savedProfile.password;
        finalPasswordChanged = savedProfile.passwordChanged;
    }

    const fullProfile: UserProfile = {
      ...authorizedUser,
      state: profile.state,
      password: finalPassword,
      passwordChanged: finalPasswordChanged,
    };

    localStorage.setItem('ntblcp-user-profile', JSON.stringify(fullProfile));
    setUserProfile(fullProfile);
    setGlobalStateFilter(profile.state);
  };
  
  const updatePassword = (newPassword: string) => {
    if (userProfile) {
        const updatedProfile = {
            ...userProfile,
            password: newPassword,
            passwordChanged: true,
        };
        localStorage.setItem('ntblcp-user-profile', JSON.stringify(updatedProfile));
        setUserProfile(updatedProfile);
    }
  };


  const logout = async () => {
    localStorage.removeItem('ntblcp-user-profile');
    setUserProfile(null);
    setGlobalStateFilter('');
    setAssets([]); 
    window.location.reload(); 
  };
  
  const profileSetupComplete = !!userProfile;

  const value = { userProfile, loading, profileSetupComplete, login, logout, authInitialized, updatePassword };

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
