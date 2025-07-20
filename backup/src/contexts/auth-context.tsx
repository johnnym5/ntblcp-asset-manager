
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';
import { v4 as uuidv4 } from 'uuid';
import { clearAssets } from '@/lib/idb';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AUTHORIZED_USERS } from '@/lib/authorized-users';


interface LocalUserProfile {
  id: string; // Unique ID for this user session
  displayName: string;
  state: string; 
  isAdmin: boolean;
}

interface AuthContextType {
  userProfile: LocalUserProfile | null;
  loading: boolean;
  profileSetupComplete: boolean;
  authInitialized: boolean;
  updateProfile: (data: { displayName: string; state: string; }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  userProfile: null,
  loading: true,
  profileSetupComplete: false,
  authInitialized: false,
  updateProfile: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<LocalUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  const { 
    setAssets, 
  } = useAppState();

  useEffect(() => {
    // This app doesn't use Firebase Auth for users, but we still need to wait for the SDK to be ready.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        try {
            const savedProfile = localStorage.getItem('ntblcp-user-profile');
            if (savedProfile) {
                const profile: LocalUserProfile = JSON.parse(savedProfile);
                const authorizedUser = AUTHORIZED_USERS.find(u => u.loginName === profile.displayName.toLowerCase());
                
                if (authorizedUser) {
                    setUserProfile(profile);
                    setProfileSetupComplete(true);
                } else {
                    // The saved user is no longer authorized. Clear the profile.
                    localStorage.removeItem('ntblcp-user-profile');
                }
            }
        } catch (e) {
            console.error("Failed to load user profile from local storage", e);
        } finally {
            setLoading(false);
            setAuthInitialized(true);
        }
    });

    return () => unsubscribe();
  }, []);

  const updateProfile = async (data: { displayName: string; state: string; }) => {
    setLoading(true);
    const authorizedUser = AUTHORIZED_USERS.find(u => u.loginName === data.displayName.toLowerCase());
    if (!authorizedUser) {
      // This should ideally not happen if the UI is correct, but as a safeguard:
      console.error("Attempted to create a profile for an unauthorized user.");
      setLoading(false);
      return;
    }

    const newProfile: LocalUserProfile = {
      id: uuidv4(),
      displayName: authorizedUser.displayName, // Use the proper-cased name
      state: data.state,
      isAdmin: authorizedUser.isAdmin,
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
    // Don't clear assets on logout, just reset the view
    setAssets([]); 
    window.location.href = '/'; // Force a hard reload to ensure all state is cleared
  };

  const value = { userProfile, loading, profileSetupComplete, updateProfile, logout, authInitialized };

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
