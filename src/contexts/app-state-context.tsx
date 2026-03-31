'use client';

/**
 * @fileOverview AppStateContext - Unified Data & Connectivity Orchestrator.
 * Phase 58: Implemented HA Failover logic for Cloud Authority vs Shadow Mirror.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '@/offline/storage';
import { processSyncQueue } from '@/offline/sync';
import { FirestoreService } from '@/services/firebase/firestore';
import { getAssets as getRtdbAssets, getSettings as getRtdbSettings } from '@/lib/database';
import type { Asset, AppSettings, DataSource, AuthorityNode } from '@/types/domain';
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

  useEffect(() => {
    const status = isOnline ? 'Online Assets View' : 'Locally Saved Assets View';
    addNotification({ 
      title: 'Connectivity Heartbeat',
      description: `Application is now in ${status}.`
    });
  }, [isOnline]);

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

      if (isOnline) {
        await processSyncQueue();
        
        // PRD: Triple-Layer Redundancy Switch
        const authority = localSettings?.readAuthority || 'FIRESTORE';
        
        let remoteSettings = null;
        try {
          if (authority === 'FIRESTORE') {
            remoteSettings = await FirestoreService.getSettings();
          } else {
            remoteSettings = await getRtdbSettings();
          }
        } catch (e) {
          // Fallback to RTDB if Firestore fails during standard refresh
          remoteSettings = await getRtdbSettings();
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
      console.error("Context: Registry reconciliation failed", e);
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
