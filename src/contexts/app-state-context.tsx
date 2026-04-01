
'use client';

/**
 * @fileOverview AppStateContext - Central SPA Orchestrator.
 * Phase 270: Implemented multi-state scope downloads for Zonal Administrators.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, Dispatch, SetStateAction } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { storage } from '@/offline/storage';
import { processSyncQueue } from '@/offline/sync';
import { FirestoreService } from '@/services/firebase/firestore';
import type { Asset, AppSettings, DataSource, AuthorityNode, WorkstationView } from '@/types/domain';
import type { RegistryHeader } from '@/types/registry';
import { addNotification } from '@/hooks/use-notifications';
import { DEFAULT_REGISTRY_HEADERS } from '@/lib/registry-utils';
import { toast } from '@/hooks/use-toast';

export interface OptionType {
  label: string;
  value: string;
  count?: number;
}

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
  activeGrantId: string | null;
  activeView: WorkstationView;
  setActiveView: (view: WorkstationView) => void;
  refreshRegistry: () => Promise<void>;
  manualDownload: () => Promise<void>;
  manualUpload: () => Promise<void>;
  setActiveGrantId: (id: string) => Promise<void>;
  setReadAuthority: (node: AuthorityNode) => Promise<void>;
  
  headers: RegistryHeader[];
  setHeaders: Dispatch<SetStateAction<RegistryHeader[]>>;
  sortKey: string;
  setSortKey: Dispatch<SetStateAction<string>>;
  sortDir: 'asc' | 'desc';
  setSortDir: Dispatch<SetStateAction<'asc' | 'desc'>>;

  globalStateFilter: string;
  setGlobalStateFilter: Dispatch<SetStateAction<string>>;
  selectedLocations: string[];
  setSelectedLocations: Dispatch<SetStateAction<string[]>>;
  selectedAssignees: string[];
  setSelectedAssignees: Dispatch<SetStateAction<string[]>>;
  selectedStatuses: string[];
  setSelectedStatuses: Dispatch<SetStateAction<string[]>>;
  selectedConditions: string[];
  setSelectedConditions: Dispatch<SetStateAction<string[]>>;
  missingFieldFilter: string;
  setMissingFieldFilter: Dispatch<SetStateAction<string>>;

  locationOptions: OptionType[];
  assigneeOptions: OptionType[];
  conditionOptions: OptionType[];
  statusOptions: OptionType[];
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isHydrated, setIsHydrated] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sandboxAssets, setSandboxAssets] = useState<Asset[]>([]);
  const [dataSource, setDataSourceStatus] = useState<DataSource>('PRODUCTION');
  const [isOnline, setIsOnlineStatus] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [activeView, setActiveViewStatus] = useState<WorkstationView>('DASHBOARD');

  const [headers, setHeaders] = useState<RegistryHeader[]>([]);
  const [sortKey, setSortKey] = useState<string>('sn');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [globalStateFilter, setGlobalStateFilter] = useState('All');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [missingFieldFilter, setMissingFieldFilter] = useState('');

  const activeGrantId = useMemo(() => appSettings?.activeGrantId || null, [appSettings]);

  const locationOptions = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => {
      const val = a.location || 'Unknown';
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, value: label, count })).sort((a,b) => a.label.localeCompare(b.label));
  }, [assets]);

  const assigneeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => {
      const val = a.custodian || 'Unassigned';
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, value: label, count })).sort((a,b) => a.label.localeCompare(b.label));
  }, [assets]);

  const conditionOptions = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => {
      const val = a.condition || 'Unassessed';
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, value: label, count })).sort((a,b) => a.label.localeCompare(b.label));
  }, [assets]);

  const statusOptions = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => {
      const val = a.status || 'UNVERIFIED';
      counts.set(val, (counts.get(val) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, value: label, count }));
  }, [assets]);

  useEffect(() => { setIsHydrated(true); }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const savedHeaders = localStorage.getItem('registry-header-prefs');
    if (savedHeaders) {
      setHeaders(JSON.parse(savedHeaders));
    } else {
      const initial = DEFAULT_REGISTRY_HEADERS.map((h, i) => ({ ...h, id: `h-${i}`, orderIndex: i }));
      setHeaders(initial as RegistryHeader[]);
    }
  }, [isHydrated]);

  const setActiveView = useCallback((view: WorkstationView) => {
    setActiveViewStatus(view);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('v', view.toLowerCase());
      router.push(`/?${params.toString()}`, { scroll: false });
    }
  }, [router]);

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
      
      const currentGrantId = localSettings?.activeGrantId || null;
      const filtered = currentGrantId 
        ? (localAssets || []).filter(a => a.grantId === currentGrantId)
        : (localAssets || []);

      setAssets(filtered);
    } catch (e) {
      console.error("Registry Refresh Failure", e);
    }
  }, []);

  const manualDownload = useCallback(async () => {
    if (!isOnline) {
      addNotification({ title: "Offline Pulse", description: "Internet connection required for cloud pull.", variant: "destructive" });
      return;
    }

    const userSession = localStorage.getItem('assetain-user-session');
    const profile = userSession ? JSON.parse(userSession) : null;
    
    // Phase 270: Extract all authorized state scopes for the user (Zonal Admin support)
    const stateScopes = (profile && !profile.isAdmin) ? profile.states : undefined;

    setIsSyncing(true);
    toast({ 
      title: "Reconciling Authority...", 
      description: stateScopes ? `Fetching records for authorized state scope.` : "Fetching latest project scope from cloud." 
    });
    
    try {
      const remoteSettings = await FirestoreService.getSettings();
      if (remoteSettings) {
        setAppSettings(remoteSettings);
        await storage.saveSettings(remoteSettings);
        
        if (remoteSettings.activeGrantId) {
          // Fetch only authorized records
          const remoteAssets = await FirestoreService.getProjectAssets(remoteSettings.activeGrantId, stateScopes);
          const localAssets = await storage.getAssets();
          
          // Selective merge logic: preserve other projects, overwrite active scope
          let nextAssets;
          if (stateScopes) {
            const scopeSet = new Set(stateScopes.map(s => s.toLowerCase()));
            const otherAssets = localAssets.filter(a => 
              a.grantId !== remoteSettings.activeGrantId || 
              !scopeSet.has((a.location || '').toLowerCase())
            );
            nextAssets = [...otherAssets, ...remoteAssets];
          } else {
            const otherAssets = localAssets.filter(a => a.grantId !== remoteSettings.activeGrantId);
            nextAssets = [...otherAssets, ...remoteAssets];
          }
            
          await storage.saveAssets(nextAssets);
          addNotification({ 
            title: "Download Complete", 
            description: `Successfully synchronized ${remoteAssets.length} records.` 
          });
        }
      }
      await refreshRegistry();
    } catch (e) {
      addNotification({ title: "Connection Latent", description: "Cloud heartbeat failed during download.", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, refreshRegistry]);

  const manualUpload = useCallback(async () => {
    if (!isOnline) {
      addNotification({ title: "Offline Pulse", description: "Internet connection required for cloud push.", variant: "destructive" });
      return;
    }
    setIsSyncing(true);
    toast({ title: "Broadcasting Local Pulse...", description: "Replaying sync queue to cloud registry." });
    
    try {
      await processSyncQueue();
      await refreshRegistry();
    } catch (e) {
      addNotification({ title: "Sync Interrupted", description: "Background queue replay failed.", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, refreshRegistry]);

  const setDataSource = (source: DataSource) => { setDataSourceStatus(source); };

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
    if (!isHydrated) return;
    refreshRegistry().then(() => setSettingsLoaded(true));
  }, [isHydrated, refreshRegistry]);

  return (
    <AppStateContext.Provider value={{
      assets, sandboxAssets, dataSource, setDataSource, isOnline, setIsOnline,
      searchTerm, setSearchTerm, isSyncing, appSettings, settingsLoaded, isHydrated,
      activeGrantId, activeView, setActiveView, refreshRegistry, manualDownload, manualUpload,
      setActiveGrantId, setReadAuthority, globalStateFilter, setGlobalStateFilter,
      selectedLocations, setSelectedLocations, selectedAssignees, setSelectedAssignees,
      selectedStatuses, setSelectedStatuses, selectedConditions, setSelectedConditions,
      missingFieldFilter, setMissingFieldFilter,
      headers, setHeaders, sortKey, setSortKey, sortDir, setSortDir,
      locationOptions, assigneeOptions, conditionOptions, statusOptions
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
