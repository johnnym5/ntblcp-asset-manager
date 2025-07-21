
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';
import { v4 as uuidv4 } from 'uuid';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';


export interface LocalUserProfile {
  id: string; // Unique ID for this user session
  displayName: string;
  state: string; 
  isAdmin: boolean;
  loginName: string; // The lowercase name used for checks
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
    // This app no longer uses Firebase Auth. We just check for a local profile.
    const initializeAuth = async () => {
      try {
          const savedProfile = localStorage.getItem('ntblcp-user-profile');
          if (savedProfile) {
              const profile: LocalUserProfile = JSON.parse(savedProfile);
              // Verify the user still exists in the Firestore `users` collection
              const userDocRef = doc(db, "users", profile.loginName);
              const userDoc = await getDoc(userDocRef);

              if (userDoc.exists()) {
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
    };
    initializeAuth();
  }, []);

  const updateProfile = async (data: { displayName: string; state: string; }) => {
    setLoading(true);
    const loginName = data.displayName.toLowerCase().trim();

    if (loginName === 'guest') {
       const guestProfile: LocalUserProfile = {
        id: uuidv4(),
        displayName: "Guest",
        loginName: "guest",
        state: "All",
        isAdmin: false,
      };
      localStorage.setItem('ntblcp-user-profile', JSON.stringify(guestProfile));
      setUserProfile(guestProfile);
      setProfileSetupComplete(true);
      setLoading(false);
      return;
    }


    const userDocRef = doc(db, "users", loginName);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.error("Attempted to create a profile for an unauthorized user.");
      setLoading(false);
      // Here you might want to return an error to the UI
      throw new Error("User not found.");
    }

    const authorizedUser = userDoc.data();

    const newProfile: LocalUserProfile = {
      id: uuidv4(),
      displayName: authorizedUser.displayName, // Use the proper-cased name from DB
      loginName: loginName,
      state: data.state,
      isAdmin: authorizedUser.isAdmin || false,
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
    window.location.reload(); // Force a hard reload to ensure all state is cleared
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
