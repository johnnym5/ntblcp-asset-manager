
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';

export interface UserProfile {
  displayName: string;
  state: string;
  role: 'admin' | 'user' | 'guest';
}

interface AuthContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  profileSetupComplete: boolean;
  authInitialized: boolean;
  login: (profile: UserProfile) => void;
  logout: () => void;
}

// Provide a default admin context to bypass login entirely.
const defaultAdminProfile: UserProfile = {
  displayName: 'Admin',
  state: 'All',
  role: 'admin',
};

const AuthContext = createContext<AuthContextType>({
  userProfile: defaultAdminProfile,
  loading: false,
  profileSetupComplete: true,
  authInitialized: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { setGlobalStateFilter } = useAppState();

  // Set the global filter to 'All' on initial load since we are always an admin.
  useEffect(() => {
    setGlobalStateFilter('All');
  }, [setGlobalStateFilter]);

  const value = { 
    userProfile: defaultAdminProfile, 
    loading: false, 
    profileSetupComplete: true, 
    authInitialized: true,
    login: () => {}, // No-op
    logout: () => {}, // No-op
  };

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
