'use client';

/**
 * @fileOverview AppStateContext - Unified Data & Connectivity Orchestrator.
 * Phase 65: Hardened Bootstrapping - Ensures the shell always resolves to a usable state.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '@/offline/storage';
import { processSyncQueue } from '@/offline/sync';
import { FirestoreService } from '@/services/firebase/firestore';
import { getAssets as getRtdbAssets, getSettings as getRtdbSettings } from '@/lib/database';
import type { Asset, AppSettings, DataSource, AuthorityNode } from '@/types/domain';
import { addNotification } from '@/hooks/use-notifications';
import { HEADER_DEFINITIONS } from '@/lib/constants';

// Professional Default Configuration for new environments
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

  const activeGrantId = useMemo(() => appSettings?.activeGrantId || null, [appSettings]);

  // Network Restoration Pulse
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

  const setDataSource = (source: DataSource) => {
    setDataSourceStatus(source);
    addNotification({ 
      title: source === 'PRODUCTION' ? 'Production Registry Active' : 'Sandbox Store Active',
      description: source === 'PRODUCTION' ? 'Working with synced registry data.' : 'Reviewing hierarchical imports in the sandbox.'
    });
  };

  const setIsOnline = (status: boolean) => {
    setIsOnlineStatus(status);
  };

  const refreshRegistry = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Retrieve Local State
      const [localAssets, localSandbox, localSettings] = await Promise.all([
        storage.getAssets(),
        storage.getSandbox(),
        storage.getSettings()
      ]);

      setSandboxAssets(localSandbox);
      
      const currentGrantId = localSettings?.activeGrantId || DEFAULT_SETTINGS.activeGrantId;
      const initialFiltered = currentGrantId 
        ? localAssets.filter(a => a.grantId === currentGrantId)
        : localAssets;

      setAssets(initialFiltered);

      // 2. Remote Reconciliation Pulse (Conditional)
      if (isOnline) {
        await processSyncQueue();
        
        const authority = localSettings?.readAuthority || 'FIRESTORE';
        
        let remoteSettings = null;
        try {
          if (authority === 'FIRESTORE') {
            remoteSettings = await FirestoreService.getSettings();
          } else {
            remoteSettings = await getRtdbSettings();
          }
        } catch (e) {
          console.warn("Reconciliation: Remote settings pulse latent.");
        }

        if (remoteSettings) {
          setAppSettings(remoteSettings);
          await storage.saveSettings(remoteSettings);
          
          if (remoteSettings.activeGrantId) {
            let remoteAssets: Asset[] = [];
            try {
              if (authority === 'FIRESTORE') {
                remoteAssets = await FirestoreService.getProjectAssets(remoteSettings.activeGrantId);
              } else {
                remoteAssets = await getRtdbAssets(remoteSettings.activeGrantId);
              }
            } catch (e) {
              console.warn("Reconciliation: Remote asset pulse latent.");
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
      console.error("Context: Registry reconciliation failure", e);
    } finally {
      setIsSyncing(false);
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

  const setReadAuthority = async (node: AuthorityNode) => {
    if (!appSettings) return;
    const nextSettings = { ...appSettings, readAuthority: node };
    setAppSettings(nextSettings);
    await storage.saveSettings(nextSettings);
    if (isOnline) {
      await FirestoreService.updateSettings({ readAuthority: node });
    }
    addNotification({ 
      title: 'HA Failover Executed', 
      description: `System read authority shifted to ${node}.` 
    });
    await refreshRegistry();
  };

  // CRITICAL: Hardened Initialization sequence to prevent infinite loading
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const localSettings = await storage.getSettings();
        if (localSettings) {
          setAppSettings(localSettings);
        } else {
          setAppSettings(DEFAULT_SETTINGS);
          await storage.saveSettings(DEFAULT_SETTINGS);
        }
      } catch (e) {
        console.error("Bootstrap: Local store error, using defaults", e);
        setAppSettings(DEFAULT_SETTINGS);
      } finally {
        setSettingsLoaded(true);
        // Background reconciliation pulse
        refreshRegistry();
      }
    };
    bootstrap();
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
