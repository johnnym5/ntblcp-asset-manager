"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  MoreHorizontal,
  Loader2,
  Trash2,
  ArrowLeft,
  Edit,
  AlertCircle,
  Check,
  FileText,
  ClipboardEdit,
  FolderSearch,
  CloudUpload,
  HardDrive,
  ArrowRightLeft,
  Delete,
  PlaneTakeoff,
  Database,
  PlusCircle,
  ScanSearch,
  CloudOff,
  Download,
  Columns,
  Eye,
  EyeOff,
  Copy,
  ChevronRight,
  LayoutDashboard,
  TableProperties,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

import { AssetForm } from "./asset-form";
import type { Asset, AppSettings, SheetDefinition, DisplayField } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel, sanitizeForFirestore } from "@/lib/excel-parser";
import { NIGERIAN_ZONES, NIGERIAN_STATES, ZONAL_STORES, SPECIAL_LOCATIONS, NIGERIAN_STATE_CAPITALS } from "@/lib/constants";
import { useAppState, type SortConfig } from "@/contexts/app-state-context";
import { useAuth } from "@/contexts/auth-context";
import { AssetBatchEditForm, type BatchUpdateData } from "./asset-batch-edit-form";
import { CategoryBatchEditForm, type CategoryBatchUpdateData } from "./category-batch-edit-form";
import { PaginationControls } from "./pagination-controls";
import { getAssets, batchSetAssets, deleteAsset, batchDeleteAssets, updateSettings as updateSettingsFS } from "@/lib/firestore";
import { getAssets as getAssetsRTDB, batchSetAssets as batchSetAssetsRTDB, deleteAsset as deleteAssetRTDB, batchDeleteAssets as batchDeleteAssetsRTDB, clearAssets as clearRtdbAssets } from "@/lib/database";
import { getLocalAssets as getLocalAssetsFromDb, saveAssets, clearLocalAssets, getLockedOfflineAssets, saveLockedOfflineAssets } from "@/lib/idb";
import { cn, normalizeAssetLocation, getStatusClasses, assetMatchesGlobalFilter } from "@/lib/utils";
import { addNotification } from "@/hooks/use-notifications";
import { TravelReportDialog } from "./travel-report-dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { ImportScannerDialog } from "./single-sheet-import-dialog";
import { SyncConfirmationDialog, type SyncSummary } from "./sync-confirmation-dialog";
import { ColumnCustomizationSheet } from "./column-customization-sheet";
import { AssetSummaryDashboard } from "./asset-summary-dashboard";
import { isToday, isThisWeek, parseISO } from 'date-fns';
import { Badge } from "./ui/badge";


/**
 * Compares two asset-like objects to see if any relevant fields have changed.
 */
const haveAssetDetailsChanged = (a: Partial<Asset>, b: Partial<Asset>): boolean => {
    const keys = Object.keys(b) as (keyof Asset)[];
    for (const key of keys) {
        if (['id', 'syncStatus', 'lastModified', 'lastModifiedBy', 'lastModifiedByState', 'previousState'].includes(key)) {
            continue;
        }
        const valA = String(a[key] ?? '').trim();
        const valB = String(b[key] ?? '').trim();
        if (valA !== valB) {
            return true;
        }
    }
    return false;
};

const LocationProgress: React.FC<{ locationName: string; allAssets: Asset[]; appMode: 'management' | 'verification' }> = ({ locationName, allAssets, appMode }) => {
    const locationAssets = useMemo(() => {
        if (locationName === 'All') {
            return allAssets;
        }

        const lowerCaseLocation = locationName.toLowerCase().trim();
        const isZonalStore = ZONAL_STORES.map(z => z.toLowerCase()).includes(lowerCaseLocation);

        if (isZonalStore) {
            return allAssets.filter(asset => {
                const assetLocation = (asset.location || "").toLowerCase().trim();
                return assetLocation.includes(lowerCaseLocation) && assetLocation.includes("zonal store");
            });
        }
        
        if (SPECIAL_LOCATIONS.map(l => l.toLowerCase()).includes(lowerCaseLocation)) {
             return allAssets.filter(asset => (asset.location || "").toLowerCase().trim().includes(lowerCaseLocation));
        }

        const capitalCity = NIGERIAN_STATE_CAPITALS[locationName]?.toLowerCase().trim();
        return allAssets.filter(asset => {
            const assetLocation = (asset.location || "").toLowerCase().trim();
            const matchesState = assetLocation.startsWith(lowerCaseLocation);
            const matchesCapital = capitalCity ? assetLocation.startsWith(capitalCity) : false;
            return matchesState || matchesCapital;
        });

    }, [locationName, allAssets]);

    const total = locationAssets.length;
    if (total === 0 && locationName !== 'All') {
        return (
            <div className="flex justify-between items-center w-full p-2 group">
                <span className="text-muted-foreground">{locationName}</span>
                <span className="text-[10px] bg-muted px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">0 items</span>
            </div>
        );
    }

    const verified = locationAssets.filter(a => a.verifiedStatus === 'Verified').length;
    const percentage = total > 0 ? (verified / total) * 100 : 0;
    const displayName = locationName === 'All' ? 'Overall Project Scope' : locationName;

    return (
        <div className="flex flex-col w-full gap-1.5 p-2 rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex justify-between items-center w-full text-xs font-semibold">
                <span>{displayName}</span>
                {appMode === 'verification' ? (
                  <span className="text-[10px] font-mono bg-primary/10 text-primary px-1 rounded">{verified}/{total}</span>
                ) : (
                  <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1 rounded">{total}</span>
                )}
            </div>
            {appMode === 'verification' && <Progress value={percentage} className="h-1" />}
        </div>
    );
};


