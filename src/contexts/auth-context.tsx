
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile, createUserProfile, updateUserProfile } from '@/lib/firestore';
import type { UserProfile } from '@/lib/types';
import { useAppState } from './app-state-context';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  profileSetupComplete: boolean;
  updateProfile: (data: { displayName: string; state: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  profileSetupComplete: false,
  updateProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);
  const { setGlobalStateFilter } = useAppState();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      if (authUser) {
        setUser(authUser);
        let profile = await getUserProfile(authUser.uid);
        if (!profile) {
          profile = await createUserProfile(authUser);
        }
        setUserProfile(profile);

        if (profile?.state) {
          setProfileSetupComplete(true);
          setGlobalStateFilter(profile.state);
        } else {
          setProfileSetupComplete(false);
          setGlobalStateFilter('');
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setProfileSetupComplete(false);
        setGlobalStateFilter('');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setGlobalStateFilter]);

  const updateProfile = async (data: { displayName: string; state: string }) => {
    if (user && userProfile) {
      setLoading(true);
      const updatedProfileData = {
        ...userProfile,
        displayName: data.displayName,
        state: data.state,
      };
      await updateUserProfile(user.uid, updatedProfileData);
      setUserProfile(updatedProfileData);
      setGlobalStateFilter(data.state);
      setProfileSetupComplete(true);
      setLoading(false);
    }
  };

  const value = { user, userProfile, loading, profileSetupComplete, updateProfile };

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
