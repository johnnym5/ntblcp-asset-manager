
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { listenForAssetChanges } from '@/lib/firestore';
import type { Asset } from '@/lib/types';
import { getLocalAssets, saveAssets } from '@/lib/idb';
import { NIGERIAN_STATES } from '@/lib/constants';

interface LocalUserProfile {
  displayName: string;
  state: string; 
}

interface AuthContextType {
  userProfile: LocalUserProfile | null;
  loading: boolean;
  profileSetupComplete: boolean;
  updateProfile: (data: { displayName: string; state: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  userProfile: null,
  loading: true,
  profileSetupComplete: false,
  updateProfile: async () => {},
  logout: async () => {},
});

const logActivity = async (profile: LocalUserProfile, activity: 'login' | 'logout') => {
  if (!profile || !profile.displayName || profile.displayName.toLowerCase().trim() === 'admin') {
    return;
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
  const { 
    setGlobalStateFilter, 
    isOnline, 
    setManualSyncTrigger,
    setAssets,
    autoSyncEnabled
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

  useEffect(() => {
    if (!isOnline || !userProfile || !autoSyncEnabled) {
      return;
    }
  
    const isAdmin = userProfile.displayName.toLowerCase().trim() === 'admin';
  
    const handleCloudUpdate = async (cloudAssets: Asset[]) => {
      let localAssets = await getLocalAssets();
      const localAssetsMap = new Map(localAssets.map(a => [a.id, a]));
  
      cloudAssets.forEach(cloudAsset => {
        const localAsset = localAssetsMap.get(cloudAsset.id);
        if (!localAsset || new Date(cloudAsset.lastModified || 0) > new Date(localAsset.lastModified || 0)) {
          localAssetsMap.set(cloudAsset.id, { ...cloudAsset, syncStatus: 'synced' });
        }
      });
      
      let finalAssets = Array.from(localAssetsMap.values());

      if (!isAdmin) {
        finalAssets = finalAssets.filter(asset => {
            const assetLocation = asset.location || '';
            const userState = userProfile.state || '';
            return assetLocation.toLowerCase().includes(userState.toLowerCase());
        });
      }

      setAssets(finalAssets);
      await saveAssets(finalAssets);
    };
  
    const unsubscribe = listenForAssetChanges(handleCloudUpdate);
  
    return () => unsubscribe();
  
  }, [isOnline, userProfile, autoSyncEnabled, setAssets]);

  const updateProfile = async (data: { displayName: string; state: string }) => {
    setLoading(true);
    const newProfile: LocalUserProfile = {
      displayName: data.displayName,
      state: data.state,
    };
    try {
      localStorage.setItem('ntblcp-user-profile', JSON.stringify(newProfile));
      setUserProfile(newProfile);
      setGlobalStateFilter(data.state || '');
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
        setManualSyncTrigger(c => c + 1);
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
