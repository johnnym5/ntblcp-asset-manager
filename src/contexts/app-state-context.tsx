'use client';

/**
 * @fileOverview AppStateContext - The Unified Data Facade.
 * Orchestrates UI requests with Offline Storage, Sandbox, and Sync Engine.
 * Phase 14: Support for PRODUCTION vs SANDBOX context switching.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '@/offline/storage';
import { processSyncQueue } from '@/offline/sync';
import { FirestoreService } from '@/services/firebase/firestore';
import { getAssets as getRtdbAssets, getSettings as getRtdbSettings } from '@/lib/database';
import type { Asset, AppSettings, DataSource } from '@/types/domain';
import { addNotification } from '@/hooks/use-notifications';

interface AppStateContextType {
  assets: Asset[];
  sandboxAssets: Asset[];
  dataSource: DataSource;
  setDataSource: (source: DataSource) => void;
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
  const [sandboxAssets, setSandboxAssets] = useState<Asset[]>([]);
  const [dataSource, setDataSourceStatus] = useState<DataSource>('PRODUCTION');
  const [isOnline, setIsOnlineStatus] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const activeGrantId = useMemo(() => appSettings?.activeGrantId || null, [appSettings]);

  const setDataSource = (source: DataSource) => {
    setDataSourceStatus(source);
    addNotification({ 
      title: source === 'PRODUCTION' ? 'Production Registry Active' : 'Sandbox Store Active',
      description: source === 'PRODUCTION' ? 'Working with synced registry data.' : 'Reviewing hierarchical imports in the sandbox.'
    });
  };

  const setIsOnline = (status: boolean) => {
    setIsOnlineStatus(status);
    addNotification({ 
      title: status ? 'Cloud Heartbeat Active' : 'Offline Registry Active',
      description: status ? 'Establishing cloud parity.' : 'Modifications will be queued locally.'
    });
  };

  const refreshRegistry = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Load Local & Sandbox Persistence
      const localAssets = await storage.getAssets();
      const localSandbox = await storage.getSandbox();
      const localSettings = await storage.getSettings();

      if (localSettings) setAppSettings(localSettings);
      setSandboxAssets(localSandbox);
      
      const currentGrantId = localSettings?.activeGrantId;
      const initialFiltered = currentGrantId 
        ? localAssets.filter(a => a.grantId === currentGrantId)
        : localAssets;

      setAssets(initialFiltered);

      // 2. Synchronize if Online with Automated Shadow Fallback
      if (isOnline) {
        await processSyncQueue();
        
        let remoteSettings = null;
        try {
          remoteSettings = await FirestoreService.getSettings();
        } catch (e) {
          console.warn("Primary Layer Unreachable. Attempting Shadow Fallback...");
          remoteSettings = await getRtdbSettings();
        }

        if (remoteSettings) {
          setAppSettings(remoteSettings);
          await storage.saveSettings(remoteSettings);
          
          if (remoteSettings.activeGrantId) {
            let remoteAssets: Asset[] = [];
            try {
              remoteAssets = await FirestoreService.getProjectAssets(remoteSettings.activeGrantId);
            } catch (e) {
              console.warn("Primary Assets Unavailable. Fetching from Shadow Mirror...");
              remoteAssets = await getRtdbAssets(remoteSettings.activeGrantId);
            }

            if (remoteAssets.length > 0) {
              const otherAssets = localAssets.filter(a => a.grantId !== remoteSettings.activeGrantId);
              const combinedAssets = [...otherAssets, ...remoteAssets];
              await storage.saveAssets(combinedAssets);
              setAssets(remoteAssets);
            }
          }
        }
      }
    } catch (e) {
      console.error("Facade Error: Registry reconciliation failed", e);
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
      sandboxAssets,
      dataSource,
      setDataSource,
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
  if (context === undefined) throw new Error('useAppState must be used within AppStateProvider');
  return context;
};
