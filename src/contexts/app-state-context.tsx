'use client';

/**
 * @fileOverview AppStateContext - Central SPA Orchestrator.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, Dispatch, SetStateAction, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { storage } from '@/offline/storage';
import { processSyncQueue } from '@/offline/sync';
import { FirestoreService } from '@/services/firebase/firestore';
import { db } from '@/lib/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { DiscrepancyEngine } from '@/lib/discrepancy-engine';
import type { 
  Asset, 
  AppSettings, 
  DataSource, 
  AuthorityNode, 
  WorkstationView, 
  OptionType, 
  SortConfig, 
  DataActions 
} from '@/types/domain';
import type { RegistryHeader, HeaderFilter } from '@/types/registry';
import { addNotification } from '@/hooks/use-notifications';
import { DEFAULT_REGISTRY_HEADERS } from '@/lib/registry-utils';

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

  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;
  isSortOpen: boolean;
  setIsSortOpen: (open: boolean) => void;
  filters: HeaderFilter[];
  setFilters: Dispatch<SetStateAction<HeaderFilter[]>>;

  selectedCategory: string | null;
  selectedCategories: string[];
  setSelectedCategories: (cats: string[]) => void;
  setSelectedCategory: (cat: string | null) => void;
  itemsPerPage: number | 'all';
  setItemsPerPage: (val: number | 'all') => void;
  goBack: () => void;
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
    const saved = localStorage.getItem('assetain-online-status');
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

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [filters, setFilters] = useState<HeaderFilter[]>([]);

  const [selectedCategories, setSelectedCategoriesStatus] = useState<string[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(25);

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

  const goBack = useCallback(() => {
    if (activeView === 'REGISTRY' && selectedCategories.length > 0) {
      setSelectedCategoriesStatus([]);
    } else {
      setActiveView('DASHBOARD');
    }
  }, [activeView, selectedCategories, setActiveView]);

  const setSelectedCategories = useCallback((cats: string[]) => {
    setSelectedCategoriesStatus(cats);
    if (cats.length > 0) {
      setActiveView('REGISTRY');
    }
  }, [setActiveView]);

  const setSelectedCategory = useCallback((cat: string | null) => {
    setSelectedCategories(cat ? [cat] : []);
  }, [setSelectedCategories]);

  const selectedCategory = useMemo(() => selectedCategories.length === 1 ? selectedCategories[0] : null, [selectedCategories]);

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
    addNotification({ title: "Download Initiated", description: "Fetching latest assigned records from Cloud Authority..." });
    
    try {
      const remoteSettings = await FirestoreService.getSettings();
      if (remoteSettings) {
        setAppSettings(remoteSettings);
        await storage.saveSettings(remoteSettings);
        
        if (remoteSettings.activeGrantId) {
          const remoteAssets = await FirestoreService.getProjectAssets(remoteSettings.activeGrantId, stateScopes);
          const localAssets = await storage.getAssets();
          
          let nextAssets;
          const taggedRemote = remoteAssets.map(a => ({ ...a, syncStatus: 'synced' as const }));

          if (stateScopes) {
            const scopeSet = new Set(stateScopes.map(s => s.toLowerCase()));
            const otherAssets = localAssets.filter(a => 
              a.grantId !== remoteSettings.activeGrantId || 
              !scopeSet.has((a.location || '').toLowerCase())
            );
            nextAssets = [...otherAssets, ...taggedRemote];
          } else {
            const otherAssets = localAssets.filter(a => a.grantId !== remoteSettings.activeGrantId);
            nextAssets = [...otherAssets, ...taggedRemote];
          }
            
          await storage.saveAssets(nextAssets);
          addNotification({ title: "Sync Successful", description: `Retrieved ${remoteAssets.length} records for ${profile?.state || 'Global'}.`, variant: "success" });
        }
      }
      await refreshRegistry();
    } catch (e) {
      addNotification({ title: "Connection Latent", description: "Cloud heartbeat failed. Retry when link stabilizes.", variant: "destructive" });
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
    addNotification({ title: 'Authority Shifted', description: `Priority: ${node}`, variant: "success" });
    await refreshRegistry();
  };

  const setIsOnline = useCallback((status: boolean) => {
    setIsOnlineStatus(status);
    if (typeof window !== 'undefined') {
      localStorage.setItem('assetain-online-status', JSON.stringify(status));
    }
    addNotification({ 
      title: status ? "Online Mode" : "Offline Scope", 
      description: status ? "Connecting to Cloud Authority..." : "Working in regional persistence pulse." 
    });
  }, []);

  const setActiveGrantId = useCallback(async (id: string) => {
    if (!appSettings) return;
    setIsSyncing(true);
    
    try {
      const next = { ...appSettings, activeGrantId: id };
      await storage.saveSettings(next);
      if (isOnline) {
        await FirestoreService.updateSettings({ activeGrantId: id });
      }
      setAppSettings(next);
      await refreshRegistry();
      addNotification({ title: "Project Scope Switched", description: `Active: ${next.grants.find(g => g.id === id)?.name}`, variant: "success" });
    } finally {
      setIsSyncing(false);
    }
  }, [appSettings, isOnline, refreshRegistry]);

  const manualUpload = useCallback(async () => {
    if (!isOnline) {
      addNotification({ title: "Upload Failed", description: "Internet required for cloud broadcast.", variant: "destructive" });
      return;
    }
    addNotification({ title: "Upload Initiated", description: "Broadcasting local modifications to Cloud Authority..." });
    await processSyncQueue();
    await refreshRegistry();
  }, [isOnline, refreshRegistry]);

  useEffect(() => {
    if (!isHydrated) return;
    refreshRegistry().then(() => setSettingsLoaded(true));
  }, [isHydrated, refreshRegistry]);

  return (
    <AppStateContext.Provider value={{
      assets, sandboxAssets, dataSource, setDataSource: setDataSourceStatus, isOnline, setIsOnline,
      searchTerm, setSearchTerm, isSyncing, appSettings, setAppSettings, settingsLoaded, isHydrated,
      activeGrantId, activeView, setActiveView, refreshRegistry, manualDownload, manualUpload,
      setActiveGrantId, setReadAuthority, globalStateFilter, setGlobalStateFilter,
      selectedLocations, setSelectedLocations, selectedAssignees, setSelectedAssignees,
      selectedStatuses, setSelectedStatuses, selectedConditions, setSelectedConditions,
      missingFieldFilter, setMissingFieldFilter,
      headers, setHeaders, sortKey, setSortKey, sortDir, setSortDir,
      locationOptions, assigneeOptions, conditionOptions, statusOptions,
      isFilterOpen, setIsFilterOpen, isSortOpen, setIsSortOpen, filters, setFilters,
      selectedCategory, selectedCategories, setSelectedCategories, setSelectedCategory,
      itemsPerPage, setItemsPerPage, goBack
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
