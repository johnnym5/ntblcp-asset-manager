
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Using a simplified profile for local-only use
interface LocalUserProfile {
  displayName: string;
  state: string; // state can be '' for admin
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

const logActivity = async (profile: LocalUserProfile, activity: 'login' | 'logout') => {
  if (!profile || !profile.displayName || profile.displayName.toLowerCase().trim() === 'admin') {
    return; // Don't log for admin or if profile is incomplete
  }
  try {
    const activityLog = {
      id: uuidv4(),
      userName: profile.displayName,
      userState: profile.state,
      activity: activity,
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, "activity", activityLog.id), activityLog);
  } catch(error) {
    console.error("Failed to log user activity:", error);
  }
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<LocalUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);
  const { setGlobalStateFilter, isOnline } = useAppState();

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
                setGlobalStateFilter(profile.state || '');
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
  }, [setGlobalStateFilter]);

  const updateProfile = async (data: { displayName: string; state: string }) => {
    setLoading(true);
    const newProfile: LocalUserProfile = {
      displayName: data.displayName,
      state: data.state, // state will be '' for admin
    };
    try {
      localStorage.setItem('ntblcp-user-profile', JSON.stringify(newProfile));
      setUserProfile(newProfile);
      setGlobalStateFilter(data.state || ''); // Set filter to state, or empty for admin
      setProfileSetupComplete(true);
      if (isOnline) {
        await logActivity(newProfile, 'login');
      }
    } catch(e) {
      console.error("Failed to save user profile to local storage", e);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (isOnline && userProfile) {
        await logActivity(userProfile, 'logout');
      }
      localStorage.removeItem('ntblcp-user-profile');
      setUserProfile(null);
      setProfileSetupComplete(false);
      setGlobalStateFilter('');
    } catch (e) {
      console.error("Failed to clear user profile from local storage", e);
    }
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
