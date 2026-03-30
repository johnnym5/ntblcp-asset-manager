'use client';

/**
 * @fileOverview AppStateContext - The Data Facade.
 * Orchestrates the UI requests with the Offline Storage and Sync Engine.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '@/offline/storage';
import { processSyncQueue } from '@/offline/sync';
import { FirestoreService } from '@/services/firebase/firestore';
import type { Asset, AppSettings } from '@/types/domain';
import { addNotification } from '@/hooks/use-notifications';

interface AppStateContextType {
  assets: Asset[];
  offlineAssets: Asset[];
  isOnline: boolean;
  setIsOnline: (status: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isSyncing: boolean;
  appSettings: AppSettings | null;
  settingsLoaded: boolean;
  refreshRegistry: () => Promise<void>;
  globalStateFilters: string[];
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [offlineAssets, setOfflineAssets] = useState<Asset[]>([]);
  const [isOnline, setIsOnlineStatus] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const setIsOnline = (status: boolean) => {
    setIsOnlineStatus(status);
    addNotification({ 
      title: status ? 'Cloud Sync Active' : 'Offline Mode Enabled',
      description: status ? 'Re-establishing heartbeat with the central registry.' : 'Data is being stored in the local write-ahead queue.'
    });
  };

  const refreshRegistry = useCallback(async () => {
    setIsSyncing(true);
    try {
      const localAssets = await storage.getAssets();
      setAssets(localAssets);
      
      const localSandbox = await storage.getSandbox();
      setOfflineAssets(localSandbox);

      const localSettings = await storage.getSettings();
      if (localSettings) setAppSettings(localSettings);

      if (isOnline) {
        // Background sync check
        await processSyncQueue();
        const remoteSettings = await FirestoreService.getSettings();
        if (remoteSettings) {
          setAppSettings(remoteSettings);
          await storage.saveSettings(remoteSettings);
        }
      }
    } catch (e) {
      console.error("Facade: Failed to sync registry", e);
    } finally {
      setIsSyncing(false);
      setSettingsLoaded(true);
    }
  }, [isOnline]);

  useEffect(() => {
    refreshRegistry();
  }, [refreshRegistry]);

  return (
    <AppStateContext.Provider value={{
      assets,
      offlineAssets,
      isOnline,
      setIsOnline,
      searchTerm,
      setSearchTerm,
      isSyncing,
      appSettings,
      settingsLoaded,
      refreshRegistry,
      globalStateFilters: ['All']
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
