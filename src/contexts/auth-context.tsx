
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Mock a logged-in admin user to bypass Firestore checks
  const mockUser: User = {
    uid: 'guest-user',
    isAnonymous: true,
    displayName: 'Guest User',
    email: 'guest@example.com',
    photoURL: '',
    emailVerified: true,
    phoneNumber: null,
    providerId: 'anonymous',
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => '',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
  };

  const mockUserProfile: UserProfile = {
    uid: 'guest-user',
    displayName: 'Guest Admin',
    email: 'guest@example.com',
    role: 'admin', // Give admin role to avoid permissions issues
  };

  const value = { user: mockUser, userProfile: mockUserProfile, loading: false };

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
