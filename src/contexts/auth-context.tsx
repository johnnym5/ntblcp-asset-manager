
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { listenForAssetChanges } from '@/lib/firestore';
import type { Asset, InboxMessageGroup } from '@/lib/types';
import { getLocalAssets, saveAssets, clearAssets } from '@/lib/idb';
import { NIGERIAN_STATES } from '@/lib/constants';
import { addNotification } from '@/hooks/use-notifications';

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

const logActivity = async (profile: LocalUserProfile, activity: 'login' | 'logout') => {
  if (!profile || !profile.displayName) return;

  const isAdmin = profile.displayName.toLowerCase().trim() === 'admin';
  let message = '';
  if (activity === 'login') {
    message = isAdmin ? `${profile.displayName} logged in.` : `${profile.displayName} entered ${profile.state}.`;
  } else {
    message = `${profile.displayName} logged out.`;
  }

  try {
    const activityLog: InboxMessageGroup = {
      id: uuidv4(),
      type: 'activity',
      updatedBy: profile.displayName,
      updatedByState: profile.state,
      timestamp: new Date().toISOString(),
      activityMessage: message,
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
    autoSyncEnabled,
    setAssets, 
    setInboxMessages, 
    setUnreadInboxCount
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
  
    const handleCloudUpdate = async (cloudUpdates: Asset[]) => {
      if (cloudUpdates.length === 0) return;

      const localAssets = await getLocalAssets();
      const localAssetsMap = new Map(localAssets.map(a => [a.id, a]));
      
      const changes: Asset[] = [];
      cloudUpdates.forEach(cloudAsset => {
        const localAsset = localAssetsMap.get(cloudAsset.id);
        if (!localAsset || new Date(cloudAsset.lastModified || 0) > new Date(localAsset.lastModified || 0)) {
           localAssetsMap.set(cloudAsset.id, { ...cloudAsset, syncStatus: 'synced' });
           changes.push(cloudAsset);
        }
      });

      if (changes.length > 0) {
        let finalAssets = Array.from(localAssetsMap.values());
        if (!isAdmin) {
          const userStateLower = (userProfile.state || '').toLowerCase();
          finalAssets = finalAssets.filter(asset => (asset.location || '').toLowerCase().includes(userStateLower));
        }
        setAssets(finalAssets);
        await saveAssets(finalAssets);

        if(isAdmin) {
           addNotification({ title: 'Live Update', description: `${changes.length} asset(s) were just updated.`});
        }
      }
    };
  
    const unsubscribe = listenForAssetChanges(handleCloudUpdate, userProfile);
  
    return () => unsubscribe();
  
  }, [isOnline, userProfile, autoSyncEnabled, setAssets, setInboxMessages, setUnreadInboxCount]);

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
    if (isOnline && userProfile) {
      await logActivity(userProfile, 'logout');
    }
    localStorage.removeItem('ntblcp-user-profile');
    setUserProfile(null);
    setProfileSetupComplete(false);
    setGlobalStateFilter('');
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
