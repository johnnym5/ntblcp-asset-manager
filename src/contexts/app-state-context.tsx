'use client';

/**
 * @fileOverview AppStateContext - Central SPA Orchestrator.
 * Hardened for strict production build and App Hosting support.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, Dispatch, SetStateAction, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { storage } from '@/offline/storage';
import { processSyncQueue } from '@/offline/sync';
import { FirestoreService } from '@/services/firebase/firestore';
import { db } from '@/lib/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { DiscrepancyEngine } from '@/lib/discrepancy-engine';
import { LocationEngine } from '@/services/location-engine';
import { getFuzzySignature, sanitizeSearch } from '@/lib/utils';
import type { 
  Asset, 
  AppSettings, 
  DataSource, 
  AuthorityNode, 
  WorkstationView, 
  OptionType, 
  SyncSummary,
  SyncStrategy,
  AppStateContextType
} from '@/types/domain';
import type { RegistryHeader, HeaderFilter } from '@/types/registry';
import { addNotification } from '@/hooks/use-notifications';
import { DEFAULT_REGISTRY_HEADERS } from '@/lib/registry-utils';

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
  
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);

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
  const activeGrantId = useMemo(() => appSettings?.activeGrantId || (activeGrantIds.length > 0 ? activeGrantIds[0] : null), [appSettings, activeGrantIds]);

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
      
      const currentGrantIds = (localSettings?.activeGrantIds && localSettings.activeGrantIds.length > 0)
        ? localSettings.activeGrantIds 
        : (localSettings?.grants.map(g => g.id) || []);

      const filtered = (localAssets || []).filter(a => {
        if (currentGrantIds.length === 0) return true;
        if (!currentGrantIds.includes(a.grantId)) return false;
        
        const grant = localSettings?.grants.find(g => g.id === a.grantId);
        if (!grant || grant.enabledSheets.length === 0) return true;
        return grant.enabledSheets.includes(a.category);
      });
        
      setAssets(DiscrepancyEngine.scan(filtered as any) as any);
      setSandboxAssets(DiscrepancyEngine.scan(localSandbox as any) as any);
    } catch (e) { 
      console.error("Registry Refresh Error:", e); 
    }
  }, []);

  useEffect(() => { 
    setIsHydrated(true);
    if (typeof window !== 'undefined') {
      const savedStatus = localStorage.getItem('assetain-online-status');
      if (savedStatus) setIsOnlineStatus(JSON.parse(savedStatus));
      else setIsOnlineStatus(navigator.onLine);
    }
  }, []);

  useEffect(() => { if (isHydrated) refreshRegistry(); }, [isHydrated, refreshRegistry]);

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
    if (!appSettings) return [];

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
      if (searchTerm === 'MISSING_ID') {
        results = results.filter(a => !a.assetIdCode || a.assetIdCode === 'N/A' || a.assetIdCode.trim() === '');
      } else if (searchTerm === 'MISSING_SN') {
        results = results.filter(a => !a.sn || a.sn === 'N/A' || a.sn.trim() === '');
      } else if (searchTerm === 'STATUS_UNVERIFIED') {
        results = results.filter(a => a.status === 'UNVERIFIED');
      } else {
        const fuzzySearch = getFuzzySignature(searchTerm);
        results = results.filter(a => {
          const hay = `${a.description} ${a.assetIdCode} ${a.serialNumber} ${a.location} ${a.custodian} ${a.category}`;
          return getFuzzySignature(hay).includes(fuzzySearch);
        });
      }
    }

    if (sortKey) {
      const activeHeader = headers.find(h => h.id === sortKey);
      if (activeHeader) {
        results.sort((a, b) => {
          const getVal = (item: Asset) => {
            switch(activeHeader.normalizedName) {
              case "sn": return item.sn || "";
              case "description": return item.description || "";
              case "assetidcode": return item.assetIdCode || "";
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
  }, [assets, sandboxAssets, dataSource, searchTerm, selectedLocations, selectedAssignees, selectedStatuses, selectedConditions, missingFieldFilter, selectedCategories, sortKey, sortDir, headers, appSettings]);

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

  const areAssetsIdentical = useCallback((local: Asset, remote: Asset): boolean => {
    const keysToIgnore = ['syncStatus', 'lastModified', 'lastModifiedBy', 'lastModifiedByState', 'previousState', 'updateCount', 'unseenUpdateFields', 'importMetadata'];
    const localClean = Object.keys(local).filter(k => !keysToIgnore.includes(k)).reduce((obj, key) => ({ ...obj, [key]: (local as any)[key] }), {});
    const remoteClean = Object.keys(remote).filter(k => !keysToIgnore.includes(k)).reduce((obj, key) => ({ ...obj, [key]: (remote as any)[key] }), {});
    return JSON.stringify(localClean) === JSON.stringify(remoteClean);
  }, []);

  const manualDownload = useCallback(async (stateScopes?: string[]): Promise<SyncSummary | null> => {
    if (!isOnline) return null;
    setIsSyncing(true);
    addNotification({ title: "Scanning Cloud Authority...", description: "Reconciling timestamps for global parity." });
    try {
      const currentGrantIds = (appSettings?.activeGrantIds && appSettings.activeGrantIds.length > 0) ? appSettings.activeGrantIds : (appSettings?.grants.map(g => g.id) || []);
      if (currentGrantIds.length === 0) { setIsSyncing(false); return null; }
      let allRemoteAssets: Asset[] = [];
      for (const gid of currentGrantIds) {
        const projectAssets = await FirestoreService.getProjectAssets(gid, stateScopes);
        allRemoteAssets = [...allRemoteAssets, ...projectAssets];
      }
      const localAssets = await storage.getAssets();
      const localMap = new Map(localAssets.map(a => [getFuzzySignature(a.assetIdCode || a.serialNumber || a.id), a]));
      const newItems: Asset[] = [];
      const existingItems: Asset[] = [];
      const autoUpdateItems: Asset[] = [];
      allRemoteAssets.forEach(remote => {
        const id = getFuzzySignature(remote.assetIdCode || remote.serialNumber || remote.id);
        const local = localMap.get(id);
        if (!local) newItems.push(remote);
        else {
          if (!areAssetsIdentical(local, remote)) {
            const remoteTime = new Date(remote.lastModified).getTime();
            const localTime = new Date(local.lastModified).getTime();
            if (remoteTime > localTime) autoUpdateItems.push(remote);
            else if (localTime > remoteTime && local.syncStatus === 'local') existingItems.push(remote);
          }
        }
      });
      const totalCount = newItems.length + autoUpdateItems.length + existingItems.length;
      if (totalCount === 0) {
        addNotification({ title: "Parity Confirmed", description: "Your regional registry is in sync with the cloud." });
        setIsSyncing(false);
        return null;
      }
      const summary: SyncSummary = { type: 'DOWNLOAD', newItems: [...newItems, ...autoUpdateItems], existingItems, totalCount };
      setSyncSummary(summary);
      setIsSyncConfirmOpen(true);
      return summary;
    } catch (e) {
      addNotification({ title: "Sync Scan Failed", variant: "destructive" });
      return null;
    } finally { setIsSyncing(false); }
  }, [isOnline, appSettings, areAssetsIdentical]);

  const manualUpload = useCallback(async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      const queue = await storage.getQueue();
      const pending = queue.filter(q => q.status === 'PENDING');
      if (pending.length === 0) {
        addNotification({ title: "Local Store Synchronized", description: "Zero modifications pending upload." });
        setIsSyncing(false);
        return;
      }
      setSyncSummary({ type: 'UPLOAD', newItems: pending.map(q => q.payload as any), existingItems: [], totalCount: pending.length });
      setIsSyncConfirmOpen(true);
    } finally { setIsSyncing(false); }
  }, [isOnline]);

  const executeSync = async (strategy: SyncStrategy, overrideSummary?: SyncSummary) => {
    const activeSummary = overrideSummary || syncSummary;
    if (!activeSummary) return;
    setIsSyncing(true);
    setIsSyncConfirmOpen(false);
    try {
      if (activeSummary.type === 'DOWNLOAD') {
        const local = await storage.getAssets();
        const localMap = new Map(local.map(a => [getFuzzySignature(a.assetIdCode || a.serialNumber || a.id), a]));
        let nextAssets = [...local];
        activeSummary.newItems.forEach(item => {
          const id = getFuzzySignature(item.assetIdCode || item.serialNumber || item.id);
          const existing = localMap.get(id);
          if (existing) nextAssets = nextAssets.map(a => getFuzzySignature(a.assetIdCode || a.serialNumber || a.id) === id ? { ...item, syncStatus: 'synced' } : a);
          else nextAssets.push({ ...item, syncStatus: 'synced' });
        });
        if (strategy === 'UPDATE' && activeSummary.existingItems.length > 0) {
          activeSummary.existingItems.forEach(remote => {
            const id = getFuzzySignature(remote.assetIdCode || remote.serialNumber || remote.id);
            nextAssets = nextAssets.map(a => getFuzzySignature(a.assetIdCode || a.serialNumber || a.id) === id ? { ...remote, syncStatus: 'synced' } : a);
          });
        }
        await storage.saveAssets(nextAssets);
        addNotification({ title: "Registry Parity Established", description: `Processed ${activeSummary.totalCount} record pulses.`, variant: "success" });
      } else { await processSyncQueue(); }
      await refreshRegistry();
    } catch (e) { addNotification({ title: "Sync Execution Failure", variant: "destructive" }); } finally { setIsSyncing(false); setSyncSummary(null); }
  };

  return (
    <AppStateContext.Provider value={{
      assets, filteredAssets, sandboxAssets, dataSource, setDataSource: setDataSourceStatus, isOnline, setIsOnline: setIsOnlineStatus,
      searchTerm, setSearchTerm, isSyncing, setIsSyncing, appSettings, setAppSettings, settingsLoaded, isHydrated,
      activeGrantIds, activeGrantId, activeView, setActiveView: setActiveViewStatus,
      refreshRegistry, manualDownload, manualUpload, executeSync, syncSummary, isSyncConfirmOpen, setIsSyncConfirmOpen,
      setReadAuthority: async (node) => { if (!appSettings) return; const next = { ...appSettings, readAuthority: node }; setAppSettings(next); await storage.saveSettings(next); if (isOnline) await FirestoreService.updateSettings({ readAuthority: node }); await refreshRegistry(); },
      headers, setHeaders, sortKey, setSortKey, sortDir, setSortDir,
      selectedLocations, setSelectedLocations, selectedAssignees, setSelectedAssignees,
      selectedStatuses, setSelectedStatuses, selectedConditions, setSelectedConditions,
      missingFieldFilter, setMissingFieldFilter,
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
