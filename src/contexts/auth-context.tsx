
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserProfile, getUserProfile } from '@/lib/firestore';
import type { UserProfile } from '@/lib/types';
import { 
  saveLocalUserProfile, 
  getLocalUserProfile, 
  clearLocalUserProfile 
} from '@/lib/idb';
import { useAppState } from './app-state-context';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  profileSetupComplete: boolean;
  authInitialized: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  profileSetupComplete: false,
  authInitialized: false,
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const { setAssets } = useAppState();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        // Try fetching from local DB first for speed
        let profile = await getLocalUserProfile(firebaseUser.uid);
        if (!profile) {
          // If not in local, fetch from Firestore
          profile = await getUserProfile(firebaseUser.uid);
          if (!profile) {
            // If still no profile, it's likely a brand new user. Create a profile.
            // This happens on first-time social/phone login.
            profile = await createUserProfile(firebaseUser);
          }
        }
        
        setUserProfile(profile);
        await saveLocalUserProfile(profile); // Cache for next time
      } else {
        setUser(null);
        setUserProfile(null);
        await clearLocalUserProfile();
        setAssets([]); // Clear assets on logout
      }
      setLoading(false);
      setAuthInitialized(true); // Signal that the initial auth check is complete
    });

    return () => unsubscribe();
  }, [setAssets]);

  const logout = async () => {
    await auth.signOut();
  };
  
  const profileSetupComplete = !!userProfile;

  const value = { user, userProfile, loading, profileSetupComplete, logout, authInitialized };

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
