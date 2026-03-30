'use client';

/**
 * @fileOverview AppStateContext - Data Facade.
 * Coordinates UI requests with the Offline Storage and Cloud Services.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '@/offline/storage';
import { FirestoreService } from '@/services/firebase/firestore';
import type { Asset, AppSettings, Grant } from '@/lib/types';
import { addNotification } from '@/hooks/use-notifications';
import { HEADER_DEFINITIONS, TARGET_SHEETS } from '@/lib/constants';

interface AppStateContextType {
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  offlineAssets: Asset[];
  setOfflineAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  isOnline: boolean;
  setIsOnline: (status: boolean) => void;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  isSyncing: boolean;
  setIsSyncing: React.Dispatch<React.SetStateAction<boolean>>;
  appSettings: AppSettings;
  settingsLoaded: boolean;
  loadInitialData: () => Promise<void>;
  globalStateFilters: string[];
  activeGrantId: string | null;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  grants: [{
    id: 'default-grant',
    name: 'Primary Asset Project',
    sheetDefinitions: HEADER_DEFINITIONS,
    enabledSheets: TARGET_SHEETS,
  }],
  activeGrantId: 'default-grant',
  authorizedUsers: [],
  lockAssetList: false,
  appMode: 'management',
  activeDatabase: 'firestore',
};

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [offlineAssets, setOfflineAssets] = useState<Asset[]>([]);
  const [isOnline, setIsOnlineStatus] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [globalStateFilters, setGlobalStateFilters] = useState<string[]>(['All']);

  const setIsOnline = (status: boolean) => {
    setIsOnlineStatus(status);
    if (typeof window !== 'undefined') {
      localStorage.setItem('assetain_online_mode', JSON.stringify(status));
    }
    addNotification({ 
      title: status ? 'Cloud Pulse Active' : 'Offline Mode Enabled',
      description: status ? 'Re-establishing high-availability synchronization.' : 'Running on isolated local storage engine.'
    });
  };

  const loadInitialData = useCallback(async () => {
    try {
      // 1. Load from IndexedDB
      const localAssets = await storage.getAssets();
      setAssets(localAssets);
      
      const localSandbox = await storage.getSandbox();
      setOfflineAssets(localSandbox);

      // 2. Fetch remote settings if online
      if (isOnline) {
        const remoteSettings = await FirestoreService.getSettings();
        if (remoteSettings) {
          setAppSettings(remoteSettings);
        }
      }
      setSettingsLoaded(true);
    } catch (e) {
      console.error("Context: Failed to load registry state", e);
      setSettingsLoaded(true); // Still mark as loaded to unblock Auth
    }
  }, [isOnline]);

  useEffect(() => {
    loadInitialData();
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('assetain_online_mode');
      if (saved) setIsOnlineStatus(JSON.parse(saved));
    }
  }, [loadInitialData]);

  return (
    <AppStateContext.Provider value={{
      assets,
      setAssets,
      offlineAssets,
      setOfflineAssets,
      isOnline,
      setIsOnline,
      searchTerm,
      setSearchTerm,
      isSyncing,
      setIsSyncing,
      appSettings,
      settingsLoaded,
      loadInitialData,
      globalStateFilters,
      activeGrantId: appSettings.activeGrantId
    }}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within AppStateProvider');
  return context;
};
