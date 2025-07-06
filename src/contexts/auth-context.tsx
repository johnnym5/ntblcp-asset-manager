
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
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Mock a logged-in guest user and profile to bypass auth and Firestore checks
    const mockUser = {
      uid: 'mock-guest-uid',
      isAnonymous: true,
      displayName: 'Guest User',
      email: null,
      photoURL: null,
    } as User;

    const mockProfile: UserProfile = {
      uid: 'mock-guest-uid',
      email: null,
      displayName: 'Guest User',
      role: 'admin', // Give admin role to avoid any client-side permission checks
      state: 'Lagos', // Give a default state to bypass state selector
    };
    
    setUser(mockUser);
    setUserProfile(mockProfile);
    setLoading(false);
    
    // Return an empty unsubscribe function
    return () => {};
  }, []);

  const value = { user, userProfile, loading };

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
