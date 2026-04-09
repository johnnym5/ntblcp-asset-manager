'use client';

/**
 * @fileOverview AppStateContext - Central SPA Orchestrator.
 * Phase 1303: Category-Aware Technical ID Gap filtering (Chassis/Engine for vehicles vs Serial/Model for others).
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, Dispatch, SetStateAction, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { storage } from '@/offline/storage';
import { processSyncQueue } from '@/offline/sync';
import { FirestoreService } from '@/services/firebase/firestore';
import { db } from '@/lib/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { DiscrepancyEngine } from '@/lib/discrepancy-engine';
import { LocationEngine } from '@/lib/location-engine';
import { getFuzzySignature, sanitizeSearch } from '@/lib/utils';
import type { 
  Asset, 
  AppSettings, 
  DataSource, 
  AuthorityNode, 
  WorkstationView, 
  OptionType, 
  SortConfig 
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
  categoryOptions: OptionType[];

  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;
  isSortOpen: boolean;
  setIsSortOpen: (open: boolean) => void;
  filters: HeaderFilter[];
  setFilters: Dispatch<SetStateAction<HeaderFilter[]>>;

  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;

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

  groupsViewMode: 'category' | 'condition';
  setGroupsViewMode: Dispatch<SetStateAction<'category' | 'condition'>>;
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
  const [groupsViewMode, setGroupsViewMode] = useState<'category' | 'condition'>('category');
  
  const [headers, setHeaders] = useState<RegistryHeader[]>(
    DEFAULT_REGISTRY_HEADERS.map((h, i) => ({ ...h, id: `h-${i}`, orderIndex: i })) as RegistryHeader[]
  );
  
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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [filters, setFilters] = useState<HeaderFilter[]>([]);
  const [selectedCategories, setSelectedCategoriesStatus] = useState<string[]>([]);
  const [isExplored, setIsExplored] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(25);

  const activeGrantId = useMemo(() => appSettings?.activeGrantId || null, [appSettings]);

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
        if (localSettings.globalHeaders && localSettings.globalHeaders.length > 0) {
          setHeaders(localSettings.globalHeaders);
        }
      }
      
      const currentGrantId = localSettings?.activeGrantId || null;
      const filtered = (localAssets || []).filter(a => !currentGrantId || a.grantId === currentGrantId);
        
      setAssets(DiscrepancyEngine.scan(filtered));
      setSandboxAssets(DiscrepancyEngine.scan(localSandbox || []));
    } catch (e) { 
      console.error("Registry Refresh Error:", e); 
    }
  }, []);

  useEffect(() => { 
    setIsHydrated(true);
    const savedStatus = localStorage.getItem('assetain-online-status');
    if (savedStatus) setIsOnlineStatus(JSON.parse(savedStatus));
    else if (typeof navigator !== 'undefined') setIsOnlineStatus(navigator.onLine);
  }, []);

  useEffect(() => { if (isHydrated) refreshRegistry(); }, [isHydrated, refreshRegistry]);

  useEffect(() => {
    if (!isHydrated) return;
    const handleOnline = () => { if (!isOnline) setIsOnlineStatus(true); };
    const handleOffline = () => { if (isOnline) setIsOnlineStatus(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isHydrated, isOnline]);

  useEffect(() => {
    if (!isHydrated) return;
    storage.getSettings().then(local => {
      if (local) { 
        setAppSettings(local); 
        setSettingsLoaded(true); 
        if (local.globalHeaders && local.globalHeaders.length > 0) setHeaders(local.globalHeaders);
      }
    });
    if (db && isOnline) {
      const unsubscribe = onSnapshot(doc(db, 'config', 'settings'), (snapshot) => {
        if (snapshot.exists()) {
          const remoteSettings = snapshot.data() as AppSettings;
          setAppSettings(remoteSettings);
          if (remoteSettings.globalHeaders && remoteSettings.globalHeaders.length > 0) {
            setHeaders(remoteSettings.globalHeaders);
          }
          storage.saveSettings(remoteSettings);
          setSettingsLoaded(true);
        } else setSettingsLoaded(true);
      });
      return () => unsubscribe();
    }
  }, [isHydrated, isOnline]);

  const filteredAssets = useMemo(() => {
    const source = dataSource === 'PRODUCTION' ? assets : sandboxAssets;
    let results = [...source];

    if (selectedLocations.length > 0) {
      const selectedFuzzy = selectedLocations.map(l => getFuzzySignature(l));
      results = results.filter(a => selectedFuzzy.includes(getFuzzySignature(a.location)));
    }

    if (selectedAssignees.length > 0) {
      const selectedFuzzy = selectedAssignees.map(a => getFuzzySignature(a));
      results = results.filter(a => selectedFuzzy.includes(getFuzzySignature(a.custodian)));
    }

    if (selectedCategories.length > 0) {
      results = results.filter(a => selectedCategories.includes(a.category));
    }

    if (selectedStatuses.length > 0) results = results.filter(a => selectedStatuses.includes(a.status));
    if (selectedConditions.length > 0) results = results.filter(a => selectedConditions.includes(a.condition));
    if (missingFieldFilter) results = results.filter(a => !a[missingFieldFilter as keyof Asset]);

    if (searchTerm) {
      // Diagnostic Token Resolution
      if (searchTerm === 'MISSING_ID') {
        results = results.filter(a => !a.assetIdCode || a.assetIdCode === 'N/A' || a.assetIdCode.trim() === '');
      } else if (searchTerm === 'MISSING_SERIAL') {
        // Category-Aware Technical ID filter
        results = results.filter(a => {
          const cat = (a.category || '').toLowerCase();
          const isVehicle = cat.includes('motor') || cat.includes('vehicle');
          if (isVehicle) {
            return !a.chassisNo || a.chassisNo === 'N/A' || a.chassisNo.trim() === '' || 
                   !a.engineNo || a.engineNo === 'N/A' || a.engineNo.trim() === '';
          } else {
            return !a.serialNumber || a.serialNumber === 'N/A' || a.serialNumber.trim() === '' || 
                   !a.modelNumber || a.modelNumber === 'N/A' || a.modelNumber.trim() === '';
          }
        });
      } else if (searchTerm === 'CONDITION_BAD') {
        results = results.filter(a => ['Bad condition', 'Poor', 'Burnt', 'Stolen', 'Unsalvageable', 'F2: Major repairs required-poor condition'].includes(a.condition || ''));
      } else {
        const fuzzySearch = getFuzzySignature(searchTerm);
        results = results.filter(a => {
          const hay = `${a.description} ${a.assetIdCode} ${a.serialNumber} ${a.location} ${a.custodian} ${a.category}`;
          return getFuzzySignature(hay).includes(fuzzySearch);
        });
      }
    }
    return results;
  }, [assets, sandboxAssets, dataSource, searchTerm, selectedLocations, selectedAssignees, selectedStatuses, selectedConditions, missingFieldFilter, selectedCategories]);

  const locationOptions = useMemo(() => {
    const map = new Map<string, { label: string, count: number }>();
    assets.forEach(a => { 
      const norm = LocationEngine.normalize(a.location);
      const fuzzy = getFuzzySignature(norm.normalized);
      const existing = map.get(fuzzy);
      if (existing) {
        existing.count++;
      } else {
        map.set(fuzzy, { label: norm.normalized, count: 1 });
      }
    });
    return Array.from(map.values()).map(v => ({ label: v.label, value: v.label, count: v.count })).sort((a,b) => a.label.localeCompare(b.label));
  }, [assets]);

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, { label: string, count: number }>();
    assets.forEach(a => { 
      const display = (a.custodian || 'Unassigned').trim().replace(/\b\w/g, l => l.toUpperCase());
      const fuzzy = getFuzzySignature(display);
      const existing = map.get(fuzzy);
      if (existing) {
        existing.count++;
      } else {
        map.set(fuzzy, { label: display, count: 1 });
      }
    });
    return Array.from(map.values()).map(v => ({ label: v.label, value: v.label, count: v.count })).sort((a,b) => a.label.localeCompare(b.label));
  }, [assets]);

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => { 
      const display = a.category || 'Uncategorized';
      counts.set(display, (counts.get(display) || 0) + 1); 
    });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, value: label, count })).sort((a,b) => a.label.localeCompare(b.label));
  }, [assets]);

  const conditionOptions = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => { 
      const display = a.condition || 'Unassessed';
      counts.set(display, (counts.get(display) || 0) + 1); 
    });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, value: label, count })).sort((a,b) => a.label.localeCompare(b.label));
  }, [assets]);

  const statusOptions = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => { 
      const display = a.status || 'UNVERIFIED';
      counts.set(display, (counts.get(display) || 0) + 1); 
    });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, value: label, count })).sort((a,b) => a.label.localeCompare(b.label));
  }, [assets]);

  const manualDownload = useCallback(async () => {
    if (!isOnline) return;
    const userSession = localStorage.getItem('assetain-user-session');
    const profile = userSession ? JSON.parse(userSession) : null;
    const stateScopes = (profile && !profile.isAdmin) ? profile.states : undefined;
    setIsSyncing(true);
    try {
      const remoteSettings = await FirestoreService.getSettings();
      if (remoteSettings) {
        setAppSettings(remoteSettings);
        if (remoteSettings.globalHeaders && remoteSettings.globalHeaders.length > 0) setHeaders(remoteSettings.globalHeaders);
        await storage.saveSettings(remoteSettings);
        if (remoteSettings.activeGrantId) {
          const remoteAssets = await FirestoreService.getProjectAssets(remoteSettings.activeGrantId, stateScopes);
          const localAssets = await storage.getAssets();
          const taggedRemote = remoteAssets.map(a => ({ ...a, syncStatus: 'synced' as const }));
          const otherAssets = localAssets.filter(a => a.grantId !== remoteSettings.activeGrantId);
          await storage.saveAssets([...otherAssets, ...taggedRemote]);
          addNotification({ title: "Update Successful", variant: "success" });
        }
      }
      await refreshRegistry();
    } catch (e) {
      addNotification({ title: "Update Error", variant: "destructive" });
    } finally { setIsSyncing(false); }
  }, [isOnline, refreshRegistry]);

  const manualUpload = useCallback(async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      await processSyncQueue();
      await refreshRegistry();
    } catch (e) {
      addNotification({ title: "Upload Error", variant: "destructive" });
    } finally { setIsSyncing(false); }
  }, [isOnline, refreshRegistry]);

  return (
    <AppStateContext.Provider value={{
      assets, filteredAssets, sandboxAssets, dataSource, setDataSource: setDataSourceStatus, isOnline, setIsOnline: setIsOnlineStatus,
      searchTerm, setSearchTerm, isSyncing, appSettings, setAppSettings, settingsLoaded, isHydrated,
      activeGrantId, activeView, setActiveView: setActiveViewStatus,
      refreshRegistry, manualDownload, manualUpload,
      setActiveGrantId: async (id) => { if (!appSettings) return; const next = { ...appSettings, activeGrantId: id }; await storage.saveSettings(next); if (isOnline) await FirestoreService.updateSettings({ activeGrantId: id }); setAppSettings(next); await refreshRegistry(); },
      setReadAuthority: async (node) => { if (!appSettings) return; const next = { ...appSettings, readAuthority: node }; setAppSettings(next); await storage.saveSettings(next); if (isOnline) await FirestoreService.updateSettings({ readAuthority: node }); await refreshRegistry(); },
      globalStateFilter, setGlobalStateFilter,
      selectedLocations, setSelectedLocations, selectedAssignees, setSelectedAssignees,
      selectedStatuses, setSelectedStatuses, selectedConditions, setSelectedConditions,
      missingFieldFilter, setMissingFieldFilter,
      headers, setHeaders, sortKey, setSortKey, sortDir, setSortDir,
      locationOptions, assigneeOptions, conditionOptions, statusOptions, categoryOptions,
      isFilterOpen, setIsFilterOpen, isSortOpen, setIsSortOpen, filters, setFilters,
      isCommandPaletteOpen, setIsCommandPaletteOpen,
      selectedCategory: selectedCategories.length === 1 ? selectedCategories[0] : null,
      selectedCategories, setSelectedCategories: (cats) => { setSelectedCategoriesStatus(cats); if (cats.length > 0) setActiveViewStatus('REGISTRY'); },
      setSelectedCategory: (cat) => { setSelectedCategoriesStatus(cat ? [cat] : []); if (cat) setActiveViewStatus('REGISTRY'); },
      isExplored, setIsExplored,
      itemsPerPage, setItemsPerPage, goBack: () => { if (activeView === 'REGISTRY' && (isExplored || selectedCategories.length > 0)) { setIsExplored(false); setSelectedCategoriesStatus([]); } else setActiveViewStatus('DASHBOARD'); },
      activeFilterCount: selectedLocations.length + selectedAssignees.length + selectedStatuses.length + (missingFieldFilter ? 1 : 0) + (selectedCategories.length > 0 ? 1 : 0),
      groupsViewMode, setGroupsViewMode
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
