'use client';

/**
 * @fileOverview AuthContext - Identity & Access Gateway.
 * Hardened for deployment: Sign out now performs a deterministic wipe of local asset data.
 * Phase 401: Hardened isAdmin derivation for multi-tier RBAC visibility.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppState } from './app-state-context';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseAuthService } from '@/services/firebase/auth';
import { storage } from '@/offline/storage';
import type { AuthorizedUser, UserRole } from '@/types/domain';

export interface LocalUserProfile {
  id: string; 
  loginName: string;
  displayName: string;
  email: string;
  state: string; 
  isAdmin: boolean;
  role: UserRole;
  states: string[];
  isZonalAdmin?: boolean;
  assignedZone?: string;
  canAddAssets?: boolean;
  canEditAssets?: boolean;
}

interface AuthContextType {
  userProfile: LocalUserProfile | null;
  loading: boolean;
  profileSetupComplete: boolean;
  authInitialized: boolean;
  login: (user: AuthorizedUser, state: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const superAdmin: AuthorizedUser = {
  loginName: 'admin',
  displayName: 'Super Admin',
  email: 'admin',
  password: 'setup',
  states: ['All'],
  isAdmin: true,
  role: 'SUPERADMIN',
  canAddAssets: true,
  canEditAssets: true
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<LocalUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  const { appSettings, settingsLoaded, isHydrated, manualDownload } = useAppState();

  useEffect(() => {
    if (!settingsLoaded || !isHydrated) return;

    try {
      const savedProfile = localStorage.getItem('assetain-user-session');
      if (savedProfile) {
        const profile: LocalUserProfile = JSON.parse(savedProfile);
        const authorizedUsersList = appSettings?.authorizedUsers || [];
        const allUsers = [...authorizedUsersList, superAdmin];
        
        // Use the profile from cloud settings if it exists, to ensure updated permissions
        const authorizedUser = allUsers.find(u => u.loginName === profile.loginName);
        
        if (authorizedUser) {
          const mergedProfile: LocalUserProfile = {
            ...profile,
            displayName: authorizedUser.displayName,
            states: authorizedUser.states,
            isZonalAdmin: authorizedUser.isZonalAdmin,
            assignedZone: authorizedUser.assignedZone,
            role: authorizedUser.role,
            isAdmin: authorizedUser.isAdmin || authorizedUser.role === 'ADMIN' || authorizedUser.role === 'SUPERADMIN',
            canAddAssets: authorizedUser.canAddAssets || authorizedUser.isAdmin || authorizedUser.role === 'ADMIN' || authorizedUser.role === 'SUPERADMIN',
            canEditAssets: authorizedUser.canEditAssets || authorizedUser.isAdmin || authorizedUser.role === 'ADMIN' || authorizedUser.role === 'SUPERADMIN',
          };
          setUserProfile(mergedProfile);
          setProfileSetupComplete(true);
          FirebaseAuthService.ensureSession();
        } else {
          // User was removed from authorized list
          localStorage.removeItem('assetain-user-session');
          setUserProfile(null);
          setProfileSetupComplete(false);
        }
      } else {
        setUserProfile(null);
        setProfileSetupComplete(false);
      }
    } catch (e) {
      localStorage.removeItem('assetain-user-session');
      setUserProfile(null);
      setProfileSetupComplete(false);
    } finally {
      setLoading(false);
      setAuthInitialized(true);
    }
  }, [settingsLoaded, isHydrated, appSettings]);

  const login = async (user: AuthorizedUser, state: string) => {
    setLoading(true);
    try {
      await FirebaseAuthService.ensureSession();

      const newProfile: LocalUserProfile = {
        id: uuidv4(),
        loginName: user.loginName,
        displayName: user.displayName,
        email: user.email,
        state: state,
        states: user.states,
        isZonalAdmin: user.isZonalAdmin,
        assignedZone: user.assignedZone,
        isAdmin: user.isAdmin || user.role === 'ADMIN' || user.role === 'SUPERADMIN',
        role: user.role,
        canAddAssets: user.canAddAssets || user.isAdmin || user.role === 'ADMIN' || user.role === 'SUPERADMIN',
        canEditAssets: user.canEditAssets || user.isAdmin || user.role === 'ADMIN' || user.role === 'SUPERADMIN',
      };
      
      sessionStorage.setItem('assetain-fresh-login', 'true');
      localStorage.setItem('assetain-user-session', JSON.stringify(newProfile));
      setUserProfile(newProfile);
      setProfileSetupComplete(true);

      // Automated Initial Download pulse for new session
      await manualDownload();
      
    } catch (e) {
      console.error("Auth: Login failed", e);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Deterministic wipe of local data on logout for security
      await storage.clearAssets(); 
      
      localStorage.removeItem('assetain-user-session');
      sessionStorage.removeItem('assetain-fresh-login');
      setUserProfile(null);
      setProfileSetupComplete(false);
      await FirebaseAuthService.terminateSession();
      window.location.href = '/';
    } catch (e) {
      console.error("Auth: Logout failure", e);
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  };

  const value = { userProfile, loading, profileSetupComplete, login, logout, authInitialized };

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
