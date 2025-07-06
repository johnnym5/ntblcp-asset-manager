
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';

// Using a simplified profile for local-only use
interface LocalUserProfile {
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
  const { setGlobalStateFilter } = useAppState();

  useEffect(() => {
    // Load profile from local storage on initial render
    try {
      const savedProfile = localStorage.getItem('ntblcp-user-profile');
      if (savedProfile) {
        const profile: LocalUserProfile = JSON.parse(savedProfile);
        // Ensure the loaded profile is valid before setting it
        if (profile.displayName && profile.state) {
          setUserProfile(profile);
          setGlobalStateFilter(profile.state);
          setProfileSetupComplete(true);
        } else {
          // If profile is invalid, remove it
          localStorage.removeItem('ntblcp-user-profile');
        }
      }
    } catch (e) {
      console.error("Failed to load user profile from local storage", e);
    } finally {
      setLoading(false);
    }
  }, [setGlobalStateFilter]);

  const updateProfile = async (data: { displayName: string; state: string }) => {
    setLoading(true);
    const newProfile: LocalUserProfile = {
      displayName: data.displayName,
      state: data.state,
    };
    try {
      localStorage.setItem('ntblcp-user-profile', JSON.stringify(newProfile));
      setUserProfile(newProfile);
      setGlobalStateFilter(data.state);
      setProfileSetupComplete(true);
    } catch(e) {
      console.error("Failed to save user profile to local storage", e);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    try {
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
