'use client';

/**
 * @fileOverview AppStateContext - Central SPA Orchestrator.
 * Phase 76: Unified Workstation Management & Manual Sync Triggers.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { storage } from '@/offline/storage';
import { processSyncQueue } from '@/offline/sync';
import { FirestoreService } from '@/services/firebase/firestore';
import type { Asset, AppSettings, DataSource, AuthorityNode, WorkstationView } from '@/types/domain';
import { addNotification } from '@/hooks/use-notifications';

const DEFAULT_SETTINGS: AppSettings = {
  authorizedUsers: [],
  lockAssetList: false,
  appMode: 'management',
  readAuthority: 'FIRESTORE',
  activeGrantId: 'ntblcp-core',
  grants: [
    { id: 'ntblcp-core', name: 'NTBLCP Main Registry', enabledSheets: [], sheetDefinitions: {} }
  ],
  uxMode: 'beginner',
  onboardingComplete: false,
  showHelpTooltips: true,
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
  activeGrantId: string | null;
  activeView: WorkstationView;
  setActiveView: (view: WorkstationView) => void;
  refreshRegistry: () => Promise<void>;
  manualDownload: () => Promise<void>;
  manualUpload: () => Promise<void>;
  setActiveGrantId: (id: string) => Promise<void>;
  setReadAuthority: (node: AuthorityNode) => Promise<void>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sandboxAssets, setSandboxAssets] = useState<Asset[]>([]);
  const [dataSource, setDataSourceStatus] = useState<DataSource>('PRODUCTION');
  const [isOnline, setIsOnlineStatus] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [activeView, setActiveViewStatus] = useState<WorkstationView>('DASHBOARD');

  const activeGrantId = useMemo(() => appSettings?.activeGrantId || null, [appSettings]);

  const setActiveView = useCallback((view: WorkstationView) => {
    setActiveViewStatus(view);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('v', view.toLowerCase());
    router.push(`/?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    const v = searchParams?.get('v');
    if (v) {
      const matched = v.toUpperCase() as WorkstationView;
      if (matched !== activeView) setActiveViewStatus(matched);
    }
  }, [searchParams, activeView]);

  const refreshRegistry = useCallback(async () => {
    try {
      const [localAssets, localSandbox, localSettings] = await Promise.all([
        storage.getAssets(),
        storage.getSandbox(),
        storage.getSettings()
      ]);

      if (localSettings) setAppSettings(localSettings);
      setSandboxAssets(localSandbox || []);
      
      const currentGrantId = localSettings?.activeGrantId || activeGrantId;
      const filtered = currentGrantId 
        ? (localAssets || []).filter(a => a.grantId === currentGrantId)
        : (localAssets || []);

      setAssets(filtered);
    } catch (e) {
      console.error("Registry Refresh Failure", e);
    }
  }, [activeGrantId]);

  const manualDownload = useCallback(async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      const remoteSettings = await FirestoreService.getSettings();
      if (remoteSettings) {
        setAppSettings(remoteSettings);
        await storage.saveSettings(remoteSettings);
        if (remoteSettings.activeGrantId) {
          const remoteAssets = await FirestoreService.getProjectAssets(remoteSettings.activeGrantId);
          const localAssets = await storage.getAssets();
          const otherAssets = localAssets.filter(a => a.grantId !== remoteSettings.activeGrantId);
          await storage.saveAssets([...otherAssets, ...remoteAssets]);
        }
      }
      await refreshRegistry();
      addNotification({ title: "Download Complete", description: "Cloud authority reconciled." });
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, refreshRegistry]);

  const manualUpload = useCallback(async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      await processSyncQueue();
      await refreshRegistry();
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, refreshRegistry]);

  const setDataSource = (source: DataSource) => {
    setDataSourceStatus(source);
  };

  const setIsOnline = (status: boolean) => {
    setIsOnlineStatus(status);
    addNotification({ title: status ? "Cloud Pulse Enabled" : "Cloud Pulse Inhibited" });
  };

  const setActiveGrantId = async (id: string) => {
    if (!appSettings) return;
    const nextSettings = { ...appSettings, activeGrantId: id };
    setAppSettings(nextSettings);
    await storage.saveSettings(nextSettings);
    if (isOnline) FirestoreService.updateSettings({ activeGrantId: id });
    await refreshRegistry();
  };

  const setReadAuthority = async (node: AuthorityNode) => {
    if (!appSettings) return;
    const nextSettings = { ...appSettings, readAuthority: node };
    setAppSettings(nextSettings);
    await storage.saveSettings(nextSettings);
    if (isOnline) await FirestoreService.updateSettings({ readAuthority: node });
    addNotification({ title: 'Authority Shifted', description: `Priority: ${node}` });
    await refreshRegistry();
  };

  useEffect(() => {
    const bootstrap = async () => {
      await refreshRegistry();
      setSettingsLoaded(true);
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
      activeGrantId,
      activeView,
      setActiveView,
      refreshRegistry,
      manualDownload,
      manualUpload,
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
