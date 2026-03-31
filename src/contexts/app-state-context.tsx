'use client';

/**
 * @fileOverview AppStateContext - Unified Data & Connectivity Orchestrator.
 * Phase 67: Deep-Hydration Protocol for 100% Offline Autonomy.
 * Ensures the entire registry is held in memory for zero-latency transitions.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '@/offline/storage';
import { processSyncQueue } from '@/offline/sync';
import { FirestoreService } from '@/services/firebase/firestore';
import { getAssets as getRtdbAssets, getSettings as getRtdbSettings } from '@/lib/database';
import type { Asset, AppSettings, DataSource, AuthorityNode } from '@/types/domain';
import { addNotification } from '@/hooks/use-notifications';
import { HEADER_DEFINITIONS } from '@/lib/constants';

const DEFAULT_SETTINGS: AppSettings = {
  authorizedUsers: [],
  lockAssetList: false,
  appMode: 'management',
  activeDatabase: 'firestore',
  readAuthority: 'FIRESTORE',
  activeGrantId: 'ntblcp-core',
  grants: [
    {
      id: 'ntblcp-core',
      name: 'NTBLCP Standard Registry',
      enabledSheets: Object.keys(HEADER_DEFINITIONS),
      sheetDefinitions: HEADER_DEFINITIONS
    }
  ],
  uxMode: 'beginner',
  onboardingComplete: false,
  showHelpTooltips: true,
  autoSync: true,
  autoAnalyze: false,
  autoSuggestFilters: true,
  sourceBranding: {}
};

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
  isHydrated: boolean; // Indicates if the local memory pulse is complete
  refreshRegistry: () => Promise<void>;
  activeGrantId: string | null;
  setActiveGrantId: (id: string) => Promise<void>;
  setReadAuthority: (node: AuthorityNode) => Promise<void>;
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
  const [isHydrated, setIsHydrated] = useState(false);

  const activeGrantId = useMemo(() => appSettings?.activeGrantId || null, [appSettings]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleOnline = () => setIsOnlineStatus(true);
      const handleOffline = () => setIsOnlineStatus(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      setIsOnlineStatus(navigator.onLine);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  /**
   * Performs a Deep-Hydration of the local React state from IndexedDB.
   * This is the "Zero-Latency" trigger.
   */
  const hydrateFromLocalStore = useCallback(async () => {
    try {
      const [localAssets, localSandbox, localSettings] = await Promise.all([
        storage.getAssets(),
        storage.getSandbox(),
        storage.getSettings()
      ]);

      if (localSettings) setAppSettings(localSettings);
      setSandboxAssets(localSandbox || []);
      
      const currentGrantId = localSettings?.activeGrantId || DEFAULT_SETTINGS.activeGrantId;
      const initialFiltered = currentGrantId 
        ? (localAssets || []).filter(a => a.grantId === currentGrantId)
        : (localAssets || []);

      setAssets(initialFiltered);
      setIsHydrated(true);
    } catch (e) {
      console.error("Hydration Pulse Failed", e);
    }
  }, []);

  /**
   * Synchronizes the local store with the Cloud Authority.
   * Runs silently in the background after hydration.
   */
  const refreshRegistry = useCallback(async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      await processSyncQueue();
      
      const authority = appSettings?.readAuthority || 'FIRESTORE';
      let remoteSettings = null;

      try {
        remoteSettings = authority === 'FIRESTORE' 
          ? await FirestoreService.getSettings() 
          : await getRtdbSettings();
      } catch (e) {
        console.warn("Reconciliation: Settings pulse latent.");
      }

      if (remoteSettings) {
        setAppSettings(remoteSettings);
        await storage.saveSettings(remoteSettings);
        
        if (remoteSettings.activeGrantId) {
          let remoteAssets: Asset[] = [];
          try {
            remoteAssets = authority === 'FIRESTORE'
              ? await FirestoreService.getProjectAssets(remoteSettings.activeGrantId)
              : await getRtdbAssets(remoteSettings.activeGrantId);
          } catch (e) {
            console.warn("Reconciliation: Asset pulse latent.");
          }

          if (remoteAssets.length > 0) {
            const localAssets = await storage.getAssets();
            const otherAssets = localAssets.filter(a => a.grantId !== remoteSettings.activeGrantId);
            const combinedAssets = [...otherAssets, ...remoteAssets];
            await storage.saveAssets(combinedAssets);
            
            // Update React state instantly
            setAssets(remoteAssets);
          }
        }
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, appSettings]);

  const setDataSource = (source: DataSource) => {
    setDataSourceStatus(source);
  };

  const setIsOnline = (status: boolean) => {
    setIsOnlineStatus(status);
  };

  const setActiveGrantId = async (id: string) => {
    if (!appSettings) return;
    const nextSettings = { ...appSettings, activeGrantId: id };
    setAppSettings(nextSettings);
    await storage.saveSettings(nextSettings);
    if (isOnline) {
      FirestoreService.updateSettings({ activeGrantId: id });
    }
    // Instant local refresh
    const localAssets = await storage.getAssets();
    setAssets(localAssets.filter(a => a.grantId === id));
    refreshRegistry();
  };

  const setReadAuthority = async (node: AuthorityNode) => {
    if (!appSettings) return;
    const nextSettings = { ...appSettings, readAuthority: node };
    setAppSettings(nextSettings);
    await storage.saveSettings(nextSettings);
    if (isOnline) {
      await FirestoreService.updateSettings({ readAuthority: node });
    }
    addNotification({ title: 'Authority Shifted', description: `Read priority now: ${node}.` });
    refreshRegistry();
  };

  // INITIAL BOOTSTRAP: HYDRATE FIRST, SYNC SECOND
  useEffect(() => {
    const bootstrap = async () => {
      await hydrateFromLocalStore();
      setSettingsLoaded(true);
      if (navigator.onLine) {
        refreshRegistry();
      }
    };
    bootstrap();
  }, [hydrateFromLocalStore, refreshRegistry]);

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
      isHydrated,
      refreshRegistry,
      activeGrantId,
      setActiveGrantId,
      setReadAuthority
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
