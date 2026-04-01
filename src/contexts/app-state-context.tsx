'use client';

/**
 * @fileOverview AppStateContext - Unified Data & SPA Orchestrator.
 * Phase 74: Fully Manual Synchronization Protocol.
 * Decouples cloud pulses from automatic triggers to ensure "On-Device" autonomy.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { storage } from '@/offline/storage';
import { processSyncQueue } from '@/offline/sync';
import { FirestoreService } from '@/services/firebase/firestore';
import { getAssets as getRtdbAssets, getSettings as getRtdbSettings } from '@/lib/database';
import type { Asset, AppSettings, DataSource, AuthorityNode, WorkstationView } from '@/types/domain';
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
  autoSync: false,
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
  isHydrated: boolean;
  refreshRegistry: () => Promise<void>;
  manualDownload: () => Promise<void>;
  manualUpload: () => Promise<void>;
  activeGrantId: string | null;
  setActiveGrantId: (id: string) => Promise<void>;
  setReadAuthority: (node: AuthorityNode) => Promise<void>;
  
  // SPA View Management
  activeView: WorkstationView;
  setActiveView: (view: WorkstationView) => void;
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
  const [isHydrated, setIsHydrated] = useState(false);

  // Unified SPA Navigation State
  const [activeView, setActiveViewStatus] = useState<WorkstationView>('DASHBOARD');

  const activeGrantId = useMemo(() => appSettings?.activeGrantId || null, [appSettings]);

  /**
   * Updates the active view and synchronizes with URL for deep linking.
   */
  const setActiveView = useCallback((view: WorkstationView) => {
    setActiveViewStatus(view);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('v', view.toLowerCase());
    router.push(`/?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Sync URL view param with internal state
  useEffect(() => {
    const v = searchParams?.get('v');
    if (v) {
      const matchedView = v.toUpperCase() as WorkstationView;
      if (matchedView !== activeView) {
        setActiveViewStatus(matchedView);
      }
    }
  }, [searchParams, activeView]);

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

  const refreshRegistry = useCallback(async () => {
    /**
     * Phase 74: Fully Manual Reconciliation.
     * This pulse now ONLY reconciles the Context State with the local IndexedDB.
     * It no longer triggers background cloud sync.
     */
    try {
      const [localAssets, localSettings] = await Promise.all([
        storage.getAssets(),
        storage.getSettings()
      ]);

      if (localSettings) setAppSettings(localSettings);
      
      const currentGrantId = localSettings?.activeGrantId || activeGrantId;
      const filtered = currentGrantId 
        ? (localAssets || []).filter(a => a.grantId === currentGrantId)
        : (localAssets || []);

      setAssets(filtered);
    } catch (e) {
      console.error("Local Reconciliation Failure", e);
    }
  }, [activeGrantId]);

  const manualDownload = useCallback(async () => {
    if (!isOnline) {
      addNotification({ title: "Cloud Offline", description: "Enable Cloud Pulse to initiate download.", variant: "destructive" });
      return;
    }
    setIsSyncing(true);
    try {
      const authority = appSettings?.readAuthority || 'FIRESTORE';
      
      // 1. Fetch Settings
      const remoteSettings = authority === 'FIRESTORE' 
        ? await FirestoreService.getSettings() 
        : await getRtdbSettings();

      if (remoteSettings) {
        setAppSettings(remoteSettings);
        await storage.saveSettings(remoteSettings);
        
        // 2. Fetch Assets for Active Project
        if (remoteSettings.activeGrantId) {
          const remoteAssets = authority === 'FIRESTORE'
            ? await FirestoreService.getProjectAssets(remoteSettings.activeGrantId)
            : await getRtdbAssets(remoteSettings.activeGrantId);

          if (remoteAssets.length > 0) {
            const localAssets = await storage.getAssets();
            const otherAssets = localAssets.filter(a => a.grantId !== remoteSettings.activeGrantId);
            const combinedAssets = [...otherAssets, ...remoteAssets];
            await storage.saveAssets(combinedAssets);
          }
        }
      }
      await refreshRegistry();
      addNotification({ title: "Download Complete", description: "Registry synchronized with cloud authority." });
    } catch (e) {
      addNotification({ title: "Download Interrupted", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, appSettings, refreshRegistry]);

  const manualUpload = useCallback(async () => {
    if (!isOnline) {
      addNotification({ title: "Cloud Offline", description: "Enable Cloud Pulse to initiate upload.", variant: "destructive" });
      return;
    }
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
    addNotification({ 
      title: status ? "Cloud Pulse Enabled" : "Cloud Pulse Inhibited", 
      description: status ? "Application is now online-aware." : "Manual off-device triggers only." 
    });
  };

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
    addNotification({ title: 'Authority Shifted', description: `Read priority now: ${node}.` });
    await refreshRegistry();
  };

  useEffect(() => {
    const bootstrap = async () => {
      await hydrateFromLocalStore();
      setSettingsLoaded(true);
      // Phase 74: Automatic cloud reconciliation on boot disabled.
    };
    bootstrap();
  }, [hydrateFromLocalStore]);

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
      manualDownload,
      manualUpload,
      activeGrantId,
      setActiveGrantId,
      setReadAuthority,
      activeView,
      setActiveView
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
