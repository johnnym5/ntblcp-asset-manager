'use client';

/**
 * @fileOverview AppStateContext - Central SPA Orchestrator.
 * Phase 1010: Implemented Project Switch Isolation Pulse.
 * Optimized for performance with high-speed computational caching and debouncing.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, Dispatch, SetStateAction, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { storage } from '@/offline/storage';
import { processSyncQueue } from '@/offline/sync';
import { FirestoreService } from '@/services/firebase/firestore';
import { db } from '@/lib/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { DiscrepancyEngine } from '@/lib/discrepancy-engine';
import type { Asset, AppSettings, DataSource, AuthorityNode, WorkstationView } from '@/types/domain';
import type { RegistryHeader, HeaderFilter } from '@/types/registry';
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
  setAppSettings: Dispatch<SetStateAction<AppSettings | null>>;
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

  // Global UI State
  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;
  isSortOpen: boolean;
  setIsSortOpen: (open: boolean) => void;
  filters: HeaderFilter[];
  setFilters: Dispatch<SetStateAction<HeaderFilter[]>>;

  // Category Hub State
  selectedCategory: string | null;
  setSelectedCategory: Dispatch<SetStateAction<string | null>>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

function ViewParamSync({ 
  activeView, 
  setActiveViewStatus 
}: { 
  activeView: WorkstationView, 
  setActiveViewStatus: (v: WorkstationView) => void 
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const v = searchParams?.get('v');
    if (v) {
      const matched = v.toUpperCase() as WorkstationView;
      if (matched !== activeView) setActiveViewStatus(matched);
    }
  }, [searchParams, activeView, setActiveViewStatus]);
  return null;
}

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  
  const [isHydrated, setIsHydrated] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sandboxAssets, setSandboxAssets] = useState<Asset[]>([]);
  const [dataSource, setDataSourceStatus] = useState<DataSource>('PRODUCTION');
  const [isOnline, setIsOnlineStatus] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('assetain-online-pulse');
    return saved ? JSON.parse(saved) : true;
  });
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

  // Global Drawers & Filters
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [filters, setFilters] = useState<HeaderFilter[]>([]);

  // Category Hub state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const activeGrantId = useMemo(() => appSettings?.activeGrantId || null, [appSettings]);

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

  useEffect(() => {
    if (!isHydrated) return;

    storage.getSettings().then(local => {
      if (local) {
        setAppSettings(local);
        setSettingsLoaded(true);
      }
    });

    if (db && isOnline) {
      const settingsRef = doc(db, 'config', 'settings');
      const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
          const remoteSettings = snapshot.data() as AppSettings;
          setAppSettings(remoteSettings);
          storage.saveSettings(remoteSettings);
          setSettingsLoaded(true);
        } else {
          setSettingsLoaded(true);
        }
      }, (error) => {
        console.warn("Governance Pulse: Latency detected in settings sync.", error);
      });
      return () => unsubscribe();
    }
  }, [isHydrated, isOnline]);

  const setActiveView = useCallback((view: WorkstationView) => {
    setActiveViewStatus(view);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('v', view.toLowerCase());
      router.push(`/?${params.toString()}`, { scroll: false });
    }
  }, [router]);

  const refreshRegistry = useCallback(async () => {
    try {
      const [localAssets, localSandbox, localSettings] = await Promise.all([
        storage.getAssets(),
        storage.getSandbox(),
        storage.getSettings()
      ]);

      if (localSettings) setAppSettings(localSettings);
      
      const currentGrantId = localSettings?.activeGrantId || null;
      const filtered = currentGrantId 
        ? (localAssets || []).filter(a => a.grantId === currentGrantId)
        : (localAssets || []);

      setAssets(DiscrepancyEngine.scan(filtered));
      setSandboxAssets(DiscrepancyEngine.scan(localSandbox || []));
    } catch (e) {
      console.error("Registry Refresh Failure", e);
    }
  }, []);

  const manualDownload = useCallback(async () => {
    if (!isOnline) {
      addNotification({ title: "Offline Scope", description: "Reconnection required for cloud pull.", variant: "destructive" });
      return;
    }

    const userSession = localStorage.getItem('assetain-user-session');
    const profile = userSession ? JSON.parse(userSession) : null;
    const stateScopes = (profile && !profile.isAdmin) ? profile.states : undefined;

    setIsSyncing(true);
    
    try {
      const remoteSettings = await FirestoreService.getSettings();
      if (remoteSettings) {
        setAppSettings(remoteSettings);
        await storage.saveSettings(remoteSettings);
        
        if (remoteSettings.activeGrantId) {
          const remoteAssets = await FirestoreService.getProjectAssets(remoteSettings.activeGrantId, stateScopes);
          const localAssets = await storage.getAssets();
          
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
          addNotification({ title: "Download Complete", description: `Synced ${remoteAssets.length} records.` });
        }
      }
      await refreshRegistry();
    } catch (e) {
      addNotification({ title: "Connection Latent", description: "Cloud heartbeat failed.", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, refreshRegistry]);

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

  const setReadAuthority = async (node: AuthorityNode) => {
    if (!appSettings) return;
    const nextSettings = { ...appSettings, readAuthority: node };
    setAppSettings(nextSettings);
    await storage.saveSettings(nextSettings);
    if (isOnline) await FirestoreService.updateSettings({ readAuthority: node });
    addNotification({ title: 'Authority Shifted', description: `Priority: ${node}` });
    await refreshRegistry();
  };

  const setActiveGrantId = useCallback(async (id: string) => {
    if (!appSettings) return;
    setIsSyncing(true);
    
    // Isolation Protocol: Purge current workspace to prepare for new Project Pulse
    try {
      const next = { ...appSettings, activeGrantId: id };
      
      // 1. Commit settings switch
      await storage.saveSettings(next);
      if (isOnline) {
        await FirestoreService.updateSettings({ activeGrantId: id });
      }
      
      // 2. Deterministic Wipe of previous project's local cache
      await storage.clearAssets();
      
      // 3. Force Application Restart to re-hydrate from clean state
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (e) {
      console.error("Project Switch Isolation Failure", e);
      setIsSyncing(false);
    }
  }, [appSettings, isOnline]);

  useEffect(() => {
    if (!isHydrated) return;
    refreshRegistry().then(() => setSettingsLoaded(true));
  }, [isHydrated, refreshRegistry]);

  return (
    <AppStateContext.Provider value={{
      assets, sandboxAssets, dataSource, setDataSource: setDataSourceStatus, isOnline, setIsOnline: setIsOnlineStatus,
      searchTerm, setSearchTerm, isSyncing, appSettings, setAppSettings, settingsLoaded, isHydrated,
      activeGrantId, activeView, setActiveView, refreshRegistry, manualDownload, manualUpload: () => processSyncQueue().then(refreshRegistry),
      setActiveGrantId, setReadAuthority, globalStateFilter, setGlobalStateFilter,
      selectedLocations, setSelectedLocations, selectedAssignees, setSelectedAssignees,
      selectedStatuses, setSelectedStatuses, selectedConditions, setSelectedConditions,
      missingFieldFilter, setMissingFieldFilter,
      headers, setHeaders, sortKey, setSortKey, sortDir, setSortDir,
      locationOptions, assigneeOptions, conditionOptions, statusOptions,
      isFilterOpen, setIsFilterOpen, isSortOpen, setIsSortOpen, filters, setFilters,
      selectedCategory, setSelectedCategory
    }}>
      <Suspense fallback={null}>
        <ViewParamSync activeView={activeView} setActiveViewStatus={setActiveViewStatus} />
      </Suspense>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) throw new Error('useAppState must be used within AppStateProvider');
  return context;
};
