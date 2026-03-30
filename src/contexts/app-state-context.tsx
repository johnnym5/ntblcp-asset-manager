'use client';

/**
 * @fileOverview AppStateContext - The Unified Data Facade.
 * Orchestrates the UI requests with the Offline Storage and Sync Engine.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '@/offline/storage';
import { processSyncQueue } from '@/offline/sync';
import { FirestoreService } from '@/services/firebase/firestore';
import type { Asset, AppSettings, Grant } from '@/types/domain';
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
  activeGrantId: string | null;
  setActiveGrantId: (id: string) => Promise<void>;
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

  const activeGrantId = useMemo(() => appSettings?.activeGrantId || null, [appSettings]);

  const setIsOnline = (status: boolean) => {
    setIsOnlineStatus(status);
    addNotification({ 
      title: status ? 'Cloud Heartbeat Active' : 'Offline Registry Active',
      description: status ? 'Online Assets View: re-establishing cloud parity.' : 'Locally Saved Assets View: modifications queued locally.'
    });
  };

  const refreshRegistry = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Load Local State Pulse
      const localAssets = await storage.getAssets();
      const localSandbox = await storage.getSandbox();
      const localSettings = await storage.getSettings();

      if (localSettings) setAppSettings(localSettings);
      
      const currentGrantId = localSettings?.activeGrantId;

      // Filter main registry by active project context
      const filteredAssets = currentGrantId 
        ? localAssets.filter(a => a.grantId === currentGrantId)
        : localAssets;

      setAssets(filteredAssets);
      setOfflineAssets(localSandbox);

      // 2. Synchronize if Online
      if (isOnline) {
        await processSyncQueue();
        const remoteSettings = await FirestoreService.getSettings();
        if (remoteSettings) {
          setAppSettings(remoteSettings);
          await storage.saveSettings(remoteSettings);
          
          // Fetch remote project data if grant is active
          if (remoteSettings.activeGrantId) {
            const remoteAssets = await FirestoreService.getProjectAssets(remoteSettings.activeGrantId);
            if (remoteAssets.length > 0) {
              // Update local storage with remote assets
              const otherAssets = localAssets.filter(a => a.grantId !== remoteSettings.activeGrantId);
              const combinedAssets = [...otherAssets, ...remoteAssets];
              await storage.saveAssets(combinedAssets);
              setAssets(remoteAssets);
            }
          }
        }
      }
    } catch (e) {
      console.error("Facade Error: Failed to reconcile registry pulse", e);
    } finally {
      setIsSyncing(false);
      setSettingsLoaded(true);
    }
  }, [isOnline]);

  const setActiveGrantId = async (id: string) => {
    if (!appSettings) return;
    const nextSettings = { ...appSettings, activeGrantId: id };
    setAppSettings(nextSettings);
    await storage.saveSettings(nextSettings);
    if (isOnline) {
      FirestoreService.updateSettings({ activeGrantId: id });
    }
    await refreshRegistry();
  };

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
      activeGrantId,
      setActiveGrantId
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