export default function AssetList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormReadOnly, setIsFormReadOnly] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const { userProfile, authInitialized } = useAuth();
  const { toast } = useToast();

  const [view, setView] = useState<'dashboard' | 'table'>('dashboard');
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [isClearCategoryDialogOpen, setIsClearCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCategoryBatchEditOpen, setIsCategoryBatchEditOpen] = useState(false);
  const [isTravelReportOpen, setIsTravelReportOpen] = useState(false);
  const [isImportScanOpen, setIsImportScanOpen] = useState(false);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);
  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [sheetToEdit, setSheetToEdit] = useState<SheetDefinition | null>(null);
  const [originalSheetNameToEdit, setOriginalSheetNameToEdit] = useState<string | null>(null);
  const [isDownloadWarningOpen, setIsDownloadWarningOpen] = useState(false);
  const [numUnsynced, setNumUnsynced] = useState(0);
  
  const {
    assets, setAssets, isOnline, setIsOnline, 
    offlineAssets, setOfflineAssets, dataSource, setDataSource,
    globalStateFilter, setGlobalStateFilter,
    itemsPerPage, setItemsPerPage,
    selectedLocations, setSelectedLocations,
    selectedAssignees, setSelectedAssignees,
    selectedStatuses, setSelectedStatuses,
    missingFieldFilter, setMissingFieldFilter,
    dateFilter, setDateFilter,
    locationOptions, setLocationOptions,
    assigneeOptions, setAssigneeOptions,
    statusOptions, setStatusOptions,
    sortConfig, setSortConfig,
    appSettings, setAppSettings,
    manualDownloadTrigger,
    manualUploadTrigger,
    isSyncing, setIsSyncing,
    searchTerm,
    assetToView, setAssetToView,
    showProjectSwitchDialog,
    setShowProjectSwitchDialog,
    activeDatabase,
    setOnRevertAsset,
    activeGrantId,
    conditionFilter, setConditionFilter,
    setConditionOptions,
    setDataActions,
    firstTimeSetupStatus,
    setFirstTimeSetupStatus,
  } = useAppState();

  const grant = useMemo(() => {
    if (!appSettings || !appSettings.grants) return null;
    return appSettings.grants.find(g => g.id === activeGrantId);
  }, [appSettings, activeGrantId]);

  const sheetDefinitions = useMemo(() => grant?.sheetDefinitions || {}, [grant]);


  const isAdmin = userProfile?.isAdmin || false;
  const isGuest = userProfile?.isGuest || false;
  
  const activeAssets = useMemo(() => dataSource === 'cloud' ? assets : offlineAssets, [dataSource, assets, offlineAssets]);

  const specialLocations = useMemo(() => {
    if (!appSettings?.locations) return SPECIAL_LOCATIONS.sort((a, b) => a.localeCompare(b));
    const defaultSpecial = new Set(SPECIAL_LOCATIONS);
    const states = new Set(NIGERIAN_STATES);
    const zones = new Set(ZONAL_STORES);
    
    appSettings.locations?.forEach(loc => {
        if (!states.has(loc) && !zones.has(loc)) {
            defaultSpecial.add(loc);
        }
    });

    return Array.from(defaultSpecial).sort((a,b) => a.localeCompare(b));
  }, [appSettings?.locations]);

  const clearAllDialogDescription = useMemo(() => {
    let message = `This will permanently delete all asset records from the ${dataSource === 'cloud' ? 'main' : 'locked offline'} store on your local device.`;
    if (isAdmin && isOnline && dataSource === 'cloud') {
      message += " As an admin who is online, this will ALSO delete all assets from the cloud database, which cannot be undone."
    }
    return message;
  }, [isAdmin, isOnline, dataSource]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCategories([]);
  }, [searchTerm, selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter, dateFilter, globalStateFilter, dataSource, conditionFilter]);
  
  useEffect(() => {
    if (view === 'dashboard') {
        setSelectedAssetIds([]);
    } else {
        setSelectedCategories([]);
    }
  }, [view]);

  // --- DATA LOADING & SYNC ---
  const executeDownload = useCallback(async (summary: SyncSummary, isFirstTime?: boolean) => {
    setIsSyncing(true);
    if (!isFirstTime) {
      addNotification({ title: 'Downloading updates...' });
    }
    
    try {
        const { newFromCloud, updatedFromCloud, deletedOnCloud } = summary;
        let localAssets = await getLocalAssetsFromDb();
        const mergedAssetsMap = new Map(localAssets.map(a => [a.id, a]));

        // Handle deletions
        if (deletedOnCloud && deletedOnCloud.length > 0) {
            for (const assetToDelete of deletedOnCloud) {
                mergedAssetsMap.delete(assetToDelete.id);
            }
        }
        
        // Handle adds/updates
        const assetsToProcess = [...newFromCloud, ...updatedFromCloud];

        for (const cloudAsset of assetsToProcess) {
            mergedAssetsMap.set(cloudAsset.id, { ...cloudAsset, syncStatus: 'synced' });
        }
        
        const finalAssets = Array.from(mergedAssetsMap.values());
        await saveAssets(finalAssets);
        setAssets(finalAssets);

        const totalChanges = assetsToProcess.length + (deletedOnCloud?.length || 0);
        
        if (!isFirstTime) {
          addNotification({ title: 'Sync Successful', description: `${totalChanges} items synchronized from cloud.` });
        } else {
          addNotification({ title: 'System Initialized', description: `Successfully downloaded ${totalChanges} state-assigned assets.` });
        }
        
    } catch (error) {
        console.error("Download failed:", error);
        addNotification({
          title: "Synchronization Error",
          description: error instanceof Error ? error.message : "An unexpected network error occurred.",
          variant: 'destructive'
        });
        if (isFirstTime) setFirstTimeSetupStatus('idle');
    } finally {
        setIsSyncing(false);
        if (!isFirstTime) {
          setIsSyncConfirmOpen(false);
          setSyncSummary(null);
        } else {
          setFirstTimeSetupStatus('complete');
        }
    }
}, [setAssets, setIsSyncing, setFirstTimeSetupStatus]);

  const executeUpload = useCallback(async () => {
      if (!syncSummary || syncSummary.type !== 'upload') return;

      setIsSyncing(true);
      addNotification({ title: 'Uploading local changes...' });

      try {
          const { toUpload: assetsToPush } = syncSummary;
          const batchSet = activeDatabase === 'firestore' ? batchSetAssets : batchSetAssetsRTDB;

          if (assetsToPush.length > 0) {
              await batchSet(assetsToPush);
              
              const localAssets = await getLocalAssetsFromDb();
              const localMap = new Map(localAssets.map(a => [a.id, a]));
              assetsToPush.forEach(pushedAsset => {
                  const localVersion = localMap.get(pushedAsset.id);
                  if (localVersion) {
                      localMap.set(pushedAsset.id, { ...localVersion, syncStatus: 'synced' });
                  }
              });
              const updatedLocalAssets = Array.from(localMap.values());
              await saveAssets(updatedLocalAssets);
              setAssets(updatedLocalAssets);

              addNotification({ title: 'Cloud Updated', description: `Successfully pushed ${assetsToPush.length} local edits.` });
          }
      } catch (error) {
          console.error("Upload failed:", error);
          addNotification({
            title: "Upload Failed",
            description: "A network error prevented your changes from reaching the cloud.",
            variant: 'destructive'
          });
      } finally {
          setIsSyncing(false);
          setIsSyncConfirmOpen(false);
          setSyncSummary(null);
      }
  }, [syncSummary, setAssets, setIsSyncing, activeDatabase]);

  const handleSyncConfirm = () => {
    if (syncSummary?.type === 'download') {
      executeDownload(syncSummary);
    } else if (syncSummary?.type === 'upload') {
      executeUpload();
    }
  };

    const handleUploadScan = useCallback(async () => {
    if (!isOnline || !authInitialized || isGuest) return;

    setIsSyncing(true);
    addNotification({ title: 'Scanning local storage...' });
    
    try {
        const localAssets = await getLocalAssetsFromDb();
        const assetsToPush = localAssets.filter(a => a.syncStatus === 'local');

        if (assetsToPush.length > 0) {
            setSyncSummary({
                newFromCloud: [],
                updatedFromCloud: [],
                keptLocal: [],
                toUpload: assetsToPush,
                deletedOnCloud: [],
                type: 'upload',
            });
            setIsSyncConfirmOpen(true);
        } else {
            addNotification({ title: 'Fully Synced', description: 'No local changes detected.' });
        }
    } catch (error) {
        console.error("Upload scan failed:", error);
        addNotification({
          title: "Scanner Error",
          variant: 'destructive'
        });
    } finally {
        setIsSyncing(false);
    }
}, [isOnline, authInitialized, isGuest, setIsSyncing]);

    const handleDownloadScan = useCallback(async (isFirstTime = false) => {
    if (!isOnline || !authInitialized || isGuest) return;

    if (!isFirstTime) {
      const localAssetsUnsynced = await getLocalAssetsFromDb();
      const unsyncedAssets = localAssetsUnsynced.filter(a => a.syncStatus === 'local');
      if (unsyncedAssets.length > 0) {
        setNumUnsynced(unsyncedAssets.length);
        setIsDownloadWarningOpen(true);
        return;
      }
    }

    setIsSyncing(true);
    addNotification({ title: isFirstTime ? 'Initializing state database...' : 'Checking for cloud updates...' });

    try {
        const getCloudAssets = activeDatabase === 'firestore' ? getAssets : getAssetsRTDB;
        const allCloudAssets = await getCloudAssets(activeGrantId);
        
        // CRITICAL: Filter cloud assets to only those matching the user's current state/scope
        const cloudAssets = allCloudAssets.filter(asset => assetMatchesGlobalFilter(asset, globalStateFilter));
        
        const localAssets = await getLocalAssetsFromDb();
        const localAssetsMap = new Map(localAssets.map(a => [a.id, a]));
        const cloudAssetIds = new Set(cloudAssets.map(a => a.id));

        const summary: SyncSummary = {
            newFromCloud: [],
            updatedFromCloud: [],
            keptLocal: [],
            toUpload: [],
            deletedOnCloud: [],
            type: 'download',
        };

        for (const cloudAsset of cloudAssets) {
            const localAsset = localAssetsMap.get(cloudAsset.id);
            if (localAsset) {
                const cloudTimestamp = cloudAsset.lastModified ? new Date(cloudAsset.lastModified).getTime() : 0;
                const localTimestamp = localAsset.lastModified ? new Date(localAsset.lastModified).getTime() : 0;

                if (localAsset.syncStatus === 'local' && localTimestamp > cloudTimestamp) {
                    summary.keptLocal.push(localAsset);
                } else {
                    if (haveAssetDetailsChanged(localAsset, cloudAsset)) {
                       summary.updatedFromCloud.push(cloudAsset);
                    }
                }
            } else {
                summary.newFromCloud.push(cloudAsset);
            }
        }
        
        // Handle removals
        for (const localAsset of localAssets) {
            if (!cloudAssetIds.has(localAsset.id) && localAsset.syncStatus !== 'local') {
                if(assetMatchesGlobalFilter(localAsset, globalStateFilter)) {
                    summary.deletedOnCloud?.push(localAsset);
                }
            }
        }
        
        if (summary.newFromCloud.length === 0 && summary.updatedFromCloud.length === 0 && summary.keptLocal.length === 0 && (summary.deletedOnCloud || []).length === 0) {
            if (!isFirstTime) addNotification({ title: 'Already Up-to-Date' });
            if (isFirstTime) setFirstTimeSetupStatus('complete');
        } else {
            if (isFirstTime) {
                await executeDownload(summary, true);
            } else {
                setSyncSummary(summary);
                setIsSyncConfirmOpen(true);
            }
        }
    } catch (error) {
        console.error("Download scan failed:", error);
        addNotification({
          title: "Sync Error",
          variant: 'destructive'
        });
        if (isFirstTime) setFirstTimeSetupStatus('idle');
        setIsOnline(false);
    } finally {
        setIsSyncing(false);
    }
  }, [isOnline, authInitialized, isGuest, setIsOnline, setIsSyncing, activeDatabase, activeGrantId, globalStateFilter, executeDownload, setFirstTimeSetupStatus]);
  
  useEffect(() => {
    if (firstTimeSetupStatus === 'syncing') {
      handleDownloadScan(true);
    }
  }, [firstTimeSetupStatus, handleDownloadScan]);

  const handleOverwriteDownload = useCallback(async () => {
    setIsDownloadWarningOpen(false);
    setIsSyncing(true);
    addNotification({ title: 'Overwriting local cache...' });
    
    try {
        const getCloudAssets = activeDatabase === 'firestore' ? getAssets : getAssetsRTDB;
        const allCloudAssets = await getCloudAssets(activeGrantId);
        
        const assetsToSave = allCloudAssets
            .filter(asset => assetMatchesGlobalFilter(asset, globalStateFilter))
            .map(asset => ({ ...asset, syncStatus: 'synced' as const }));
        
        await saveAssets(assetsToSave);
        setAssets(assetsToSave);
        
        addNotification({ title: 'Refresh Complete', description: `${assetsToSave.length} records reloaded.` });
    } catch (error) {
        console.error("Forced download scan failed:", error);
        setIsOnline(false);
    } finally {
        setIsSyncing(false);
    }
  }, [setIsSyncing, setIsOnline, activeDatabase, setAssets, activeGrantId, globalStateFilter]);
  
  const handleUploadFirst = useCallback(() => {
    setIsDownloadWarningOpen(false);
    handleUploadScan();
  }, [handleUploadScan]);

  // Initial load from IndexedDB
  useEffect(() => {
    const loadInitialDataFromDb = async () => {
      setIsLoading(true);
      const localAssets = await getLocalAssetsFromDb();
      const localOfflineAssets = await getLockedOfflineAssets();
      setAssets(localAssets);
      setOfflineAssets(localOfflineAssets);
      setIsLoading(false);
    };

    loadInitialDataFromDb();
  }, [setAssets, setOfflineAssets]);

  useEffect(() => {
    if (manualDownloadTrigger > 0) handleDownloadScan();
  }, [manualDownloadTrigger, handleDownloadScan]);
  
  useEffect(() => {
    if (manualUploadTrigger > 0) handleUploadScan();
  }, [manualUploadTrigger, handleUploadScan]);
  
  useEffect(() => {
    if (appSettings?.appMode === 'verification') {
        setStatusOptions([
            { value: "Verified", label: "Verified" },
            { value: "Unverified", label: "Unverified" },
        ]);
    } else {
        setStatusOptions([]);
    }
  }, [appSettings?.appMode, setStatusOptions]);

  const allAssetsForFiltering = useMemo(() => {
    if (globalStateFilter && globalStateFilter !== 'All') {
        return activeAssets.filter(asset => assetMatchesGlobalFilter(asset, globalStateFilter));
    }
    return activeAssets;
  }, [activeAssets, globalStateFilter]);
  
  useEffect(() => {
    const locations = new Map<string, number>();
    allAssetsForFiltering.forEach(asset => {
      const normalized = normalizeAssetLocation(asset.location);
      if (normalized) {
        locations.set(normalized, (locations.get(normalized) || 0) + 1);
      }
    });

    NIGERIAN_STATES.forEach(state => {
      if(!locations.has(state)) locations.set(state, 0);
    });
    
    setLocationOptions(Array.from(locations.entries()).map(([l, count]) => ({ label: l, value: l, count })).sort((a, b) => a.label.localeCompare(b.label)));

    const assigneeMap = new Map<string, number>();
    allAssetsForFiltering.forEach(asset => {
      if (asset.assignee) {
        const name = asset.assignee.trim();
        if (name) assigneeMap.set(name, (assigneeMap.get(name) || 0) + 1);
      }
    });
    setAssigneeOptions(Array.from(assigneeMap.entries()).map(([a, count]) => ({ label: a, value: a, count })).sort((a,b) => a.label.localeCompare(b.label)));

    const conditionMap = new Map<string, number>();
    allAssetsForFiltering.forEach(asset => {
        if (asset.condition) {
            const name = asset.condition.trim();
            if (name) conditionMap.set(name, (conditionMap.get(name) || 0) + 1);
        }
    });
    setConditionOptions(Array.from(conditionMap.entries()).map(([c, count]) => ({ label: c, value: c, count })).sort((a,b) => a.label.localeCompare(b.label)));
  }, [allAssetsForFiltering, setLocationOptions, setAssigneeOptions, setConditionOptions]);


  const sortAssets = (assetsToSort: Asset[], config: SortConfig | null): Asset[] => {
    if (!config) return assetsToSort;

    const dateFields = new Set(['lastModified', 'verifiedDate', 'dateReceived']);

    return [...assetsToSort].sort((a, b) => {
        const aVal = a[config.key];
        const bVal = b[config.key];

        if (config.key && dateFields.has(config.key)) {
            const dateA = aVal ? new Date(aVal as string).getTime() : 0;
            const dateB = bVal ? new Date(bVal as string).getTime() : 0;
            if (dateA < dateB) return config.direction === 'asc' ? 1 : -1;
            if (dateA > dateB) return config.direction === 'asc' ? -1 : 1;
            return 0;
        }

        if (config.key === 'sn') {
            const numA = Number(aVal) || 0;
            const numB = Number(bVal) || 0;
            if (numA < numB) return config.direction === 'asc' ? -1 : 1;
            if (numA > numB) return config.direction === 'asc' ? 1 : -1;
            return 0;
        }
        
        const strA = String(aVal ?? '').toLowerCase();
        const strB = String(bVal ?? '').toLowerCase();

        if (strA < strB) return config.direction === 'asc' ? -1 : 1;
        if (strA > strB) return config.direction === 'asc' ? 1 : -1;
        return 0;
    });
  };

  const displayedAssets = useMemo(() => {
    let results = allAssetsForFiltering.filter(asset => {
      if (!asset.category) return false;
      const def = sheetDefinitions?.[asset.category];
      if (!def || def.isHidden) return false;
      
      if (userProfile?.loginName === 'admin') return true;
      
      const disabledFor = def.disabledFor || [];
      if (disabledFor.includes('all') && !userProfile?.isAdmin) return false;
      if (userProfile && disabledFor.includes(userProfile.loginName)) return false;
      
      return true;
    });

    const hasFilters = selectedLocations.length > 0 || selectedAssignees.length > 0 || selectedStatuses.length > 0 || missingFieldFilter || dateFilter || conditionFilter.length > 0;
    if (hasFilters) {
        results = results.filter(asset => {
            const locationMatch = selectedLocations.length === 0 || selectedLocations.includes(normalizeAssetLocation(asset.location));
            const assigneeMatch = selectedAssignees.length === 0 || (asset.assignee && selectedAssignees.map(a => a.toLowerCase()).includes(asset.assignee.trim().toLowerCase()));
            const statusMatch = selectedStatuses.length === 0 || (asset.verifiedStatus && selectedStatuses.includes(asset.verifiedStatus));
            const conditionMatch = conditionFilter.length === 0 || (asset.condition && conditionFilter.includes(asset.condition));
            const missingFieldMatch = !missingFieldFilter || !asset[missingFieldFilter as keyof Asset];

            let dateMatch = true;
            if (dateFilter) {
                if (!asset.lastModified) {
                    dateMatch = false;
                } else {
                    const modifiedDate = parseISO(asset.lastModified);
                    if (dateFilter === 'today') dateMatch = isToday(modifiedDate);
                    else if (dateFilter === 'week') dateMatch = isThisWeek(modifiedDate, { weekStartsOn: 1 });
                    else if (dateFilter === 'new-week') dateMatch = isThisWeek(modifiedDate, { weekStartsOn: 1 }) && !asset.previousState;
                }
            }

            return locationMatch && assigneeMatch && statusMatch && missingFieldMatch && dateMatch && conditionMatch;
        });
    }

    if (searchTerm) {
        const tokens = searchTerm.toLowerCase().split(' ').filter(t => t.length > 0);
        if (tokens.length > 0) {
            results = results.filter(asset => {
                const haystack = Object.values(asset)
                    .map(v => (typeof v === 'object' && v !== null) ? Object.values(v).join(' ') : String(v))
                    .join(' ').toLowerCase();
                return tokens.every(t => haystack.includes(t));
            });
        }
    }
    
    return sortAssets(results, sortConfig);
  }, [allAssetsForFiltering, searchTerm, selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter, dateFilter, conditionFilter, sortConfig, sheetDefinitions, userProfile]);

  const assetsByCategory = useMemo(() => {
    return displayedAssets.reduce((acc, asset) => {
        const category = asset.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(asset);
        return acc;
    }, {} as { [key: string]: Asset[] });
  }, [displayedAssets]);

  const categoryFilteredAssets = useMemo(() => {
    if (!currentCategory) return [];
    return assetsByCategory[currentCategory] || [];
  }, [currentCategory, assetsByCategory]);


  const handleAddAsset = useCallback(() => {
    if (!userProfile?.canAddAssets && !isAdmin) {
      addNotification({ title: "Restricted", description: "You don't have adding permissions.", variant: "destructive" });
      return;
    }
    setSelectedAsset(undefined);
    setIsFormReadOnly(false);
    setIsFormOpen(true);
  }, [isAdmin, userProfile]);
  
  const handleViewAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormReadOnly(true);
    setIsFormOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    if (!userProfile?.canEditAssets && !isAdmin) {
      addNotification({ title: "Restricted", variant: "destructive" });
      return;
    }
    setSelectedAsset(asset);
    setIsFormReadOnly(false);
    setIsFormOpen(true);
  };

  useEffect(() => {
    if (assetToView) {
        handleViewAsset(assetToView);
        setAssetToView(null);
    }
  }, [assetToView, setAssetToView]);

  const handleTravelReport = useCallback(() => setIsTravelReportOpen(true), []);
  const handleClearAllClick = useCallback(() => setIsClearAllDialogOpen(true), []);

  useEffect(() => {
    setDataActions({
        onAddAsset: handleAddAsset,
        onClearAll: handleClearAllClick,
        onTravelReport: handleTravelReport,
        onScanAndImport: () => setIsImportScanOpen(true),
    });
    return () => setDataActions({});
  }, [setDataActions, handleAddAsset, handleClearAllClick, handleTravelReport]);

  const handleDeleteConfirm = async () => {
    if (!assetToDelete) return;

    if (dataSource === 'cloud') {
      const currentAssets = await getLocalAssetsFromDb();
      const updatedAssets = currentAssets.filter(a => a.id !== assetToDelete.id);
      await saveAssets(updatedAssets);
      setAssets(updatedAssets);
  
      if (isOnline) {
        try {
          const deleteCloudAsset = activeDatabase === 'firestore' ? deleteAsset : deleteAssetRTDB;
          await deleteCloudAsset(assetToDelete.id);
        } catch (e) {
          addNotification({ title: 'Cloud Deletion Failed', variant: 'destructive'});
        }
      }
    } else {
      const currentOfflineAssets = await getLockedOfflineAssets();
      const updatedOfflineAssets = currentOfflineAssets.filter(a => a.id !== assetToDelete.id);
      await saveLockedOfflineAssets(updatedOfflineAssets);
      setOfflineAssets(updatedOfflineAssets);
    }

    setAssetToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const handleBatchDelete = async () => {
    setIsBatchDeleting(true);
    const count = selectedAssetIds.length;

    if (dataSource === 'cloud') {
      let currentAssets = await getLocalAssetsFromDb();
      const ids = new Set(selectedAssetIds);
      currentAssets = currentAssets.filter(a => !ids.has(a.id));
      await saveAssets(currentAssets);
      setAssets(currentAssets);
  
      if (isOnline) {
          try {
              const batchDeleteCloudAssets = activeDatabase === 'firestore' ? batchDeleteAssets : batchDeleteAssetsRTDB;
              await batchDeleteCloudAssets(selectedAssetIds);
          } catch (e) {
              addNotification({ title: 'Cloud Batch Delete Error', variant: 'destructive' });
          }
      }
    } else {
      let currentOfflineAssets = await getLockedOfflineAssets();
      const ids = new Set(selectedAssetIds);
      currentOfflineAssets = currentOfflineAssets.filter(a => !ids.has(a.id));
      await saveLockedOfflineAssets(currentOfflineAssets);
      setOfflineAssets(currentOfflineAssets);
    }

    setSelectedAssetIds([]);
    setIsBatchDeleting(false);
  };

  const handleBatchEdit = () => {
    if (!userProfile?.canEditAssets && !isAdmin) return;
    setIsBatchEditOpen(true);
  }
  
  const handleSaveBatchEdit = async (data: BatchUpdateData) => {
    const assetsToUpdate = (dataSource === 'cloud' ? assets : offlineAssets).filter(a => selectedAssetIds.includes(a.id));
    
    const updatedAssets = assetsToUpdate.map(asset => {
        const updatedAsset: Asset = { 
            ...asset, 
            ...data, 
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile?.displayName,
            lastModifiedByState: globalStateFilter,
            syncStatus: dataSource === 'cloud' ? 'local' : undefined,
        };
        if (data.verifiedStatus === 'Verified' && !asset.verifiedDate) {
            updatedAsset.verifiedDate = new Date().toLocaleDateString("en-CA");
        } else if (data.verifiedStatus && data.verifiedStatus !== 'Verified') {
            updatedAsset.verifiedDate = '';
        }
        return sanitizeForFirestore(updatedAsset);
    });

    if (dataSource === 'cloud') {
      let currentAssets = await getLocalAssetsFromDb();
      const map = new Map(updatedAssets.map(a => [a.id, a]));
      currentAssets = currentAssets.map(a => map.get(a.id) || a);
      await saveAssets(currentAssets);
      setAssets(currentAssets);
    } else {
      let currentOfflineAssets = await getLockedOfflineAssets();
      const map = new Map(updatedAssets.map(a => [a.id, a]));
      currentOfflineAssets = currentOfflineAssets.map(a => map.get(a.id) || a);
      await saveLockedOfflineAssets(currentOfflineAssets);
      setOfflineAssets(currentOfflineAssets);
    }
    
    setSelectedAssetIds([]);
  };

  const handleSaveAsset = async (assetToSave: Asset) => {
    const sourceAssets = dataSource === 'cloud' ? assets : offlineAssets;
    const originalAsset = sourceAssets.find(a => a.id === assetToSave.id);

    if (!originalAsset || haveAssetDetailsChanged(originalAsset, assetToSave)) {
        let previousState: Partial<Asset> | undefined = undefined;
        if (originalAsset) {
            previousState = {};
            for(const key in assetToSave) {
                const k = key as keyof Asset;
                if(originalAsset[k] !== assetToSave[k]) (previousState as any)[k] = originalAsset[k];
            }
        }

        const finalAsset: Asset = sanitizeForFirestore({
            ...assetToSave,
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile?.displayName,
            lastModifiedByState: globalStateFilter,
            syncStatus: dataSource === 'cloud' ? 'local' : undefined,
            previousState: Object.keys(previousState || {}).length > 0 ? previousState : undefined,
        });
      
      if (dataSource === 'cloud') {
        const currentAssets = await getLocalAssetsFromDb();
        const idx = currentAssets.findIndex(a => a.id === finalAsset.id);
        if (idx > -1) currentAssets[idx] = finalAsset;
        else currentAssets.unshift(finalAsset);
        await saveAssets(currentAssets);
        setAssets(currentAssets);
      } else {
        const currentOfflineAssets = await getLockedOfflineAssets();
        const idx = currentOfflineAssets.findIndex(a => a.id === finalAsset.id);
        if (idx > -1) currentOfflineAssets[idx] = finalAsset;
        else currentOfflineAssets.unshift(finalAsset);
        await saveLockedOfflineAssets(currentOfflineAssets);
        setOfflineAssets(currentOfflineAssets);
      }

    } else {
        addNotification({ title: 'No Changes Detected' });
    }
    
    setIsFormOpen(false);
  };

  const handleQuickSaveAsset = async (assetId: string, data: { remarks?: string; condition?: string; verifiedStatus?: 'Verified' | 'Unverified', verifiedDate?: string }) => {
    const sourceAssets = dataSource === 'cloud' ? assets : offlineAssets;
    const asset = sourceAssets.find(a => a.id === assetId);
    if (!asset) return;

    if (asset.remarks === data.remarks && asset.verifiedStatus === data.verifiedStatus && asset.condition === data.condition) return;

    const updatedAsset: Asset = sanitizeForFirestore({ 
        ...asset, 
        ...data, 
        lastModified: new Date().toISOString(),
        lastModifiedBy: userProfile?.displayName,
        lastModifiedByState: globalStateFilter,
        syncStatus: dataSource === 'cloud' ? 'local' : undefined,
    });

    if (dataSource === 'cloud') {
      const currentAssets = await getLocalAssetsFromDb();
      const idx = currentAssets.findIndex(a => a.id === assetId);
      if (idx > -1) {
          currentAssets[idx] = updatedAsset;
          await saveAssets(currentAssets);
          setAssets(currentAssets);
      }
    } else {
      const currentOfflineAssets = await getLockedOfflineAssets();
      const idx = currentOfflineAssets.findIndex(a => a.id === assetId);
      if (idx > -1) {
          currentOfflineAssets[idx] = updatedAsset;
          await saveLockedOfflineAssets(currentOfflineAssets);
          setOfflineAssets(currentOfflineAssets);
      }
    }
  };

  const handleRevertAsset = useCallback(async (assetId: string) => {
    const assetToRevert = activeAssets.find(a => a.id === assetId);
    if (!assetToRevert || !assetToRevert.previousState) {
        toast({ title: "Cannot Revert", variant: "destructive" });
        return;
    }

    const rolledBackAsset: Asset = sanitizeForFirestore({
      ...assetToRevert,
      ...assetToRevert.previousState,
      previousState: undefined,
      lastModified: new Date().toISOString(),
      lastModifiedBy: userProfile?.displayName,
      lastModifiedByState: userProfile?.states[0],
      syncStatus: 'local',
    });

    const currentAssets = await getLocalAssetsFromDb();
    const idx = currentAssets.findIndex(a => a.id === assetId);
    if (idx > -1) {
        currentAssets[idx] = rolledBackAsset;
        await saveAssets(currentAssets);
        setAssets(currentAssets);
        toast({ title: "Asset Reverted" });
    }
  }, [activeAssets, userProfile, setAssets, toast]);

  useEffect(() => {
    setOnRevertAsset(() => handleRevertAsset);
    return () => setOnRevertAsset(() => async () => {});
  }, [handleRevertAsset, setOnRevertAsset]);

  const handleSelectAll = (checked: boolean, allFilteredAssets: Asset[]) => {
    if (checked) setSelectedAssetIds(allFilteredAssets.map(a => a.id));
    else setSelectedAssetIds([]);
  };
  
  const handleSelectAllCategories = (checked: boolean) => {
      if (checked) setSelectedCategories(Object.keys(assetsByCategory));
      else setSelectedCategories([]);
  }

  const handleSelectSingle = (assetId: string, checked: boolean) => {
    setSelectedAssetIds(prev => checked ? [...prev, assetId] : prev.filter(id => id !== assetId));
  };
  
  const handleSelectCategory = (category: string, checked: boolean) => {
    setSelectedCategories(prev => checked ? [...prev, category] : prev.filter(c => c !== category));
  };

  const handleClearAllAssets = useCallback(async () => {
    setIsClearAllDialogOpen(false);
    
    if (dataSource === 'cloud') {
      await clearLocalAssets();
      setAssets([]);
      if (isOnline && isAdmin) {
          try {
              const cloudClear = activeDatabase === 'firestore' ? clearRtdbAssets : clearRtdbAssets;
              await cloudClear();
          } catch (e) {
              addNotification({ title: 'Cloud Clear Error', variant: 'destructive' });
          }
      }
    } else {
      await saveLockedOfflineAssets([]);
      setOfflineAssets([]);
    }
    setSelectedAssetIds([]);
  }, [isOnline, isAdmin, setAssets, dataSource, setOfflineAssets, activeDatabase]);

  const handleExportSelection = useCallback(() => {
    if(!appSettings) return;
    let assetsToExport: Asset[] = [];

    if (view === 'dashboard') assetsToExport = selectedCategories.flatMap(cat => assetsByCategory[cat] || []);
    else if (view === 'table') assetsToExport = activeAssets.filter(a => selectedAssetIds.includes(a.id));

    if (assetsToExport.length === 0) return;

    try {
      const ts = new Date().toISOString().replace(/:/g, '-');
      exportToExcel(assetsToExport, appSettings.sheetDefinitions, `export-${ts}.xlsx`);
    } catch (e) {
      addNotification({ title: 'Export Failed', variant: 'destructive' });
    }
  }, [view, selectedCategories, assetsByCategory, selectedAssetIds, activeAssets, appSettings]);


  const handleClearCategoryClick = useCallback((category: string) => {
    setCategoryToDelete(category);
    setIsClearCategoryDialogOpen(true);
  }, []);

  const handleClearCategory = async () => {
    if (!categoryToDelete || !isAdmin) return;
    setIsClearCategoryDialogOpen(false);
    const source = await getLocalAssetsFromDb();
    const assetsToKeep = source.filter(a => a.category !== categoryToDelete);
    const idsToDelete = source.filter(a => a.category === categoryToDelete).map(a => a.id);
    await saveAssets(assetsToKeep);
    setAssets(assetsToKeep);
    if (isOnline) {
      try {
        const batchDelete = activeDatabase === 'firestore' ? batchDeleteAssets : batchDeleteAssetsRTDB;
        await batchDelete(idsToDelete);
      } catch (e) {
        addNotification({ title: 'Cloud Deletion Failed', variant: 'destructive'});
      }
    }
  };
  
  const handleSelectiveUpload = useCallback(async () => {
    if (!isOnline) {
      addNotification({title: "Offline", variant: "destructive"});
      return;
    }
    if (dataSource === 'local_locked') {
        handleMergeToMainList();
        return;
    }
    const ids = view === 'dashboard' ? selectedCategories.flatMap(cat => assetsByCategory[cat]?.map(a => a.id) || []) : selectedAssetIds;
    if (ids.length === 0) return;
    
    setIsSyncing(true);
    try {
      const all = await getLocalAssetsFromDb();
      const assetsToUpload = all.filter(a => ids.includes(a.id) && a.syncStatus === 'local');
      if (assetsToUpload.length > 0) {
        const batchSet = activeDatabase === 'firestore' ? batchSetAssets : batchSetAssetsRTDB;
        await batchSet(assetsToUpload);
        const updated = all.map(a => ids.includes(a.id) ? { ...a, syncStatus: 'synced' as const } : a);
        await saveAssets(updated);
        setAssets(updated);
        addNotification({title: "Upload Successful"});
      }
    } catch(e) {
      addNotification({title: "Upload Failed", variant: "destructive"});
    } finally {
      setIsSyncing(false);
      setSelectedAssetIds([]);
      setSelectedCategories([]);
    }
  }, [isOnline, view, selectedCategories, selectedAssetIds, assetsByCategory, setIsSyncing, setAssets, dataSource, activeDatabase]);

  const handleCopyToOffline = useCallback(async () => {
    const ids = view === 'dashboard' ? selectedCategories.flatMap(cat => assetsByCategory[cat]?.map(a => a.id) || []) : selectedAssetIds;
    if (ids.length === 0) return;
    setIsSyncing(true);
    try {
      const toCopy = assets.filter(a => ids.includes(a.id));
      const existing = await getLockedOfflineAssets();
      const map = new Map(existing.map(a => [a.id, a]));
      toCopy.forEach(a => {
        const ex = map.get(a.id);
        if (!ex || (new Date(a.lastModified || 0).getTime() > new Date(ex.lastModified || 0).getTime())) {
          map.set(a.id, { ...a, syncStatus: undefined });
        }
      });
      const updated = Array.from(map.values());
      await saveLockedOfflineAssets(updated);
      setOfflineAssets(updated);
      setDataSource('local_locked');
    } catch(e) {
      addNotification({ title: "Copy Failed", variant: "destructive" });
    } finally {
      setIsSyncing(false);
      setSelectedAssetIds([]);
      setSelectedCategories([]);
    }
  }, [view, selectedCategories, selectedAssetIds, assets, assetsByCategory, setIsSyncing, setOfflineAssets, setDataSource]);
  
  const handleMergeToMainList = async () => {
    const ids = view === 'dashboard' ? selectedCategories.flatMap(cat => assetsByCategory[cat]?.map(a => a.id) || []) : selectedAssetIds;
    if (ids.length === 0) return;
    setIsSyncing(true);
    try {
        const toMerge = offlineAssets.filter(a => ids.includes(a.id));
        const rem = offlineAssets.filter(a => !ids.includes(a.id));
        const main = await getLocalAssetsFromDb();
        const map = new Map(main.map(a => [a.id, a]));
        toMerge.forEach(a => map.set(a.id, { ...a, syncStatus: 'local' }));
        await saveAssets(Array.from(map.values()));
        await saveLockedOfflineAssets(rem);
        setAssets(Array.from(map.values()));
        setOfflineAssets(rem);
    } catch (e) {
        addNotification({ title: 'Merge Failed', variant: 'destructive' });
    } finally {
        setIsSyncing(false);
        setSelectedAssetIds([]);
        setSelectedCategories([]);
    }
  };

  const handleSaveCategoryBatchEdit = async (data: CategoryBatchUpdateData) => {
    let toUp: Asset[] = [];
    selectedCategories.forEach(cat => toUp.push(...(assetsByCategory[cat] || [])));
    if (data.status) {
        const updated = toUp.map(a => {
            const up: Asset = sanitizeForFirestore({ ...a, verifiedStatus: data.status, lastModified: new Date().toISOString(), lastModifiedBy: userProfile?.displayName, lastModifiedByState: globalStateFilter, syncStatus: dataSource === 'cloud' ? 'local' : undefined });
            if (data.status === 'Verified' && !a.verifiedDate) up.verifiedDate = new Date().toLocaleDateString("en-CA");
            else if (data.status !== 'Verified') up.verifiedDate = '';
            return up;
        });
        if (dataSource === 'cloud') {
          let curr = await getLocalAssetsFromDb();
          const map = new Map(updated.map(a => [a.id, a]));
          curr = curr.map(a => map.get(a.id) || a);
          await saveAssets(curr);
          setAssets(curr);
        } else {
            let curr = await getLockedOfflineAssets();
            const map = new Map(updated.map(a => [a.id, a]));
            curr = curr.map(a => map.get(a.id) || a);
            await saveLockedOfflineAssets(curr);
            setOfflineAssets(curr);
        }
    }
    setSelectedCategories([]);
  };

  const handleDeleteSelectedCategories = async () => {
    let ids: string[] = [];
    selectedCategories.forEach(cat => ids.push(...(assetsByCategory[cat] || []).map(a => a.id)));
    if (ids.length === 0) return;
    setIsBatchDeleting(true);
    if (dataSource === 'cloud') {
      let curr = await getLocalAssetsFromDb();
      curr = curr.filter(a => !ids.includes(a.id));
      await saveAssets(curr);
      setAssets(curr);
      if (isOnline) {
          try {
              const batchDelete = activeDatabase === 'firestore' ? batchDeleteAssets : batchDeleteAssetsRTDB;
              await batchDelete(ids);
          } catch (e) {
              addNotification({ title: 'Cloud Batch Delete Error', variant: 'destructive' });
          }
      }
    } else {
      let curr = await getLockedOfflineAssets();
      curr = curr.filter(a => !ids.includes(a.id));
      await saveLockedOfflineAssets(curr);
      setOfflineAssets(curr);
    }
    setSelectedCategories([]);
    setIsBatchDeleting(false);
  }

  const handleConfirmProjectSwitch = async () => {
    setShowProjectSwitchDialog(false);
    await clearLocalAssets();
    await saveLockedOfflineAssets([]);
    setAssets([]);
    setOfflineAssets([]);
    handleDownloadScan();
  };

  const handleEditSheetLayout = (category: string) => {
    if(!sheetDefinitions) return;
    setSheetToEdit(sheetDefinitions[category]);
    setOriginalSheetNameToEdit(category);
    setIsColumnSheetOpen(true);
  };
  
  const handleSaveColumnLayout = async (originalName: string | null, newDefinition: SheetDefinition, applyToAll: boolean) => {
    if (!isAdmin || !appSettings || !userProfile) return;
    const newSheetDefinitions = { ...appSettings.sheetDefinitions };
    if (applyToAll) {
        Object.keys(newSheetDefinitions).forEach(sn => {
            newSheetDefinitions[sn] = { ...newSheetDefinitions[sn], displayFields: newDefinition.displayFields.map(f => ({ ...f })), headers: newDefinition.headers };
        });
    } else if (originalName) newSheetDefinitions[originalName] = newDefinition;

    const settings: AppSettings = { ...appSettings, sheetDefinitions: newSheetDefinitions, lastModified: new Date().toISOString(), lastModifiedBy: { displayName: userProfile.displayName, loginName: userProfile.loginName } };
    const old = appSettings;
    setAppSettings(settings);
    try {
        await Promise.all([updateSettingsRTDB(settings), updateSettingsFS(settings), saveLocalSettings(settings)]);
        toast({ title: 'Layout Updated' });
    } catch (e) {
        setAppSettings(old);
        toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleToggleSheetVisibility = async (sn: string) => {
    if (!isAdmin || !appSettings || !userProfile) return;
    const newSheetDefinitions = { ...appSettings.sheetDefinitions };
    if(newSheetDefinitions[sn]) newSheetDefinitions[sn].isHidden = !newSheetDefinitions[sn].isHidden;
    const settings: AppSettings = { ...appSettings, sheetDefinitions: newSheetDefinitions, lastModified: new Date().toISOString(), lastModifiedBy: { displayName: userProfile.displayName, loginName: userProfile.loginName } };
    const old = appSettings;
    setAppSettings(settings);
    try {
        await Promise.all([updateSettingsRTDB(settings), updateSettingsFS(settings), saveLocalSettings(settings)]);
    } catch (e) {
        setAppSettings(old);
    }
  };


  if (isLoading || !appSettings) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  const renderDashboardCard = (category: string, categoryAssets: Asset[]) => {
      const total = categoryAssets.length;
      const verified = categoryAssets.filter(a => a.verifiedStatus === 'Verified').length;
      const percentage = total > 0 ? (verified / total) * 100 : 0;
      const isSelected = selectedCategories.includes(category);
      const isHidden = sheetDefinitions?.[category]?.isHidden;
      
      return (
          <Card key={category} className={cn("group hover:shadow-xl transition-all duration-300 flex flex-col border-primary/10 overflow-hidden", isSelected && "ring-2 ring-primary bg-primary/5 shadow-primary/10", isHidden && "opacity-50")}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 bg-muted/20">
                <div className="flex-1">
                  <CardTitle className="text-sm font-bold truncate pr-2 tracking-tight group-hover:text-primary transition-colors">{category}</CardTitle>
                </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 shadow-xl">
                       <DropdownMenuItem onSelect={() => handleSelectCategory(category, !isSelected)} disabled={isGuest}>
                          <Checkbox className="mr-2 h-4 w-4" checked={isSelected}/>
                          {isSelected ? 'Deselect Category' : 'Select Category'}
                        </DropdownMenuItem>
                         <DropdownMenuItem onSelect={() => handleEditSheetLayout(category)} disabled={isGuest || !isAdmin}>
                          <Columns className="mr-2 h-4 w-4" />
                          Customize Columns
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleToggleSheetVisibility(category)} disabled={isGuest || !isAdmin}>
                            {isHidden ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                            {isHidden ? 'Show Category' : 'Hide from List'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleClearCategoryClick(category)} disabled={isGuest || !isAdmin} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Wipe Local Data
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-grow space-y-4 pt-4">
                  <div className="flex items-end justify-between">
                      <div>
                        <div className="text-3xl font-black tracking-tighter">{total}</div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Asset Records</p>
                      </div>
                      <LayoutDashboard className="h-8 w-8 text-primary/10" />
                  </div>
                  {appSettings.appMode === 'verification' && (
                    <div className="space-y-2 pt-2 border-t border-dashed">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground">
                            <span>Verification</span>
                            <span>{verified} / {total}</span>
                        </div>
                        <Progress value={percentage} className="h-1.5 shadow-inner" />
                    </div>
                  )}
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-6">
                <Button variant="outline" size="sm" className="w-full text-xs font-bold rounded-lg border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all group/btn" onClick={() => { setView('table'); setCurrentCategory(category); }}>
                    View Records
                    <ChevronRight className="ml-1 h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </CardFooter>
          </Card>
      );
  }

  // DASHBOARD VIEW
  if (view === 'dashboard') {
    const areAllCategoriesSelected = Object.keys(assetsByCategory).length > 0 && selectedCategories.length === Object.keys(assetsByCategory).length;
    const contextualButtonText = dataSource === 'local_locked' ? 'Merge Selected' : 'Upload Selection';
    const ContextualButtonIcon = dataSource === 'local_locked' ? ArrowRightLeft : CloudUpload;
    const mainCategories = Object.keys(assetsByCategory).filter(cat => !sheetDefinitions?.[cat]?.isHidden).sort((a,b) => a.localeCompare(b));

    return (
      <div className="flex flex-col h-full gap-6">
        <AlertDialog open={isDownloadWarningOpen} onOpenChange={setIsDownloadWarningOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unsynced Changes Detected</AlertDialogTitle>
                <AlertDialogDescription>
                  You have {numUnsynced} local edit(s) that will be lost if you overwrite with cloud data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button variant="outline" onClick={handleUploadFirst}>Upload First</Button>
                <AlertDialogAction onClick={handleOverwriteDownload} className={buttonVariants({ variant: "destructive" })}>Discard & Refresh</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={showProjectSwitchDialog} onOpenChange={setShowProjectSwitchDialog}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Environment Switch</AlertDialogTitle><AlertDialogDescription>New Firebase configuration detected. Clearing local cache to prevent cross-environment data contamination.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogAction onClick={handleConfirmProjectSwitch}>Refresh Application</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AssetSummaryDashboard />
        
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <TableProperties className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Categories & Inventories</h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {isAdmin && (
                   <Select value={globalStateFilter || 'All'} onValueChange={setGlobalStateFilter}>
                      <SelectTrigger className="w-full md:w-[240px] rounded-xl border-primary/20 shadow-sm bg-background">
                        <SelectValue placeholder="Scope: All" />
                      </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-2xl border-primary/10">
                            <ScrollArea className="h-[400px]">
                                <SelectItem value="All"><LocationProgress locationName="All" allAssets={activeAssets} appMode={appSettings.appMode} /></SelectItem>
                                <SelectSeparator />
                                <SelectGroup>
                                    <SelectLabel className="px-4 py-2 text-[10px] font-black uppercase text-primary/60">Special Locations</SelectLabel>
                                    {specialLocations.map((loc) => (
                                        <SelectItem key={loc} value={loc} className="focus:bg-transparent p-0"><LocationProgress locationName={loc} allAssets={activeAssets} appMode={appSettings.appMode} /></SelectItem>
                                    ))}
                                </SelectGroup>
                                <SelectSeparator />
                                <SelectGroup>
                                    <SelectLabel className="px-4 py-2 text-[10px] font-black uppercase text-primary/60">Zonal Stores</SelectLabel>
                                    {ZONAL_STORES.map((zone) => (
                                        <SelectItem key={zone} value={zone} className="focus:bg-transparent p-0"><LocationProgress locationName={zone} allAssets={activeAssets} appMode={appSettings.appMode} /></SelectItem>
                                    ))}
                                </SelectGroup>
                                <SelectSeparator />
                                <SelectGroup>
                                    <SelectLabel className="px-4 py-2 text-[10px] font-black uppercase text-primary/60">States</SelectLabel>
                                    {NIGERIAN_STATES.map((state) => (
                                        <SelectItem key={state} value={state} className="focus:bg-transparent p-0"><LocationProgress locationName={state} allAssets={activeAssets} appMode={appSettings.appMode} /></SelectItem>
                                    ))}
                                </SelectGroup>
                            </ScrollArea>
                        </SelectContent>
                      </Select>
                )}
                
                <div className="flex items-center gap-3 ml-auto">
                    <Label htmlFor="select-all-categories" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select All</Label>
                    <Checkbox id="select-all-categories" checked={areAllCategoriesSelected} onCheckedChange={(checked) => handleSelectAllCategories(checked as boolean)} disabled={isGuest} />
                </div>
            </div>
        </div>

        {selectedCategories.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="sticky top-2 z-40 p-2 bg-primary text-primary-foreground rounded-2xl shadow-2xl flex flex-wrap items-center gap-3 border border-white/20 backdrop-blur-lg">
                <Badge variant="outline" className="bg-white/20 text-white border-none font-black ml-2 px-3 py-1">{selectedCategories.length} Selected</Badge>
                <Separator orientation="vertical" className="h-6 bg-white/20 hidden sm:block"/>
                <div className="flex flex-wrap gap-1">
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-white hover:bg-white/20" onClick={handleSelectiveUpload} disabled={isSyncing}>
                        {isSyncing ? <Loader2 className="mr-2 h-3 w-3 animate-spin"/> : <ContextualButtonIcon className="mr-2 h-3 w-3" />}
                        {contextualButtonText}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-white hover:bg-white/20" onClick={handleCopyToOffline} disabled={isSyncing || dataSource !== 'cloud'}>
                        <Copy className="mr-2 h-3 w-3" /> Copy to Sandbox
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-white hover:bg-white/20" onClick={() => setIsCategoryBatchEditOpen(true)} disabled={isGuest || (!userProfile?.canEditAssets && !isAdmin)}>
                        <ClipboardEdit className="mr-2 h-3 w-3" /> Batch Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-white hover:bg-white/20" onClick={handleExportSelection}>
                        <Download className="mr-2 h-3 w-3" /> Export Excel
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-white hover:bg-destructive hover:text-white" onClick={handleDeleteSelectedCategories} disabled={isBatchDeleting || isGuest}>
                        <Trash2 className="mr-2 h-3 w-3" /> Wipe Selected
                    </Button>
                </div>
            </motion.div>
        )}
        
        <div className="flex-1 overflow-y-auto min-h-[400px]">
          <div className="grid gap-6 p-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {mainCategories.length > 0 ? (
                mainCategories.map(cat => renderDashboardCard(cat, assetsByCategory[cat]))
              ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-32 text-center">
                      <div className="p-6 bg-muted rounded-full mb-4"><FolderSearch className="h-12 w-12 text-muted-foreground/50" /></div>
                      <h3 className="text-xl font-bold">No Assets In Sight</h3>
                      <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">Try clearing your filters or importing a new workbook template.</p>
                  </div>
              )}
          </div>
        </div>

        <TravelReportDialog isOpen={isTravelReportOpen} onOpenChange={setIsTravelReportOpen} />
        <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={selectedAsset} onSave={handleSaveAsset} onQuickSave={handleQuickSaveAsset} isReadOnly={isFormReadOnly} defaultCategory={currentCategory || undefined} />
        <AssetBatchEditForm isOpen={isBatchEditOpen} onOpenChange={setIsBatchEditOpen} selectedAssetCount={selectedAssetIds.length} onSave={handleSaveBatchEdit} />
        <CategoryBatchEditForm isOpen={isCategoryBatchEditOpen} onOpenChange={setIsCategoryBatchEditOpen} selectedCategoryCount={selectedCategories.length} onSave={handleSaveCategoryBatchEdit} />
        <ImportScannerDialog isOpen={isImportScanOpen} onOpenChange={setIsImportScanOpen} />
        <SyncConfirmationDialog isOpen={isSyncConfirmOpen} onOpenChange={setIsSyncConfirmOpen} onConfirm={handleSyncConfirm} summary={syncSummary} />
        <AlertDialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Destructive Wipe</AlertDialogTitle><AlertDialogDescription>{clearAllDialogDescription}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleClearAllAssets} className="bg-destructive">Wipe All Assets</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
         <AlertDialog open={isClearCategoryDialogOpen} onOpenChange={setIsClearCategoryDialogOpen}>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete category {categoryToDelete}?</AlertDialogTitle><AlertDialogDescription>This removes all assets from the local device and cloud backups. Irreversible.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleClearCategory} className="bg-destructive">Execute Deletion</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
        {sheetToEdit && originalSheetNameToEdit && (
            <ColumnCustomizationSheet isOpen={isColumnSheetOpen} onOpenChange={setIsColumnSheetOpen} sheetDefinition={sheetToEdit} originalSheetName={originalSheetNameToEdit} onSave={handleSaveColumnLayout} />
        )}
      </div>
    )
  }

  // TABLE VIEW
  const paginatedCategoryAssets = categoryFilteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const areAllCategoryResultsSelected = categoryFilteredAssets.length > 0 && categoryFilteredAssets.every(a => selectedAssetIds.includes(a.id));
  const currentSheetDefinition = sheetDefinitions?.[currentCategory!];
  let quickViewFields: DisplayField[] = currentSheetDefinition?.displayFields.filter(f => f.quickView) || [];
  if (appSettings?.appMode === 'management') quickViewFields = quickViewFields.filter(f => f.key !== 'verifiedStatus');

  return (
    <div className="flex flex-col h-full gap-4">
        <div className="flex flex-wrap items-center gap-3 pb-2 border-b border-dashed">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-muted" onClick={() => { setView('dashboard'); setCurrentCategory(null); setSelectedAssetIds([]); }}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-black tracking-tighter truncate">{currentCategory}</h2>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground mt-0.5">
                    <Badge variant="outline" className="px-1.5 h-4 text-[9px] border-primary/30 text-primary">{categoryFilteredAssets.length} Records</Badge>
                    <Separator orientation="vertical" className="h-2.5"/>
                    <span>Viewing {globalStateFilter}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex items-center space-x-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-transparent hover:border-primary/20 transition-colors">
                    <Label htmlFor="select-all-table" className="text-xs font-black uppercase text-muted-foreground cursor-pointer">Select All</Label>
                    <Checkbox id="select-all-table" checked={areAllCategoryResultsSelected} onCheckedChange={(checked) => handleSelectAll(checked as boolean, categoryFilteredAssets)} disabled={isGuest} />
                </div>
                {(!appSettings?.lockAssetList || dataSource === 'local_locked') && (userProfile?.canAddAssets || isAdmin) && (
                  <Button variant="default" size="sm" className="h-9 rounded-xl font-bold shadow-lg shadow-primary/20" onClick={handleAddAsset}>
                    <PlusCircle className="mr-2 h-4 w-4"/> New Asset
                  </Button>
                )}
            </div>
        </div>

        {selectedAssetIds.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-wrap items-center gap-2 p-2 bg-muted/80 backdrop-blur-md rounded-xl border border-primary/10">
                <div className="px-3 py-1 bg-primary text-primary-foreground text-xs font-black rounded-lg">{selectedAssetIds.length} Selected</div>
                <Button variant="ghost" size="sm" className="h-8 text-xs font-bold" onClick={handleSelectiveUpload} disabled={isSyncing}>
                    {isSyncing ? <Loader2 className="mr-2 h-3 w-3 animate-spin"/> : <CloudUpload className="mr-2 h-3 w-3" />} Sync
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs font-bold" onClick={handleCopyToOffline} disabled={isSyncing || dataSource !== 'cloud'}>
                    <Copy className="mr-2 h-3 w-3" /> Sandbox
                </Button>
                {selectedAssetIds.length === 1 && !isGuest && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-bold" onClick={() => handleEditAsset(activeAssets.find(a => a.id === selectedAssetIds[0])!)}>
                        <Edit className="mr-2 h-3 w-3" /> Edit
                    </Button>
                )}
                <Button variant="ghost" size="sm" className="h-8 text-xs font-bold" onClick={handleBatchEdit} disabled={!userProfile?.canEditAssets && !isAdmin}>
                    <ClipboardEdit className="mr-2 h-3 w-3" /> Batch
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-destructive hover:bg-destructive/10" onClick={handleBatchDelete} disabled={isBatchDeleting || isGuest || !isAdmin}>
                    <Trash2 className="mr-2 h-3 w-3" /> Delete
                </Button>
            </motion.div>
        )}
        
        <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-none bg-transparent">
            <ScrollArea className="flex-1 h-full -mx-4 px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-10">
                {paginatedCategoryAssets.length > 0 ? (
                  paginatedCategoryAssets.map((asset) => (
                    <Card
                      key={asset.id}
                      data-state={selectedAssetIds.includes(asset.id) ? 'selected' : ''}
                      className="data-[state=selected]:ring-2 data-[state=selected]:ring-primary transition-all duration-300 hover:shadow-lg flex flex-col overflow-hidden border-primary/5"
                    >
                      <CardHeader className="flex flex-row items-center space-x-4 p-4 bg-muted/10 border-b border-dashed">
                          <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                              <Checkbox checked={selectedAssetIds.includes(asset.id)} onCheckedChange={(checked) => handleSelectSingle(asset.id, checked as boolean)} disabled={isGuest} />
                          </div>
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleViewAsset(asset)}>
                              <CardTitle className="text-sm font-bold truncate leading-tight">{asset.description || 'Untitled Asset'}</CardTitle>
                              <CardDescription className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest truncate mt-0.5">
                                  {asset.syncStatus === 'local' && <CloudOff className="h-3 w-3 text-primary animate-pulse" />}
                                  {asset.assetIdCode || asset.sn || 'No ID'}
                              </CardDescription>
                          </div>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled={isGuest}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 shadow-2xl border-primary/10">
                                  <DropdownMenuItem onClick={() => handleViewAsset(asset)} className="h-9"><FolderSearch className="mr-2 h-4 w-4" /> Open Dashboard</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditAsset(asset)} disabled={!userProfile?.canEditAssets && !isAdmin} className="h-9"><Edit className="mr-2 h-4 w-4" /> Fast Edit</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => { setAssetToDelete(asset); setIsDeleteDialogOpen(true); }} className="h-9 text-destructive focus:bg-destructive/10 focus:text-destructive" disabled={!isAdmin}><Trash2 className="mr-2 h-4 w-4" /> Remove Record</DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </CardHeader>
                      <CardContent className="p-4 pt-4 flex-grow cursor-pointer" onClick={() => handleViewAsset(asset)}>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                              {quickViewFields.map(field => {
                                if (['description', 'category', 'verifiedStatus'].includes(field.key)) return null;
                                const val = asset[field.key];
                                if (!val || String(val).trim() === '') return null;
                                return (
                                    <div key={field.key} className="space-y-0.5 overflow-hidden">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-wider">{field.label}</p>
                                        <p className="text-xs font-bold truncate text-foreground/80">{String(val)}</p>
                                    </div>
                                )
                              })}
                          </div>
                          {appSettings?.appMode === 'verification' && (
                            <div className="mt-4 pt-4 border-t border-dashed" onClick={e => e.stopPropagation()}>
                                <Select value={asset.verifiedStatus || 'Unverified'} onValueChange={async (s) => {
                                      await handleQuickSaveAsset(asset.id, { verifiedStatus: s as any, verifiedDate: s === "Verified" ? new Date().toLocaleDateString("en-CA") : "", remarks: asset.remarks, condition: asset.condition });
                                      addNotification({ title: "Verification Updated", description: `Asset set to ${s}` });
                                }}>
                                  <SelectTrigger className={cn("h-8 text-[10px] font-black uppercase rounded-lg border-none shadow-sm", getStatusClasses(asset.verifiedStatus || 'Unverified'))}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl">
                                      <SelectItem value="Unverified" className="text-[10px] font-bold">Unverified</SelectItem>
                                      <SelectItem value="Verified" className="text-[10px] font-bold">Verified</SelectItem>
                                  </SelectContent>
                                </Select>
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center opacity-50"><FolderSearch className="mx-auto h-12 w-12 mb-2"/><p className="text-sm font-bold">No results in this view</p></div>
                )}
              </div>
            </ScrollArea>
            <CardFooter className="border-t bg-muted/10 py-3 rounded-b-2xl">
               <PaginationControls currentPage={currentPage} totalPages={Math.ceil(categoryFilteredAssets.length / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} totalItems={categoryFilteredAssets.length} />
            </CardFooter>
        </Card>
        <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={selectedAsset} onSave={handleSaveAsset} onQuickSave={handleQuickSaveAsset} isReadOnly={isFormReadOnly} defaultCategory={currentCategory || undefined} />
        <AssetBatchEditForm isOpen={isBatchEditOpen} onOpenChange={setIsBatchEditOpen} selectedAssetCount={selectedAssetIds.length} onSave={handleSaveBatchEdit} />
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Record?</AlertDialogTitle><AlertDialogDescription>This asset will be permanently removed from local and cloud databases. This action is irreversible.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive">Delete Asset</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
