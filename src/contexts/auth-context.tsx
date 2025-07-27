
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';
import type { AuthorizedUser } from '@/lib/types';
import { updateSettings } from '@/lib/firestore';

export interface UserProfile extends AuthorizedUser {
  state: string; // The specific state the user is currently logged into.
}

interface AuthContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  profileSetupComplete: boolean;
  authInitialized: boolean;
  login: (profile: { displayName: string, state: string, password?: string }) => void;
  updatePassword: (newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  userProfile: null,
  loading: true,
  profileSetupComplete: false,
  authInitialized: false,
  login: () => {},
  updatePassword: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  const { setAssets, setGlobalStateFilter, appSettings, setAppSettings } = useAppState();

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const savedProfileJson = localStorage.getItem('ntblcp-user-profile');
        if (savedProfileJson) {
            const savedProfile: UserProfile = JSON.parse(savedProfileJson);
            
            // Find the authoritative user definition from the latest app settings
            const authorizedUser = appSettings.authorizedUsers.find(u => u.loginName === savedProfile.loginName?.toLowerCase());
            
            if (authorizedUser) {
              // Create the final profile by merging the authoritative definition with the saved one
              const finalProfile: UserProfile = {
                ...authorizedUser, // Base permissions and states from settings
                ...savedProfile,  // Overwrite with saved state, etc.
              };
              setUserProfile(finalProfile);
              setGlobalStateFilter(finalProfile.state);
            } else {
              // The user is no longer in the authorized list, so clear their profile
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
    
    // Wait until app settings (which contain users) are loaded from Firestore/defaults
    if (appSettings.authorizedUsers.length > 0) {
      initializeAuth();
    }
  }, [setGlobalStateFilter, appSettings.authorizedUsers]);


  const login = (profile: { displayName: string, state: string, password?: string }) => {
    const authorizedUser = appSettings.authorizedUsers.find(u => u.displayName === profile.displayName);
    if (!authorizedUser) return;

    const fullProfile: UserProfile = {
      ...authorizedUser,
      state: profile.state,
    };

    localStorage.setItem('ntblcp-user-profile', JSON.stringify(fullProfile));
    setUserProfile(fullProfile);
    setGlobalStateFilter(profile.state);
  };
  
  const updatePassword = async (newPassword: string) => {
    if (!userProfile) return;
    
    const updatedProfile: UserProfile = {
        ...userProfile,
        password: newPassword,
        passwordChanged: true,
    };

    setUserProfile(updatedProfile);
    localStorage.setItem('ntblcp-user-profile', JSON.stringify(updatedProfile));
    
    const newUsers = appSettings.authorizedUsers.map(u => 
        u.loginName === userProfile.loginName 
            ? { ...u, password: newPassword, passwordChanged: true } 
            : u
    );

    await updateSettings({ authorizedUsers: newUsers });
    setAppSettings(prev => ({ ...prev, authorizedUsers: newUsers }));
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
