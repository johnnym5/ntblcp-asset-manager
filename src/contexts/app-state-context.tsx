'use client';

/**
 * @fileOverview AppStateContext - Central SPA Orchestrator.
 * Phase 1100: Centralized Filter Engine implementation.
 * Phase 1101: Added isExplored state for Folder Grid vs List View logic.
 * Phase 1102: Implemented deterministic boot pulse to ensure data persistence on refresh.
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
  filteredAssets: Asset[];
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
  isLogicFilterOpen: boolean;
  setIsLogicFilterOpen: (open: boolean) => void;
  isSortOpen: boolean;
  setIsSortOpen: (open: boolean) => void;
  filters: HeaderFilter[];
  setFilters: Dispatch<SetStateAction<HeaderFilter[]>>;

  selectedCategory: string | null;
  selectedCategories: string[];
  setSelectedCategories: (cats: string[]) => void;
  setSelectedCategory: (cat: string | null) => void;
  isExplored: boolean;
  setIsExplored: (val: boolean) => void;
  itemsPerPage: number | 'all';
  setItemsPerPage: (val: number | 'all') => void;
  goBack: () => void;
  activeFilterCount: number;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

function ViewParamSync({ activeView, setActiveViewStatus }: { activeView: WorkstationView, setActiveViewStatus: (v: WorkstationView) => void }) {
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLogicFilterOpen, setIsLogicFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [filters, setFilters] = useState<HeaderFilter[]>([]);
  const [selectedCategories, setSelectedCategoriesStatus] = useState<string[]>([]);
  const [isExplored, setIsExplored] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(25);

  const activeGrantId = useMemo(() => appSettings?.activeGrantId || null, [appSettings]);

  /**
   * Deterministic Registry Pulse:
   * Replays the local storage state into the application memory.
   */
  const refreshRegistry = useCallback(async () => {
    try {
      const [localAssets, localSandbox, localSettings] = await Promise.all([
        storage.getAssets(), 
        storage.getSandbox(), 
        storage.getSettings()
      ]);
      
      if (localSettings) {
        setAppSettings(localSettings);
        setSettingsLoaded(true);
      }
      
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

  useEffect(() => { 
    setIsHydrated(true);
    const savedStatus = localStorage.getItem('assetain-online-status');
    if (savedStatus) setIsOnlineStatus(JSON.parse(savedStatus));
    else if (typeof navigator !== 'undefined') setIsOnlineStatus(navigator.onLine);
  }, []);

  /**
   * INITIALIZATION PULSE:
   * Automatically re-loads the registry whenever the app boots or hydration completes.
   */
  useEffect(() => {
    if (isHydrated) {
      refreshRegistry();
    }
  }, [isHydrated, refreshRegistry]);

  useEffect(() => {
    if (!isHydrated) return;
    const handleOnline = () => { if (!isOnline) setIsOnline(true); };
    const handleOffline = () => { if (isOnline) setIsOnline(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isHydrated, isOnline]);

  useEffect(() => {
    if (!isHydrated) return;
    const savedHeaders = localStorage.getItem('registry-header-prefs');
    if (savedHeaders) setHeaders(JSON.parse(savedHeaders));
    else {
      const initial = DEFAULT_REGISTRY_HEADERS.map((h, i) => ({ ...h, id: `h-${i}`, orderIndex: i }));
      setHeaders(initial as RegistryHeader[]);
    }
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    storage.getSettings().then(local => {
      if (local) { setAppSettings(local); setSettingsLoaded(true); }
    });
    if (db && isOnline) {
      const settingsRef = doc(db, 'config', 'settings');
      const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
          const remoteSettings = snapshot.data() as AppSettings;
          setAppSettings(remoteSettings);
          storage.saveSettings(remoteSettings);
          setSettingsLoaded(true);
        } else setSettingsLoaded(true);
      });
      return () => unsubscribe();
    }
  }, [isHydrated, isOnline]);

  const activeFilterCount = useMemo(() => {
    return selectedLocations.length + selectedAssignees.length + selectedStatuses.length + (missingFieldFilter ? 1 : 0);
  }, [selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter]);

  const filteredAssets = useMemo(() => {
    const source = dataSource === 'PRODUCTION' ? assets : sandboxAssets;
    let results = [...source];

    if (selectedLocations.length > 0) results = results.filter(a => selectedLocations.includes(a.location));
    if (selectedAssignees.length > 0) results = results.filter(a => selectedAssignees.includes(a.custodian));
    if (selectedStatuses.length > 0) results = results.filter(a => selectedStatuses.includes(a.status));
    if (selectedConditions.length > 0) results = results.filter(a => selectedConditions.includes(a.condition));
    if (missingFieldFilter) results = results.filter(a => !a[missingFieldFilter as keyof Asset]);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(a => (a.description || '').toLowerCase().includes(term) || (a.assetIdCode || '').toLowerCase().includes(term));
    }
    return results;
  }, [assets, sandboxAssets, dataSource, searchTerm, selectedLocations, selectedAssignees, selectedStatuses, selectedConditions, missingFieldFilter]);

  const locationOptions = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => { const val = a.location || 'Unknown'; counts.set(val, (counts.get(val) || 0) + 1); });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, value: label, count })).sort((a,b) => a.label.localeCompare(b.label));
  }, [assets]);

  const assigneeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => { const val = a.custodian || 'Unassigned'; counts.set(val, (counts.get(val) || 0) + 1); });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, value: label, count })).sort((a,b) => a.label.localeCompare(b.label));
  }, [assets]);

  const conditionOptions = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => { const val = a.condition || 'Unassessed'; counts.set(val, (counts.get(val) || 0) + 1); });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, value: label, count })).sort((a,b) => a.label.localeCompare(b.label));
  }, [assets]);

  const statusOptions = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => { const val = a.status || 'UNVERIFIED'; counts.set(val, (counts.get(val) || 0) + 1); });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, value: label, count }));
  }, [assets]);

  const setActiveView = useCallback((view: WorkstationView) => {
    setActiveViewStatus(view);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('v', view.toLowerCase());
      router.push(`/?${params.toString()}`, { scroll: false });
    }
  }, [router]);

  const manualDownload = useCallback(async () => {
    if (!isOnline) { addNotification({ title: "Offline Scope", variant: "destructive" }); return; }
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
          const taggedRemote = remoteAssets.map(a => ({ ...a, syncStatus: 'synced' as const }));
          if (stateScopes) {
            const scopeSet = new Set(stateScopes.map(s => s.toLowerCase()));
            const otherAssets = localAssets.filter(a => a.grantId !== remoteSettings.activeGrantId || !scopeSet.has((a.location || '').toLowerCase()));
            nextAssets = [...otherAssets, ...taggedRemote];
          } else {
            const otherAssets = localAssets.filter(a => a.grantId !== remoteSettings.activeGrantId);
            nextAssets = [...otherAssets, ...taggedRemote];
          }
          await storage.saveAssets(nextAssets);
          addNotification({ title: "Sync Successful", variant: "success" });
        }
      }
      await refreshRegistry();
    } finally { setIsSyncing(false); }
  }, [isOnline, refreshRegistry]);

  const manualUpload = useCallback(async () => {
    if (!isOnline) { addNotification({ title: "Upload Failed", variant: "destructive" }); return; }
    addNotification({ title: "Upload Initiated" });
    await processSyncQueue();
    await refreshRegistry();
  }, [isOnline, refreshRegistry]);

  const goBack = useCallback(() => {
    if (activeView === 'REGISTRY' && isExplored) {
      setIsExplored(false);
      setSelectedCategoriesStatus([]);
    } else if (activeView === 'REGISTRY' && selectedCategories.length > 0) {
      setSelectedCategoriesStatus([]);
    } else {
      setActiveView('DASHBOARD');
    }
  }, [activeView, isExplored, selectedCategories, setActiveView]);

  return (
    <AppStateContext.Provider value={{
      assets, filteredAssets, sandboxAssets, dataSource, setDataSource: setDataSourceStatus, isOnline, setIsOnline: setIsOnlineStatus,
      searchTerm, setSearchTerm, isSyncing, appSettings, setAppSettings, settingsLoaded, isHydrated,
      activeGrantId, activeView, setActiveView, refreshRegistry, manualDownload, manualUpload,
      setActiveGrantId: async (id) => {
        if (!appSettings) return;
        const next = { ...appSettings, activeGrantId: id };
        await storage.saveSettings(next);
        if (isOnline) await FirestoreService.updateSettings({ activeGrantId: id });
        setAppSettings(next);
        await refreshRegistry();
      },
      setReadAuthority: async (node) => {
        if (!appSettings) return;
        const next = { ...appSettings, readAuthority: node };
        setAppSettings(next);
        await storage.saveSettings(next);
        if (isOnline) await FirestoreService.updateSettings({ readAuthority: node });
        await refreshRegistry();
      },
      globalStateFilter, setGlobalStateFilter,
      selectedLocations, setSelectedLocations, selectedAssignees, setSelectedAssignees,
      selectedStatuses, setSelectedStatuses, selectedConditions, setSelectedConditions,
      missingFieldFilter, setMissingFieldFilter,
      headers, setHeaders, sortKey, setSortKey, sortDir, setSortDir,
      locationOptions, assigneeOptions, conditionOptions, statusOptions,
      isFilterOpen, setIsFilterOpen, isLogicFilterOpen, setIsLogicFilterOpen, isSortOpen, setIsSortOpen, filters, setFilters,
      selectedCategory: selectedCategories.length === 1 ? selectedCategories[0] : null,
      selectedCategories, setSelectedCategories: (cats) => { setSelectedCategoriesStatus(cats); if (cats.length > 0) setActiveView('REGISTRY'); },
      setSelectedCategory: (cat) => { setSelectedCategoriesStatus(cat ? [cat] : []); if (cat) setActiveView('REGISTRY'); },
      isExplored, setIsExplored,
      itemsPerPage, setItemsPerPage, goBack, activeFilterCount
    }}>
      <Suspense fallback={null}><ViewParamSync activeView={activeView} setActiveViewStatus={setActiveViewStatus} /></Suspense>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) throw new Error('useAppState must be used within AppStateProvider');
  return context;
};
