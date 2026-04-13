'use client';

/**
 * @fileOverview AppStateContext - Central SPA Orchestrator.
 * Simplified for deployment with standard Asset Management language.
 * Phase 1801: Implemented logic for diagnostic token filtering (Summary Cards).
 * Phase 1802: Hardened diagnostic logic to inspect metadata for vehicles.
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
  activeGrantIds: string[];
  activeView: WorkstationView;
  setActiveView: (view: WorkstationView) => void;
  refreshRegistry: () => Promise<void>;
  manualDownload: () => Promise<void>;
  manualUpload: () => Promise<void>;
  setReadAuthority: (node: AuthorityNode) => Promise<void>;
  
  headers: RegistryHeader[];
  setHeaders: Dispatch<SetStateAction<RegistryHeader[]>>;
  sortKey: string;
  setSortKey: Dispatch<SetStateAction<string>>;
  sortDir: 'asc' | 'desc';
  setSortDir: Dispatch<SetStateAction<'asc' | 'desc'>>;

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

  const activeGrantIds = useMemo(() => appSettings?.activeGrantIds || [], [appSettings]);

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
      
      const currentGrantIds = localSettings?.activeGrantIds || [];
      const filtered = (localAssets || []).filter(a => currentGrantIds.length === 0 || currentGrantIds.includes(a.grantId));
        
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
      // 1. Handle Diagnostic Tokens (from Summary Cards)
      if (searchTerm === 'MISSING_ID') {
        results = results.filter(a => !a.assetIdCode || a.assetIdCode === 'N/A' || a.assetIdCode.trim() === '');
      } else if (searchTerm === 'MISSING_SN') {
        results = results.filter(a => !a.sn || a.sn === 'N/A' || a.sn.trim() === '');
      } else if (searchTerm === 'MISSING_CHASSIS') {
        results = results.filter(a => {
          const isVehicle = (a.category || '').toLowerCase().includes('motor') || (a.category || '').toLowerCase().includes('vehicle');
          if (!isVehicle) return false;
          
          const meta = a.metadata || {};
          const hasChassis = (!!a.chassisNo && a.chassisNo !== 'N/A') || 
                            Object.keys(meta).some(k => getFuzzySignature(k) === 'chassisno' && meta[k]);
          return !hasChassis;
        });
      } else if (searchTerm === 'MISSING_ENGINE') {
        results = results.filter(a => {
          const isVehicle = (a.category || '').toLowerCase().includes('motor') || (a.category || '').toLowerCase().includes('vehicle');
          if (!isVehicle) return false;
          
          const meta = a.metadata || {};
          const hasEngine = (!!a.engineNo && a.engineNo !== 'N/A') || 
                           Object.keys(meta).some(k => getFuzzySignature(k) === 'engineno' && meta[k]);
          return !hasEngine;
        });
      } else if (searchTerm === 'CONDITION_BAD') {
        results = results.filter(a => ['Bad condition', 'Poor', 'Burnt', 'Stolen', 'Unsalvageable'].includes(a.condition || ''));
      } else if (searchTerm === 'STATUS_UNVERIFIED') {
        results = results.filter(a => a.status === 'UNVERIFIED');
      } else if (searchTerm === 'WITH_REMARKS') {
        results = results.filter(a => !!a.remarks && a.remarks.trim() !== '');
      } else {
        // 2. Standard Fuzzy Search
        const fuzzySearch = getFuzzySignature(searchTerm);
        results = results.filter(a => {
          const hay = `${a.description} ${a.assetIdCode} ${a.serialNumber} ${a.location} ${a.custodian} ${a.category}`;
          return getFuzzySignature(hay).includes(fuzzySearch);
        });
      }
    }

    // Header-based Filter Pulse
    if (filters.length > 0) {
      filters.forEach(filter => {
        const header = headers.find(h => h.id === filter.headerId);
        if (!header) return;
        
        results = results.filter(asset => {
          let val = "";
          switch(header.normalizedName) {
            case "location": val = asset.location; break;
            case "condition": val = asset.condition; break;
            case "status": val = asset.status; break;
            case "asset_class": val = asset.category; break;
            default: val = String((asset.metadata as any)?.[header.rawName] || "");
          }
          
          if (filter.operator === 'in') {
            const allowed = (filter.value as string[]) || [];
            return allowed.includes(val);
          }
          return true;
        });
      });
    }

    if (sortKey) {
      const activeHeader = headers.find(h => h.id === sortKey);
      if (activeHeader) {
        results.sort((a, b) => {
          const getVal = (item: Asset) => {
            switch(activeHeader.normalizedName) {
              case "sn": return item.sn || "";
              case "asset_description": return item.description || "";
              case "asset_id_code": return item.assetIdCode || "";
              case "location": return item.location || "";
              case "condition": return item.condition || "";
              default: return String((item.metadata as any)?.[activeHeader.rawName] || "");
            }
          };
          const valA = String(getVal(a));
          const valB = String(getVal(b));
          return sortDir === 'asc' ? valA.localeCompare(valB, undefined, { numeric: true }) : valB.localeCompare(valA, undefined, { numeric: true });
        });
      }
    }

    return results;
  }, [assets, sandboxAssets, dataSource, searchTerm, selectedLocations, selectedAssignees, selectedStatuses, selectedConditions, missingFieldFilter, selectedCategories, sortKey, sortDir, headers, filters]);

  const locationOptions = useMemo(() => {
    const map = new Map<string, { label: string, count: number }>();
    assets.forEach(a => { 
      const norm = LocationEngine.normalize(a.location);
      const fuzzy = getFuzzySignature(norm.normalized);
      const existing = map.get(fuzzy);
      if (existing) existing.count++;
      else map.set(fuzzy, { label: norm.normalized, count: 1 });
    });
    return Array.from(map.values()).map(v => ({ label: v.label, value: v.label, count: v.count })).sort((a,b) => a.label.localeCompare(b.label));
  }, [assets]);

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, { label: string, count: number }>();
    assets.forEach(a => { 
      const display = (a.custodian || 'Unassigned').trim().replace(/\b\w/g, l => l.toUpperCase());
      const fuzzy = getFuzzySignature(display);
      const existing = map.get(fuzzy);
      if (existing) existing.count++;
      else map.set(fuzzy, { label: display, count: 1 });
    });
    return Array.from(map.values()).map(v => ({ label: v.label, value: v.label, count: v.count })).sort((a,b) => a.label.localeCompare(b.label));
  }, [assets]);

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => { counts.set(a.category, (counts.get(a.category) || 0) + 1); });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, value: label, count })).sort((a,b) => a.label.localeCompare(b.label));
  }, [assets]);

  const conditionOptions = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => { counts.set(a.condition, (counts.get(a.condition) || 0) + 1); });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, value: label, count })).sort((a,b) => a.label.localeCompare(b.label));
  }, [assets]);

  const statusOptions = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => { counts.set(a.status, (counts.get(a.status) || 0) + 1); });
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
        const currentGrantIds = remoteSettings.activeGrantIds || [];
        let allRemoteAssets: Asset[] = [];
        for (const gid of currentGrantIds) {
          const projectAssets = await FirestoreService.getProjectAssets(gid, stateScopes);
          allRemoteAssets = [...allRemoteAssets, ...projectAssets];
        }
        const localAssets = await storage.getAssets();
        const taggedRemote = allRemoteAssets.map(a => ({ ...a, syncStatus: 'synced' as const }));
        const otherAssets = localAssets.filter(a => !currentGrantIds.includes(a.grantId));
        await storage.saveAssets([...otherAssets, ...taggedRemote]);
        addNotification({ title: "System Synchronized", variant: "success" });
      }
      await refreshRegistry();
    } catch (e) {
      addNotification({ title: "Sync Error", variant: "destructive" });
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
      activeGrantIds, activeView, setActiveView: setActiveViewStatus,
      refreshRegistry, manualDownload, manualUpload,
      setReadAuthority: async (node) => { if (!appSettings) return; const next = { ...appSettings, readAuthority: node }; setAppSettings(next); await storage.saveSettings(next); if (isOnline) await FirestoreService.updateSettings({ readAuthority: node }); await refreshRegistry(); },
      headers, setHeaders, sortKey, setSortKey, sortDir, setSortDir,
      locationOptions, assigneeOptions, conditionOptions, statusOptions, categoryOptions,
      isFilterOpen, setIsFilterOpen, isSortOpen, setIsSortOpen, filters, setFilters,
      isCommandPaletteOpen, setIsCommandPaletteOpen,
      selectedCategory: selectedCategories.length === 1 ? selectedCategories[0] : null,
      selectedCategories, setSelectedCategories: (cats) => { setSelectedCategoriesStatus(cats); if (cats.length > 0) setActiveViewStatus('REGISTRY'); },
      setSelectedCategory: (cat) => { setSelectedCategoriesStatus(cat ? [cat] : []); if (cat) setActiveViewStatus('REGISTRY'); },
      isExplored, setIsExplored,
      itemsPerPage, setItemsPerPage, goBack: () => { if (activeView === 'REGISTRY' && (isExplored || selectedCategories.length > 0)) { setIsExplored(false); setSelectedCategoriesStatus([]); } else setActiveViewStatus('DASHBOARD'); },
      activeFilterCount: selectedLocations.length + selectedAssignees.length + selectedStatuses.length + (missingFieldFilter ? 1 : 0) + (selectedCategories.length > 0 ? 1 : 0) + filters.length,
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
