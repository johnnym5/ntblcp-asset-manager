
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';
import { v4 as uuidv4 } from 'uuid';
import { clearAssets } from '@/lib/idb';
import type { UserProfile } from '@/lib/types';
import { addNotification } from '@/hooks/use-notifications';
import { db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';


interface LocalUserProfile {
  id: string; // Unique ID for this user session
  displayName: string;
  state: string; 
}

interface AuthContextType {
  userProfile: LocalUserProfile | null;
  loading: boolean;
  profileSetupComplete: boolean;
  updateProfile: (data: { displayName: string; state: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  userProfile: null,
  loading: true,
  profileSetupComplete: false,
  updateProfile: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<LocalUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);
  const { 
    setAssets, 
  } = useAppState();

  useEffect(() => {
    let isMounted = true;
    const loadProfile = () => {
      try {
        const savedProfile = localStorage.getItem('ntblcp-user-profile');
        if (savedProfile) {
          const profile: LocalUserProfile = JSON.parse(savedProfile);
          if (profile.displayName) {
             if (isMounted) {
                setUserProfile(profile);
                setProfileSetupComplete(true);
             }
          } else {
            localStorage.removeItem('ntblcp-user-profile');
          }
        }
      } catch (e) {
        console.error("Failed to load user profile from local storage", e);
      } finally {
        if (isMounted) {
            setLoading(false);
        }
      }
    };
    
    loadProfile();

    return () => {
        isMounted = false;
    };
  }, []);

  const updateProfile = async (data: { displayName: string; state: string }) => {
    setLoading(true);
    const newProfile: LocalUserProfile = {
      id: uuidv4(),
      displayName: data.displayName,
      state: data.state,
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
    localStorage.removeItem('ntblcp-user-profile');
    setUserProfile(null);
    setProfileSetupComplete(false);
    await clearAssets();
    setAssets([]); 
  };

  const value = { userProfile, loading, profileSetupComplete, updateProfile, logout };

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
