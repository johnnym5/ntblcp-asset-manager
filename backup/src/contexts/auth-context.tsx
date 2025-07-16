
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { clearAssets } from '@/lib/idb';
import type { OnlineUser, InboxMessageGroup } from '@/lib/types';
import { addNotification } from '@/hooks/use-notifications';

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
    setGlobalStateFilter, 
    isOnline,
    setAssets, 
    setOnlineUsers,
    setUserHistory,
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

  // Presence and History Listener
  useEffect(() => {
    if (!isOnline || !userProfile?.id) {
        setOnlineUsers([]);
        return;
    }

    const onlineStatusRef = doc(db, 'user-status', userProfile.id);

    const setOnline = () => {
        setDoc(onlineStatusRef, {
            id: userProfile.id,
            displayName: userProfile.displayName,
            state: userProfile.state,
            online: true,
            timestamp: new Date().toISOString(),
        });
    }

    const setOffline = () => {
        deleteDoc(onlineStatusRef);
    }
    
    setOnline(); // Set initial status
    const interval = setInterval(setOnline, 30000); // Heartbeat every 30 seconds

    window.addEventListener('beforeunload', setOffline);

    const usersUnsubscribe = onSnapshot(collection(db, 'user-status'), (snapshot) => {
        const users: OnlineUser[] = [];
        snapshot.forEach((doc) => {
            users.push(doc.data() as OnlineUser);
        });
        setOnlineUsers(users);
    });

    const activityUnsubscribe = onSnapshot(collection(db, 'activity'), (snapshot) => {
      const history: InboxMessageGroup[] = [];
      snapshot.forEach((doc) => {
          history.push(doc.data() as InboxMessageGroup);
      });
      setUserHistory(history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });


    return () => {
        clearInterval(interval);
        setOffline();
        window.removeEventListener('beforeunload', setOffline);
        usersUnsubscribe();
        activityUnsubscribe();
    }

  }, [isOnline, userProfile, setOnlineUsers, setUserHistory]);

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
      setGlobalStateFilter(data.state || '');
      setProfileSetupComplete(true);
      if (isOnline) {
        const isAdmin = newProfile.displayName.toLowerCase().trim() === 'admin';
        const message = isAdmin ? `${newProfile.displayName} logged in.` : `${newProfile.displayName} entered ${newProfile.state}.`;
        
        const activityLog: InboxMessageGroup = {
            id: uuidv4(),
            type: 'activity',
            updatedBy: newProfile.displayName,
            updatedByState: newProfile.state,
            timestamp: new Date().toISOString(),
            activityMessage: message,
        };
        await setDoc(doc(db, "activity", activityLog.id), activityLog);
      }
    } catch(e) {
      console.error("Failed to save user profile", e);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (isOnline && userProfile) {
        await deleteDoc(doc(db, 'user-status', userProfile.id));
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
