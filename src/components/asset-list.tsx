
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
import { getLocalAssets as getLocalAssetsFromDb, saveAssets, clearLocalAssets, getLockedOfflineAssets, saveLockedOfflineAssets, saveLocalSettings } from "@/lib/idb";
import { cn, normalizeAssetLocation, getStatusClasses } from "@/lib/utils";
import { addNotification } from "@/hooks/use-notifications";
import { TravelReportDialog } from "./travel-report-dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { ImportScannerDialog } from "./single-sheet-import-dialog";
import { SyncConfirmationDialog, type SyncSummary } from "./sync-confirmation-dialog";
import { ColumnCustomizationSheet } from "./column-customization-sheet";
import { AssetSummaryDashboard } from "./asset-summary-dashboard";
import { isToday, isThisWeek, parseISO } from 'date-fns';


/**
 * Compares two asset-like objects to see if any relevant fields have changed.
 * @param a The first object.
 * @param b The second object.
 * @returns True if there are changes, false otherwise.
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
            <div className="flex justify-between items-center w-full p-2">
                <span>{locationName}</span>
                <span className="text-xs text-muted-foreground">0 assets</span>
            </div>
        );
    }

    const verified = locationAssets.filter(a => a.verifiedStatus === 'Verified').length;
    const percentage = total > 0 ? (verified / total) * 100 : 0;
    const displayName = locationName === 'All' ? 'Overall (All Assets)' : locationName;

    return (
        <div className="flex flex-col w-full gap-1 p-2 rounded-md hover:bg-muted">
            <div className="flex justify-between items-center w-full text-sm">
                <span>{displayName}</span>
                {appMode === 'verification' ? (
                  <span className="text-xs font-mono">{verified}/{total} verified</span>
                ) : (
                  <span className="text-xs font-mono">{total} assets</span>
                )}
            </div>
            {appMode === 'verification' && <Progress value={percentage} className="h-1.5" />}
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
    selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter,
    dateFilter,
    setDateFilter,
    setLocationOptions, setAssigneeOptions, statusOptions, setStatusOptions,
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
  } = useAppState();

  if (!appSettings) {
     return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  const { lockAssetList, sheetDefinitions } = appSettings;

  const isAdmin = userProfile?.isAdmin || false;
  const isGuest = userProfile?.isGuest || false;
  
  const activeAssets = useMemo(() => dataSource === 'cloud' ? assets : offlineAssets, [dataSource, assets, offlineAssets]);

  const specialLocations = useMemo(() => {
    if (!appSettings.locations) return SPECIAL_LOCATIONS.sort((a, b) => a.localeCompare(b));
    const defaultSpecial = new Set(SPECIAL_LOCATIONS);
    const states = new Set(NIGERIAN_STATES);
    const zones = new Set(ZONAL_STORES);
    
    appSettings.locations.forEach(loc => {
        if (!states.has(loc) && !zones.has(loc)) {
            defaultSpecial.add(loc);
        }
    });

    return Array.from(defaultSpecial).sort((a,b) => a.localeCompare(b));
  }, [appSettings.locations]);

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
  }, [searchTerm, selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter, dateFilter, globalStateFilter, dataSource]);
  
  useEffect(() => {
    if (view === 'dashboard') {
        setSelectedAssetIds([]);
    } else {
        setSelectedCategories([]);
    }
  }, [view]);

  // --- DATA LOADING & SYNC ---
  const executeDownload = useCallback(async () => {
    if (!syncSummary || syncSummary.type !== 'download') return;

    setIsSyncing(true);
    addNotification({ title: 'Downloading from cloud...' });
    
    try {
        const { newFromCloud, updatedFromCloud } = syncSummary;
        const localAssets = await getLocalAssetsFromDb();
        const mergedAssetsMap = new Map(localAssets.map(a => [a.id, a]));

        const assetsToProcess = [...newFromCloud, ...updatedFromCloud];

        for (const cloudAsset of assetsToProcess) {
            mergedAssetsMap.set(cloudAsset.id, { ...cloudAsset, syncStatus: 'synced' });
        }
        
        const finalAssets = Array.from(mergedAssetsMap.values());
        await saveAssets(finalAssets);
        setAssets(finalAssets);

        addNotification({ title: 'Download Complete', description: `${assetsToProcess.length} assets downloaded.` });
        
    } catch (error) {
        console.error("Download failed:", error);
        addNotification({
          title: "Download Failed",
          description: error instanceof Error ? `Error: ${error.message}` : "An unexpected error occurred during download.",
          variant: 'destructive'
        });
    } finally {
        setIsSyncing(false);
        setIsSyncConfirmOpen(false);
        setSyncSummary(null);
    }
}, [syncSummary, setAssets, setIsSyncing]);

  const executeUpload = useCallback(async () => {
      if (!syncSummary || syncSummary.type !== 'upload') return;

      setIsSyncing(true);
      addNotification({ title: 'Uploading changes...' });

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

              addNotification({ title: 'Upload Complete', description: `${assetsToPush.length} local changes uploaded.` });
          }
      } catch (error) {
          console.error("Upload failed:", error);
          addNotification({
            title: "Upload Failed",
            description: error instanceof Error ? `Error: ${error.message}` : "An unexpected error occurred during upload.",
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
      executeDownload();
    } else if (syncSummary?.type === 'upload') {
      executeUpload();
    }
  };

    const handleUploadScan = useCallback(async () => {
    if (!isOnline || !authInitialized || isGuest) return;

    setIsSyncing(true);
    addNotification({ title: 'Scanning for local changes...' });
    
    try {
        const localAssets = await getLocalAssetsFromDb();
        const assetsToPush = localAssets.filter(a => a.syncStatus === 'local');

        if (assetsToPush.length > 0) {
            setSyncSummary({
                newFromCloud: [],
                updatedFromCloud: [],
                keptLocal: [],
                toUpload: assetsToPush,
                type: 'upload',
            });
            setIsSyncConfirmOpen(true);
        } else {
            addNotification({ title: 'No Local Changes', description: 'Everything is already in sync with the cloud.' });
        }
    } catch (error) {
        console.error("Upload scan failed:", error);
        addNotification({
          title: "Upload Scan Failed",
          description: error instanceof Error ? `Error: ${error.message}` : "An unexpected error occurred.",
          variant: 'destructive'
        });
    } finally {
        setIsSyncing(false);
    }
}, [isOnline, authInitialized, isGuest, setIsSyncing]);

    const handleDownloadScan = useCallback(async () => {
    if (!isOnline || !authInitialized || isGuest) return;
    setIsSyncing(true);

    const localAssets = await getLocalAssetsFromDb();
    const unsyncedAssets = localAssets.filter(a => a.syncStatus === 'local');
    if (unsyncedAssets.length > 0) {
      setNumUnsynced(unsyncedAssets.length);
      setIsDownloadWarningOpen(true);
      setIsSyncing(false);
      return;
    }

    addNotification({ title: 'Scanning for cloud changes...' });

    try {
        const getCloudAssets = activeDatabase === 'firestore' ? getAssets : getAssetsRTDB;
        const cloudAssets = await getCloudAssets();
        const localAssetsMap = new Map(localAssets.map(a => [a.id, a]));

        const summary: SyncSummary = {
            newFromCloud: [],
            updatedFromCloud: [],
            keptLocal: [],
            toUpload: [],
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
        
        if (summary.newFromCloud.length === 0 && summary.updatedFromCloud.length === 0 && summary.keptLocal.length === 0) {
            addNotification({ title: 'Already Up-to-Date', description: 'Your local data is already in sync with the cloud.' });
        } else {
            setSyncSummary(summary);
            setIsSyncConfirmOpen(true);
        }
    } catch (error) {
        console.error("Download scan failed:", error);
        addNotification({
          title: "Download Scan Failed",
          description: error instanceof Error ? `Error: ${error.message}` : "An unexpected error occurred.",
          variant: 'destructive'
        });
        setIsOnline(false);
    } finally {
        setIsSyncing(false);
    }
  }, [isOnline, authInitialized, isGuest, setIsOnline, setIsSyncing, activeDatabase]);
  
  const handleOverwriteDownload = useCallback(async () => {
    setIsDownloadWarningOpen(false);
    setIsSyncing(true);
    addNotification({ title: 'Scanning for cloud changes...' });
    
    try {
        const getCloudAssets = activeDatabase === 'firestore' ? getAssets : getAssetsRTDB;
        const cloudAssets = await getCloudAssets();
        const localAssets = await getLocalAssetsFromDb();
        const localAssetsMap = new Map(localAssets.map(a => [a.id, a]));

        const summary: SyncSummary = {
            newFromCloud: [],
            updatedFromCloud: [],
            keptLocal: [],
            toUpload: [],
            type: 'download',
        };

        for (const cloudAsset of cloudAssets) {
            const localAsset = localAssetsMap.get(cloudAsset.id);
            if (!localAsset) {
                summary.newFromCloud.push(cloudAsset);
            } else {
                const cloudTimestamp = cloudAsset.lastModified ? new Date(cloudAsset.lastModified).getTime() : 0;
                const localTimestamp = localAsset.lastModified ? new Date(localAsset.lastModified).getTime() : 0;

                if (cloudTimestamp > localTimestamp) {
                    summary.updatedFromCloud.push(cloudAsset);
                }
            }
        }
        
        if (summary.newFromCloud.length === 0 && summary.updatedFromCloud.length === 0) {
            addNotification({ title: 'Already Up-to-Date', description: 'Your local data is already in sync with the cloud.' });
        } else {
            setSyncSummary(summary);
            setIsSyncConfirmOpen(true);
        }
    } catch (error) {
        console.error("Forced download scan failed:", error);
        addNotification({
          title: "Download Scan Failed",
          description: error instanceof Error ? `Error: ${error.message}` : "An unexpected error occurred.",
          variant: 'destructive'
        });
        setIsOnline(false);
    } finally {
        setIsSyncing(false);
    }
  }, [setIsSyncing, setIsOnline, activeDatabase]);
  
  const handleUploadFirst = useCallback(() => {
    setIsDownloadWarningOpen(false);
    handleUploadScan();
  }, [handleUploadScan]);

  // Effect for initial data load from IndexedDB. This runs once when component mounts.
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
    if (manualDownloadTrigger > 0) {
        handleDownloadScan();
    }
  }, [manualDownloadTrigger, handleDownloadScan]);
  
  useEffect(() => {
    if (manualUploadTrigger > 0) {
        handleUploadScan();
    }
  }, [manualUploadTrigger, handleUploadScan]);
  
  useEffect(() => {
    if (appSettings.appMode === 'verification') {
        setStatusOptions([
            { value: "Verified", label: "Verified" },
            { value: "Unverified", label: "Unverified" },
        ]);
    } else {
        setStatusOptions([]);
    }
  }, [appSettings.appMode, setStatusOptions]);

  const allAssetsForFiltering = useMemo(() => {
    if (isAdmin && globalStateFilter && globalStateFilter !== 'All') {
        const zones: Record<string, string[]> = NIGERIAN_ZONES;
        const capitals: Record<string, string> = NIGERIAN_STATE_CAPITALS;
        const isZone = ZONAL_STORES.includes(globalStateFilter);

        if (isZone) {
            const lowerCaseFilter = globalStateFilter.toLowerCase().trim();
            return activeAssets.filter(asset => {
                const assetLocation = (asset.location || "").toLowerCase().trim();
                return assetLocation.includes(lowerCaseFilter) && assetLocation.includes("zonal store");
            });
        }
        
        if (SPECIAL_LOCATIONS.includes(globalStateFilter)) {
            const lowerCaseFilter = globalStateFilter.toLowerCase().trim();
            return activeAssets.filter(asset => (asset.location || "").toLowerCase().trim().includes(lowerCaseFilter));
        }

        const lowerCaseFilter = globalStateFilter.toLowerCase().trim();
        const capitalCity = capitals[globalStateFilter]?.toLowerCase().trim();
        return activeAssets.filter(asset => {
            const assetLocation = (asset.location || "").toLowerCase().trim();
            const matchesState = assetLocation.startsWith(lowerCaseFilter);
            const matchesCapital = capitalCity ? assetLocation.startsWith(capitalCity) : false;
            return matchesState || matchesCapital;
        });

    } else if (!isAdmin && userProfile?.state) {
        const lowerCaseFilter = userProfile.state.toLowerCase().trim();
        const capitalCity = NIGERIAN_STATE_CAPITALS[userProfile.state]?.toLowerCase().trim();
        return activeAssets.filter(asset => {
            const assetLocation = (asset.location || "").toLowerCase().trim();
            const matchesState = assetLocation.startsWith(lowerCaseFilter);
            const matchesCapital = capitalCity ? assetLocation.startsWith(capitalCity) : false;
            return matchesState || matchesCapital;
        });
    }
    return activeAssets;
  }, [activeAssets, globalStateFilter, isAdmin, userProfile?.state]);
  
  useEffect(() => {
    const locations = new Map<string, number>();
    allAssetsForFiltering.forEach(asset => {
      const normalized = normalizeAssetLocation(asset.location);
      if (normalized) {
        locations.set(normalized, (locations.get(normalized) || 0) + 1);
      }
    });
    setLocationOptions(Array.from(locations.entries()).map(([l, count]) => ({ label: l, value: l, count })).sort((a, b) => (b.count || 0) - (a.count || 0)));

    const assigneeMap = new Map<string, number>();
    allAssetsForFiltering.forEach(asset => {
      if (asset.assignee) {
        const assigneeName = asset.assignee.trim();
        if (assigneeName) {
            assigneeMap.set(assigneeName, (assigneeMap.get(assigneeName) || 0) + 1);
        }
      }
    });
    setAssigneeOptions(Array.from(assigneeMap.entries()).map(([a, count]) => ({ label: a, value: a, count })).sort((a,b) => a.label.localeCompare(b.label)));
  }, [allAssetsForFiltering, setLocationOptions, setAssigneeOptions]);


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
      const def = sheetDefinitions[asset.category];
      // Universal rule: if no definition or sheet is hidden, filter it out for everyone.
      if (!def || def.isHidden) {
          return false;
      }
      
      // Super admin has access to all non-hidden sheets.
      if (userProfile?.loginName === 'admin') {
        return true;
      }
      
      // For other users, check disabledFor permissions.
      const disabledFor = def.disabledFor || [];

      // Check if disabled for all non-admins
      if (disabledFor.includes('all') && !userProfile?.isAdmin) {
          return false;
      }

      // Check if disabled for the specific user
      if (userProfile && disabledFor.includes(userProfile.loginName)) {
          return false;
      }
      
      return true;
    });

    const hasFilters = selectedLocations.length > 0 || selectedAssignees.length > 0 || selectedStatuses.length > 0 || missingFieldFilter || dateFilter;
    if (hasFilters) {
        results = results.filter(asset => {
            const locationMatch = selectedLocations.length === 0 || selectedLocations.includes(normalizeAssetLocation(asset.location));
            const assigneeMatch = selectedAssignees.length === 0 || (asset.assignee && selectedAssignees.map(a => a.toLowerCase()).includes(asset.assignee.trim().toLowerCase()));
            const statusMatch = selectedStatuses.length === 0 || (asset.verifiedStatus && selectedStatuses.includes(asset.verifiedStatus));
            
            const missingFieldMatch = !missingFieldFilter || !asset[missingFieldFilter as keyof Asset];

            let dateMatch = true;
            if (dateFilter) {
                if (!asset.lastModified) {
                    dateMatch = false;
                } else {
                    const modifiedDate = parseISO(asset.lastModified);
                    if (dateFilter === 'today') {
                        dateMatch = isToday(modifiedDate);
                    } else if (dateFilter === 'week') {
                        dateMatch = isThisWeek(modifiedDate, { weekStartsOn: 1 });
                    } else if (dateFilter === 'new-week') {
                        // Asset is "new" if it has no previous state and was modified this week.
                        dateMatch = isThisWeek(modifiedDate, { weekStartsOn: 1 }) && !asset.previousState;
                    }
                }
            }

            return locationMatch && assigneeMatch && statusMatch && missingFieldMatch && dateMatch;
        });
    }

    if (searchTerm) {
        const lowerCaseSearchTokens = searchTerm.toLowerCase().split(' ').filter(token => token.length > 0);
        if (lowerCaseSearchTokens.length > 0) {
            results = results.filter(asset => {
                const assetHaystack = Object.values(asset)
                    .map(value => (typeof value === 'object' && value !== null) ? Object.values(value).join(' ') : String(value))
                    .join(' ').toLowerCase();
                return lowerCaseSearchTokens.every(token => assetHaystack.includes(token));
            });
        }
    }
    
    return sortAssets(results, sortConfig);
  }, [allAssetsForFiltering, searchTerm, selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter, dateFilter, sortConfig, sheetDefinitions, isAdmin, userProfile]);

  const assetsByCategory = useMemo(() => {
    return displayedAssets.reduce((acc, asset) => {
        const category = asset.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
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
      addNotification({ title: "Permission Denied", description: "You do not have permission to add new assets.", variant: "destructive" });
      return;
    }
    if (lockAssetList && isAdmin && dataSource === 'cloud') {
      addNotification({ title: "Asset List Locked", description: "Adding new assets to the main list is disabled. Switch to 'Locked Offline' to add.", variant: "destructive" });
      return;
    }
    setSelectedAsset(undefined);
    setIsFormReadOnly(false);
    setIsFormOpen(true);
  }, [lockAssetList, isAdmin, dataSource, userProfile]);
  
  const handleViewAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormReadOnly(true);
    setIsFormOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    if (!userProfile?.canEditAssets && !isAdmin) {
      addNotification({ title: "Permission Denied", description: "You do not have permission to edit assets.", variant: "destructive" });
      return;
    }
    if (lockAssetList && isAdmin && dataSource === 'cloud' && appSettings.appMode !== 'verification') {
        addNotification({ title: "Edits Disabled", description: "The main asset list is locked for full edits. Switch to 'Locked Offline' to merge changes, or disable lock in settings.", variant: "destructive" });
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

  const handleDeleteConfirm = async () => {
    if (!assetToDelete) return;

    if (dataSource === 'cloud') {
      if (lockAssetList && isAdmin) {
        addNotification({ title: "Deletion Disabled", description: "The main asset list is locked.", variant: "destructive" });
        setIsDeleteDialogOpen(false);
        return;
      }
      const currentAssets = await getLocalAssetsFromDb();
      const updatedAssets = currentAssets.filter(a => a.id !== assetToDelete.id);
      await saveAssets(updatedAssets);
      setAssets(updatedAssets);
      addNotification({ title: 'Deleted Locally', description: `Asset "${assetToDelete.description}" removed from main list.` });
  
      if (isOnline) {
        try {
          const deleteCloudAsset = activeDatabase === 'firestore' ? deleteAsset : deleteAssetRTDB;
          await deleteCloudAsset(assetToDelete.id);
          addNotification({ title: 'Deleted from Cloud', description: 'Asset also removed from the central database.' });
        } catch (e) {
          addNotification({ title: 'Cloud Deletion Failed', description: 'Could not delete from cloud.', variant: 'destructive'});
        }
      }
    } else {
      const currentOfflineAssets = await getLockedOfflineAssets();
      const updatedOfflineAssets = currentOfflineAssets.filter(a => a.id !== assetToDelete.id);
      await saveLockedOfflineAssets(updatedOfflineAssets);
      setOfflineAssets(updatedOfflineAssets);
      addNotification({ title: 'Deleted from Offline Store', description: `Asset "${assetToDelete.description}" removed.` });
    }

    setAssetToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const handleBatchDelete = async () => {
    if (lockAssetList && isAdmin && dataSource === 'cloud') {
        addNotification({ title: "Deletion Disabled", description: "The main asset list is locked.", variant: "destructive" });
        return;
    }
    
    setIsBatchDeleting(true);
    const assetsToDeleteCount = selectedAssetIds.length;

    if (dataSource === 'cloud') {
      let currentAssets = await getLocalAssetsFromDb();
      const idsToDelete = new Set(selectedAssetIds);
      currentAssets = currentAssets.filter(a => !idsToDelete.has(a.id));
      await saveAssets(currentAssets);
      setAssets(currentAssets);
      addNotification({ title: 'Deleted Locally', description: `${assetsToDeleteCount} assets deleted from main list.` });
  
      if (isOnline) {
          try {
              const batchDeleteCloudAssets = activeDatabase === 'firestore' ? batchDeleteAssets : batchDeleteAssetsRTDB;
              await batchDeleteCloudAssets(selectedAssetIds);
              addNotification({ title: 'Assets Deleted from Cloud', description: `Successfully removed ${assetsToDeleteCount} assets.` });
          } catch (e) {
              addNotification({ title: 'Error', description: 'Could not delete all selected assets from the cloud.', variant: 'destructive' });
          }
      }
    } else {
      let currentOfflineAssets = await getLockedOfflineAssets();
      const idsToDelete = new Set(selectedAssetIds);
      currentOfflineAssets = currentOfflineAssets.filter(a => !idsToDelete.has(a.id));
      await saveLockedOfflineAssets(currentOfflineAssets);
      setOfflineAssets(currentOfflineAssets);
      addNotification({ title: 'Deleted from Offline Store', description: `${assetsToDeleteCount} assets deleted.` });
    }

    setSelectedAssetIds([]);
    setIsBatchDeleting(false);
  };

  const handleBatchEdit = () => {
    if (!userProfile?.canEditAssets && !isAdmin) {
      addNotification({ title: "Permission Denied", description: "You do not have permission to batch edit.", variant: "destructive" });
      return;
    }
    if (lockAssetList && isAdmin && dataSource === 'cloud') {
        addNotification({ title: "Edits Disabled", description: "The main asset list is locked. Switch to 'Locked Offline' source to make changes and merge.", variant: "destructive" });
        return;
    }
    setIsBatchEditOpen(true);
  }
  
  const handleSaveBatchEdit = async (data: BatchUpdateData) => {
    if (lockAssetList && isAdmin && dataSource === 'cloud') {
        addNotification({ title: "Edits Disabled", description: "The main asset list is locked.", variant: "destructive" });
        return;
    }
    const assetsToUpdateCount = selectedAssetIds.length;
    addNotification({ title: 'Batch Updating...', description: `Applying changes to ${assetsToUpdateCount} assets.` });
    
    const sourceAssets = dataSource === 'cloud' ? assets : offlineAssets;
    const assetsToUpdate = sourceAssets.filter(asset => selectedAssetIds.includes(asset.id));
    
    const updatedAssets = assetsToUpdate.map(asset => {
        const updatedAsset: Asset = { 
            ...asset, 
            ...data, 
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile?.displayName,
            lastModifiedByState: userProfile?.state,
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
      const updatedAssetMap = new Map(updatedAssets.map(a => [a.id, a]));
      currentAssets = currentAssets.map(asset => updatedAssetMap.get(asset.id) || asset);
      await saveAssets(currentAssets);
      setAssets(currentAssets);
      addNotification({ title: 'Updated Locally', description: `Updated ${assetsToUpdateCount} assets.` });
    } else {
      let currentOfflineAssets = await getLockedOfflineAssets();
      const updatedAssetMap = new Map(updatedAssets.map(a => [a.id, a]));
      currentOfflineAssets = currentOfflineAssets.map(asset => updatedAssetMap.get(asset.id) || asset);
      await saveLockedOfflineAssets(currentOfflineAssets);
      setOfflineAssets(currentOfflineAssets);
      addNotification({ title: 'Updated in Offline Store', description: `Updated ${assetsToUpdateCount} assets.` });
    }
    
    setSelectedAssetIds([]);
  };

  const handleSaveAsset = async (assetToSave: Asset) => {
    if (lockAssetList && isAdmin && dataSource === 'cloud') {
        addNotification({ title: "Edits Disabled", description: "The main asset list is locked.", variant: "destructive" });
      return;
    }

    const sourceAssets = dataSource === 'cloud' ? assets : offlineAssets;
    const originalAsset = sourceAssets.find(a => a.id === assetToSave.id);

    if (!originalAsset || haveAssetDetailsChanged(originalAsset, assetToSave)) {
        let previousState: Partial<Asset> | undefined = undefined;
        if (originalAsset) {
            previousState = {};
            for(const key in assetToSave) {
                const k = key as keyof Asset;
                if(originalAsset[k] !== assetToSave[k]) {
                    (previousState as any)[k] = originalAsset[k];
                }
            }
        }

        const finalAsset: Asset = sanitizeForFirestore({
            ...assetToSave,
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile?.displayName,
            lastModifiedByState: userProfile?.state,
            syncStatus: dataSource === 'cloud' ? 'local' : undefined,
            previousState: Object.keys(previousState || {}).length > 0 ? previousState : undefined,
        });
      
      if (dataSource === 'cloud') {
        const currentAssets = await getLocalAssetsFromDb();
        const existingIndex = currentAssets.findIndex(a => a.id === finalAsset.id);
        if (existingIndex > -1) {
            currentAssets[existingIndex] = finalAsset;
        } else {
            currentAssets.unshift(finalAsset);
        }
        await saveAssets(currentAssets);
        setAssets(currentAssets);
        addNotification({ title: 'Saved Locally', description: 'Changes will be synced with the cloud.' });
      } else {
        const currentOfflineAssets = await getLockedOfflineAssets();
        const existingIndex = currentOfflineAssets.findIndex(a => a.id === finalAsset.id);
        if (existingIndex > -1) {
            currentOfflineAssets[existingIndex] = finalAsset;
        } else {
            currentOfflineAssets.unshift(finalAsset);
        }
        await saveLockedOfflineAssets(currentOfflineAssets);
        setOfflineAssets(currentOfflineAssets);
        addNotification({ title: 'Saved to Offline Store', description: 'These changes will not be synced.' });
      }

    } else {
        addNotification({ title: 'No Changes Detected', description: 'The asset was not saved.' });
    }
    
    setIsFormOpen(false);
  };

  const handleQuickSaveAsset = async (assetId: string, data: { remarks?: string; condition?: string; verifiedStatus?: 'Verified' | 'Unverified', verifiedDate?: string }) => {
    const sourceAssets = dataSource === 'cloud' ? assets : offlineAssets;
    const asset = sourceAssets.find(a => a.id === assetId);
    if (!asset) return;

    if (lockAssetList && isAdmin && dataSource === 'cloud' && appSettings.appMode !== 'verification') {
      addNotification({ title: "Edits Disabled", description: "The main asset list is locked. Switch to 'Locked Offline' source to make changes and merge.", variant: "destructive" });
      return;
    }

    if (asset.remarks === data.remarks && asset.verifiedStatus === data.verifiedStatus && asset.condition === data.condition) {
        return;
    }

    const updatedAsset: Asset = sanitizeForFirestore({ 
        ...asset, 
        ...data, 
        lastModified: new Date().toISOString(),
        lastModifiedBy: userProfile?.displayName,
        lastModifiedByState: userProfile?.state,
        syncStatus: dataSource === 'cloud' ? 'local' : undefined,
    });

    if (dataSource === 'cloud') {
      const currentAssets = await getLocalAssetsFromDb();
      const existingIndex = currentAssets.findIndex(a => a.id === assetId);
      if (existingIndex > -1) {
          currentAssets[existingIndex] = updatedAsset;
          await saveAssets(currentAssets);
          setAssets(currentAssets);
      }
    } else {
      const currentOfflineAssets = await getLockedOfflineAssets();
      const existingIndex = currentOfflineAssets.findIndex(a => a.id === assetId);
      if (existingIndex > -1) {
          currentOfflineAssets[existingIndex] = updatedAsset;
          await saveLockedOfflineAssets(currentOfflineAssets);
          setOfflineAssets(currentOfflineAssets);
      }
    }
  };

  const handleRevertAsset = useCallback(async (assetId: string) => {
    const assetToRevert = activeAssets.find(a => a.id === assetId);
    if (!assetToRevert || !assetToRevert.previousState) {
        toast({ title: "Cannot Revert", description: "No previous state found for this asset.", variant: "destructive" });
        return;
    }

    const rolledBackAsset: Asset = sanitizeForFirestore({
      ...assetToRevert,
      ...assetToRevert.previousState, // Apply the old values
      previousState: undefined, // Clear the history for this state
      lastModified: new Date().toISOString(),
      lastModifiedBy: userProfile?.displayName,
      lastModifiedByState: userProfile?.state,
      syncStatus: 'local',
    });

    const currentAssets = await getLocalAssetsFromDb();
    const assetIndex = currentAssets.findIndex(a => a.id === assetId);
    if (assetIndex > -1) {
        currentAssets[assetIndex] = rolledBackAsset;
        await saveAssets(currentAssets);
        setAssets(currentAssets);
        toast({ title: "Asset Reverted", description: `"${rolledBackAsset.description}" has been restored to its previous state.` });
    }
  }, [activeAssets, userProfile, setAssets, toast]);

  useEffect(() => {
    setOnRevertAsset(() => handleRevertAsset);
    return () => {
        setOnRevertAsset(() => async () => {});
    }
  }, [handleRevertAsset, setOnRevertAsset]);

  const handleTravelReport = useCallback(() => setIsTravelReportOpen(true), []);
  
  const handleSelectAll = (checked: boolean, allFilteredAssets: Asset[]) => {
    if (checked) {
      setSelectedAssetIds(allFilteredAssets.map(a => a.id));
    } else {
      setSelectedAssetIds([]);
    }
  };
  
  const handleSelectAllCategories = (checked: boolean) => {
      if (checked) {
          setSelectedCategories(Object.keys(assetsByCategory));
      } else {
          setSelectedCategories([]);
      }
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
      addNotification({ title: 'Clearing Main Assets...', description: 'Removing all assets from your device.' });
      await clearLocalAssets();
      setAssets([]);
      addNotification({ title: 'Local Data Cleared', description: 'All main assets removed from this device.' });
      
      if (isOnline && isAdmin) {
          addNotification({ title: 'Clearing Cloud Database...', description: `This will remove all assets.` });
          try {
              const cloudClear = activeDatabase === 'firestore' ? clearAssetsFS : clearRtdbAssets;
              await cloudClear();
              addNotification({ title: 'All Cloud Assets Cleared', description: 'The application is now in a clean state.' });
          } catch (e) {
              addNotification({ title: 'Error', description: 'Could not clear all assets from the database.', variant: 'destructive' });
          }
      }
    } else {
      addNotification({ title: 'Clearing Offline Assets...', description: 'Removing all locked offline assets.' });
      await saveLockedOfflineAssets([]);
      setOfflineAssets([]);
      addNotification({ title: 'Offline Data Cleared', description: 'The locked offline store is now empty.' });
    }

    setSelectedAssetIds([]);

  }, [isOnline, isAdmin, setAssets, dataSource, setOfflineAssets, activeDatabase]);

  const handleClearAllClick = useCallback(() => setIsClearAllDialogOpen(true), []);
  
  const handleExport = useCallback(() => {
    try {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        exportToExcel(activeAssets, sheetDefinitions, `assets-export-${timestamp}.xlsx`);
        addNotification({
            title: 'Exporting to Excel',
            description: `Your data is being downloaded as assets-export-${timestamp}.xlsx`,
        });
    } catch (e) {
        addNotification({
            title: 'Export Failed',
            description: e instanceof Error ? e.message : 'An unknown error occurred.',
            variant: 'destructive',
        });
    }
  }, [activeAssets, sheetDefinitions]);

  const handleExportSelection = useCallback(() => {
    let assetsToExport: Asset[] = [];

    if (view === 'dashboard') {
        assetsToExport = selectedCategories.flatMap(cat => assetsByCategory[cat] || []);
    } else if (view === 'table') {
        assetsToExport = activeAssets.filter(a => selectedAssetIds.includes(a.id));
    }

    if (assetsToExport.length === 0) {
      addNotification({ title: 'Nothing to Export', description: 'No items selected for export.', variant: 'destructive' });
      return;
    }

    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      exportToExcel(assetsToExport, sheetDefinitions, `asset-selection-export-${timestamp}.xlsx`);
      addNotification({
        title: 'Exporting Selection',
        description: `Your selection of ${assetsToExport.length} assets is being downloaded.`,
      });
    } catch (e) {
      addNotification({
        title: 'Export Failed',
        description: e instanceof Error ? e.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    }
  }, [view, selectedCategories, assetsByCategory, selectedAssetIds, activeAssets, sheetDefinitions]);


  const handleClearCategoryClick = useCallback((category: string) => {
    setCategoryToDelete(category);
    setIsClearCategoryDialogOpen(true);
  }, []);

  const handleClearCategory = async () => {
    if (!categoryToDelete) return;
    if (!isAdmin) {
      addNotification({ title: 'Permission Denied', description: 'Only admins can delete categories.', variant: 'destructive'});
      return;
    }

    setIsClearCategoryDialogOpen(false);
    
    const source = await getLocalAssetsFromDb();
    const assetsToKeep = source.filter(a => a.category !== categoryToDelete);
    const assetsToDelete = source.filter(a => a.category === categoryToDelete);
    const idsToDelete = assetsToDelete.map(a => a.id);
    
    await saveAssets(assetsToKeep);
    setAssets(assetsToKeep);
    addNotification({ title: 'Category Cleared', description: `All ${idsToDelete.length} assets from '${categoryToDelete}' have been deleted locally.`});

    if (isOnline) {
      try {
        const batchDelete = activeDatabase === 'firestore' ? batchDeleteAssets : batchDeleteAssetsRTDB;
        await batchDelete(idsToDelete);
        addNotification({ title: 'Cloud Data Deleted', description: `Category data has also been removed from the cloud.` });
      } catch (e) {
        addNotification({ title: 'Cloud Deletion Failed', description: `Could not remove category from cloud.`, variant: 'destructive'});
      }
    }
  };
  
  const handleSelectiveUpload = useCallback(async () => {
    if (!isOnline) {
      addNotification({title: "Offline", description: "Cannot upload while offline.", variant: "destructive"});
      return;
    }

    if (dataSource === 'local_locked') {
        handleMergeToMainList();
        return;
    }

    const idsToUpload = view === 'dashboard'
      ? selectedCategories.flatMap(cat => assetsByCategory[cat]?.map(a => a.id) || [])
      : selectedAssetIds;

    if (idsToUpload.length === 0) {
      addNotification({title: "No Selection", description: "Please select assets or categories to upload."});
      return;
    }
    
    setIsSyncing(true);
    try {
      addNotification({title: "Uploading selected items...", description: `Preparing to upload ${idsToUpload.length} assets.`});
      const allLocalAssets = await getLocalAssetsFromDb();
      const assetsToUpload = allLocalAssets.filter(a => idsToUpload.includes(a.id) && a.syncStatus === 'local');

      if (assetsToUpload.length > 0) {
        const batchSet = activeDatabase === 'firestore' ? batchSetAssets : batchSetAssetsRTDB;
        await batchSet(assetsToUpload);

        const updatedLocalAssets = allLocalAssets.map(asset => 
          idsToUpload.includes(asset.id) ? { ...asset, syncStatus: 'synced' as const } : asset
        );
        await saveAssets(updatedLocalAssets);
        setAssets(updatedLocalAssets);
        
        addNotification({title: "Selective Upload Complete", description: `${assetsToUpload.length} assets have been uploaded to the cloud.`});
      } else {
        addNotification({title: "No Changes to Upload", description: "Selected items have no local changes to upload."});
      }

    } catch(e) {
      console.error("Selective upload failed", e);
      addNotification({title: "Upload Failed", description: (e as Error).message, variant: "destructive"});
    } finally {
      setIsSyncing(false);
      setSelectedAssetIds([]);
      setSelectedCategories([]);
    }
  }, [isOnline, view, selectedCategories, selectedAssetIds, assetsByCategory, setIsSyncing, setAssets, dataSource, activeDatabase]);

  const handleCopyToOffline = useCallback(async () => {
    if (dataSource !== 'cloud') {
      addNotification({ title: 'Invalid Operation', description: 'Can only copy from the main list to the offline store.', variant: 'destructive' });
      return;
    }

    const idsToCopy = view === 'dashboard'
      ? selectedCategories.flatMap(cat => assetsByCategory[cat]?.map(a => a.id) || [])
      : selectedAssetIds;
      
    if (idsToCopy.length === 0) {
      addNotification({ title: 'No Selection', description: 'Please select assets or categories to copy.' });
      return;
    }

    setIsSyncing(true);
    addNotification({ title: 'Copying to Offline...', description: `Preparing to copy ${idsToCopy.length} assets.` });
    
    try {
      const assetsToCopy = assets.filter(a => idsToCopy.includes(a.id));
      const existingOfflineAssets = await getLockedOfflineAssets();
      const offlineAssetsMap = new Map(existingOfflineAssets.map(a => [a.id, a]));
      
      let copiedCount = 0;
      let skippedCount = 0;

      assetsToCopy.forEach(assetToCopy => {
        const existingOfflineAsset = offlineAssetsMap.get(assetToCopy.id);
        if (existingOfflineAsset) {
          const mainTimestamp = assetToCopy.lastModified ? new Date(assetToCopy.lastModified).getTime() : 0;
          const offlineTimestamp = existingOfflineAsset.lastModified ? new Date(existingOfflineAsset.lastModified).getTime() : 0;

          if (mainTimestamp > offlineTimestamp) {
            offlineAssetsMap.set(assetToCopy.id, { ...assetToCopy, syncStatus: undefined });
            copiedCount++;
          } else {
            skippedCount++;
          }
        } else {
          offlineAssetsMap.set(assetToCopy.id, { ...assetToCopy, syncStatus: undefined });
          copiedCount++;
        }
      });
      
      const newOfflineAssets = Array.from(offlineAssetsMap.values());
      await saveLockedOfflineAssets(newOfflineAssets);
      setOfflineAssets(newOfflineAssets);
      
      let description = `${copiedCount} assets copied to the Locked Offline store.`;
      if (skippedCount > 0) {
        description += ` ${skippedCount} assets were skipped to preserve newer offline edits.`;
      }
      addNotification({ title: 'Copy Complete', description });
      
      setDataSource('local_locked');

    } catch(e) {
      console.error("Copy to offline failed", e);
      addNotification({ title: "Copy Failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
      setSelectedAssetIds([]);
      setSelectedCategories([]);
    }
  }, [
    dataSource, 
    view, 
    selectedCategories, 
    selectedAssetIds, 
    assets, 
    assetsByCategory,
    setIsSyncing, 
    setOfflineAssets, 
    setDataSource
  ]);
  
  const handleMergeToMainList = async () => {
    const idsToMerge = view === 'dashboard'
        ? selectedCategories.flatMap(cat => assetsByCategory[cat]?.map(a => a.id) || [])
        : selectedAssetIds;

    if (idsToMerge.length === 0) {
        addNotification({ title: "No Selection", description: "Please select assets or categories to merge." });
        return;
    }

    setIsSyncing(true);
    try {
        const offlineAssetsToMerge = offlineAssets.filter(a => idsToMerge.includes(a.id));
        const remainingOfflineAssets = offlineAssets.filter(a => !idsToMerge.includes(a.id));

        const mainAssets = await getLocalAssetsFromDb();
        const mainAssetsMap = new Map(mainAssets.map(a => [a.id, a]));

        offlineAssetsToMerge.forEach(asset => {
            mainAssetsMap.set(asset.id, { ...asset, syncStatus: 'local' });
        });

        await saveAssets(Array.from(mainAssetsMap.values()));
        await saveLockedOfflineAssets(remainingOfflineAssets);

        setAssets(Array.from(mainAssetsMap.values()));
        setOfflineAssets(remainingOfflineAssets);

        addNotification({ title: 'Merge Complete', description: `${idsToMerge.length} assets merged to the main list and are ready for cloud upload.` });
        
    } catch (e) {
        addNotification({ title: 'Merge Failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
        setIsSyncing(false);
        setSelectedAssetIds([]);
        setSelectedCategories([]);
    }
  };

  const handleSaveCategoryBatchEdit = async (data: CategoryBatchUpdateData) => {
    let assetsToUpdate: Asset[] = [];
    selectedCategories.forEach(category => {
        assetsToUpdate.push(...(assetsByCategory[category] || []));
    });

    if (data.status) {
        const assetsToUpdateCount = assetsToUpdate.length;
        addNotification({ title: 'Batch Updating Categories...', description: `Applying status to ${assetsToUpdateCount} assets.` });

        const updatedAssets = assetsToUpdate.map(asset => {
            const updatedAsset: Asset = { 
                ...asset, 
                verifiedStatus: data.status,
                lastModified: new Date().toISOString(),
                lastModifiedBy: userProfile?.displayName,
                lastModifiedByState: userProfile?.state,
                syncStatus: dataSource === 'cloud' ? 'local' : undefined,
            };
            if (data.status === 'Verified' && !asset.verifiedDate) {
                updatedAsset.verifiedDate = new Date().toLocaleDateString("en-CA");
            } else if (data.status !== 'Verified') {
                updatedAsset.verifiedDate = '';
            }
            return sanitizeForFirestore(updatedAsset);
        });
        
        if (dataSource === 'cloud') {
          let currentAssets = await getLocalAssetsFromDb();
          const updatedAssetMap = new Map(updatedAssets.map(a => [a.id, a]));
          currentAssets = currentAssets.map(asset => updatedAssetMap.get(asset.id) || asset);
          await saveAssets(currentAssets);
          setAssets(currentAssets);
          addNotification({ title: 'Updated Locally', description: `Updated ${assetsToUpdateCount} assets.` });
        } else {
            let currentOfflineAssets = await getLockedOfflineAssets();
            const updatedAssetMap = new Map(updatedAssets.map(a => [a.id, a]));
            currentOfflineAssets = currentOfflineAssets.map(asset => updatedAssetMap.get(asset.id) || asset);
            await saveLockedOfflineAssets(currentOfflineAssets);
            setOfflineAssets(currentOfflineAssets);
            addNotification({ title: 'Updated in Offline Store', description: `Updated ${assetsToUpdateCount} assets.` });
        }
    }
    
    setSelectedCategories([]);
  };

  const handleDeleteSelectedCategories = async () => {
    let idsToDelete: string[] = [];
    selectedCategories.forEach(category => {
      const assetIds = (assetsByCategory[category] || []).map(a => a.id);
      idsToDelete.push(...assetIds);
    });

    if (idsToDelete.length === 0) return;

    if (lockAssetList && isAdmin && dataSource === 'cloud') {
        addNotification({ title: "Deletion Disabled", description: "The main asset list is locked.", variant: "destructive" });
        return;
    }
    
    setIsBatchDeleting(true);

    if (dataSource === 'cloud') {
      let currentAssets = await getLocalAssetsFromDb();
      currentAssets = currentAssets.filter(a => !idsToDelete.includes(a.id));
      await saveAssets(currentAssets);
      setAssets(currentAssets);
      addNotification({ title: 'Deleted Locally', description: `${idsToDelete.length} assets deleted.` });
  
      if (isOnline) {
          try {
              const batchDelete = activeDatabase === 'firestore' ? batchDeleteAssets : batchDeleteAssetsRTDB;
              await batchDelete(idsToDelete);
              addNotification({ title: 'Categories Deleted', description: `Successfully removed ${idsToDelete.length} assets.` });
          } catch (e) {
              addNotification({ title: 'Error', description: 'Could not delete all assets from cloud.', variant: 'destructive' });
          }
      }
    } else {
      let currentOfflineAssets = await getLockedOfflineAssets();
      currentOfflineAssets = currentOfflineAssets.filter(a => !idsToDelete.includes(a.id));
      await saveLockedOfflineAssets(currentOfflineAssets);
      setOfflineAssets(currentOfflineAssets);
      addNotification({ title: 'Deleted from Offline Store', description: `${idsToDelete.length} assets deleted.` });
    }

    setSelectedCategories([]);
    setIsBatchDeleting(false);
  }

  const handleConfirmProjectSwitch = async () => {
    setShowProjectSwitchDialog(false);
    addNotification({ title: 'Switching Projects...', description: 'Clearing all local data...' });
    await clearLocalAssets();
    await saveLockedOfflineAssets([]);
    setAssets([]);
    setOfflineAssets([]);
    addNotification({ title: 'Local Data Cleared', description: 'Attempting to sync with new project.' });
    handleDownloadScan();
  };

  const handleEditSheetLayout = (category: string) => {
    setSheetToEdit(sheetDefinitions[category]);
    setOriginalSheetNameToEdit(category);
    setIsColumnSheetOpen(true);
  };
  
  const handleSaveColumnLayout = async (originalName: string | null, newDefinition: SheetDefinition, applyToAll: boolean) => {
    if (!isAdmin) return;

    const newSheetDefinitions = { ...appSettings.sheetDefinitions };
    if (applyToAll) {
        Object.keys(newSheetDefinitions).forEach(sheetName => {
            newSheetDefinitions[sheetName] = {
                ...newSheetDefinitions[sheetName],
                displayFields: newDefinition.displayFields.map(f => ({ ...f })),
                headers: newDefinition.headers,
            };
        });
    } else if (originalName) {
        newSheetDefinitions[originalName] = newDefinition;
    }

    const newSettings: AppSettings = { ...appSettings, sheetDefinitions: newSheetDefinitions, lastModified: new Date().toISOString() };
    setAppSettings(newSettings);
    
    try {
        await updateSettingsFS(newSettings);
        await saveLocalSettings(newSettings);
        toast({ title: 'Layout updated', description: `Column layout changes have been saved.` });
    } catch (e) {
        toast({ title: 'Error', description: 'Could not save layout settings.', variant: 'destructive' });
    }
  };

  const handleToggleSheetVisibility = async (sheetName: string) => {
    if (!isAdmin) return;

    const newSheetDefinitions = { ...appSettings.sheetDefinitions };
    newSheetDefinitions[sheetName].isHidden = !newSheetDefinitions[sheetName].isHidden;

    const newSettings: AppSettings = { ...appSettings, sheetDefinitions: newSheetDefinitions, lastModified: new Date().toISOString() };
    
    // Optimistic UI update
    setAppSettings(newSettings);

    try {
        await updateSettingsFS(newSettings);
        await saveLocalSettings(newSettings);
        toast({ title: 'Visibility Changed', description: `Sheet '${sheetName}' is now ${newSettings.sheetDefinitions[sheetName].isHidden ? 'hidden' : 'visible'}.` });
    } catch (e) {
        // Revert on failure
        setAppSettings(appSettings);
        toast({ title: 'Error', description: 'Could not save visibility settings.', variant: 'destructive' });
    }
  };


  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  const renderDashboardCard = (category: string, categoryAssets: Asset[]) => {
      const total = categoryAssets.length;
      const verified = categoryAssets.filter(a => a.verifiedStatus === 'Verified').length;
      const percentage = total > 0 ? (verified / total) * 100 : 0;
      const isSelected = selectedCategories.includes(category);
      const isHidden = sheetDefinitions[category]?.isHidden;
      
      return (
          <Card key={category} className={cn("hover:shadow-md transition-shadow flex flex-col", isSelected && "ring-2 ring-primary", isHidden && "opacity-50")}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex-1">
                  <CardTitle className="text-sm font-medium pr-2">{category}</CardTitle>
                </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -translate-y-1.5 -translate-x-1.5">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuItem onSelect={() => handleSelectCategory(category, !isSelected)} disabled={isGuest}>
                          <Checkbox className="mr-2 h-4 w-4" checked={isSelected}/>
                          {isSelected ? 'Deselect' : 'Select'}
                        </DropdownMenuItem>
                         <DropdownMenuItem onSelect={() => handleEditSheetLayout(category)} disabled={isGuest || !isAdmin}>
                          <Columns className="mr-2 h-4 w-4" />
                          Edit Layout
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleToggleSheetVisibility(category)} disabled={isGuest || !isAdmin}>
                            {isHidden ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                            {isHidden ? 'Show Sheet' : 'Hide Sheet'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleClearCategoryClick(category)} disabled={isGuest || !isAdmin} className="text-destructive focus:text-destructive">
                          <Delete className="mr-2 h-4 w-4" />
                          Delete Category
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                  <div>
                      <div className="text-2xl font-bold">{total}</div>
                      <p className="text-xs text-muted-foreground">Total assets in this category</p>
                  </div>
                  {appSettings.appMode === 'verification' && (
                    <div className="space-y-2">
                        <Progress value={percentage} aria-label={`${percentage.toFixed(0)}% verified`} />
                        <p className="text-xs text-muted-foreground">{verified} of {total} verified</p>
                    </div>
                  )}
              </CardContent>
              <CardFooter className="pt-0 pb-4">
                <Button variant="link" className="p-0 h-auto" onClick={() => { setView('table'); setCurrentCategory(category); }}>View Assets</Button>
              </CardFooter>
          </Card>
      );
  }

  // DASHBOARD VIEW
  if (view === 'dashboard') {
    const totalAssetsInScope = allAssetsForFiltering.length;
    const currentlyDisplayedAssets = displayedAssets.length;
    const verifiedStateAssets = displayedAssets.filter(asset => asset.verifiedStatus === 'Verified').length;
    const verificationPercentage = currentlyDisplayedAssets > 0 ? (verifiedStateAssets / currentlyDisplayedAssets) * 100 : 0;
    const isFiltered = searchTerm || selectedLocations.length > 0 || selectedAssignees.length > 0 || selectedStatuses.length > 0 || dateFilter || missingFieldFilter;
    const areAllCategoriesSelected = Object.keys(assetsByCategory).length > 0 && selectedCategories.length === Object.keys(assetsByCategory).length;
        
    const contextualButtonText = dataSource === 'local_locked' ? 'Merge to Main List' : 'Upload Selection';
    const ContextualButtonIcon = dataSource === 'local_locked' ? ArrowRightLeft : CloudUpload;

    const mainCategories = Object.keys(assetsByCategory).filter(cat => !sheetDefinitions[cat]?.isHidden).sort((a,b) => a.localeCompare(b));

    return (
      <div className="flex flex-col h-full gap-4">
        <AlertDialog open={isDownloadWarningOpen} onOpenChange={setIsDownloadWarningOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unsynced Local Changes</AlertDialogTitle>
                <AlertDialogDescription>
                  You have {numUnsynced} local change(s) that have not been uploaded. 
                  Downloading will overwrite these changes. What would you like to do?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button variant="outline" onClick={handleUploadFirst}>Upload First</Button>
                <AlertDialogAction onClick={handleOverwriteDownload} className={buttonVariants({ variant: "destructive" })}>
                  Discard & Download
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={showProjectSwitchDialog} onOpenChange={setShowProjectSwitchDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>New Firebase Project Detected</AlertDialogTitle>
                    <AlertDialogDescription>
                        You've connected the app to a new Firebase project. To avoid data conflicts, it's highly recommended to clear your local data and sync fresh from the new project.
                        <br/><br/>
                        This will NOT affect any data in your old cloud project.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Keep Local Data</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmProjectSwitch}>
                        Clear and Sync
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AssetSummaryDashboard />
        
        <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className='flex-1'>
                    <CardTitle className="flex items-center gap-2">
                       <span>{appSettings.appMode === 'verification' ? 'Verification Status' : 'Management Status'}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDataSource(prev => prev === 'cloud' ? 'local_locked' : 'cloud')}>
                                {dataSource === 'cloud' ? <CloudUpload className="h-5 w-5 text-blue-500"/> : <HardDrive className="h-5 w-5 text-gray-500" />}
                             </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Data Source: {dataSource === 'cloud' ? 'Cloud Synced' : 'Locked Offline'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </CardTitle>
                    <CardDescription>
                        {isAdmin && !isFiltered
                          ? `Viewing: ${globalStateFilter || 'All Assets'}`
                          : `Viewing: ${userProfile?.state || 'All Assets'}`
                        }
                    </CardDescription>
                  </div>
                  
                  <div className="flex w-full flex-col items-stretch gap-3 md:w-auto md:items-end">
                    {isAdmin && !isFiltered && (
                       <Select
                          value={globalStateFilter || 'All'}
                          onValueChange={(value) => setGlobalStateFilter(value)}
                      >
                      <SelectTrigger className="w-full md:w-[280px]">
                        <SelectValue placeholder="Select a location to filter..." />
                      </SelectTrigger>
                        <SelectContent>
                            <ScrollArea className="h-[400px]">
                                <SelectItem value="All">
                                    <LocationProgress locationName="All" allAssets={activeAssets} appMode={appSettings.appMode} />
                                </SelectItem>
                                <SelectSeparator />
                                <SelectGroup>
                                    <SelectLabel>Special Locations</SelectLabel>
                                    {specialLocations.map((loc) => (
                                        <SelectItem key={loc} value={loc} className="focus:bg-transparent text-foreground focus:text-foreground p-0 m-0">
                                            <LocationProgress locationName={loc} allAssets={activeAssets} appMode={appSettings.appMode} />
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                                <SelectSeparator />
                                <SelectGroup>
                                    <SelectLabel>Zonal Stores</SelectLabel>
                                    {ZONAL_STORES.map((zone) => (
                                        <SelectItem key={zone} value={zone} className="focus:bg-transparent text-foreground focus:text-foreground p-0 m-0">
                                            <LocationProgress locationName={zone} allAssets={activeAssets} appMode={appSettings.appMode} />
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                                <SelectSeparator />
                                <SelectGroup>
                                    <SelectLabel>States</SelectLabel>
                                    {NIGERIAN_STATES.map((state) => (
                                        <SelectItem key={state} value={state} className="focus:bg-transparent text-foreground focus:text-foreground p-0 m-0">
                                            <LocationProgress locationName={state} allAssets={activeAssets} appMode={appSettings.appMode} />
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </ScrollArea>
                        </SelectContent>
                      </Select>
                    )}
                     {isAdmin && !lockAssetList && (
                        <Button variant="outline" className="w-full md:w-auto" onClick={() => setIsSettingsOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add or Manage Sheets
                        </Button>
                    )}
                    <div className="flex items-center justify-end gap-4 w-full">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="select-all-categories" className="text-sm font-medium whitespace-nowrap">Select All</Label>
                        <Checkbox
                            id="select-all-categories"
                            checked={areAllCategoriesSelected}
                            onCheckedChange={(checked) => handleSelectAllCategories(checked as boolean)}
                            aria-label="Select all categories"
                            disabled={isGuest}
                        />
                      </div>
                    </div>
                  </div>
              </CardHeader>
               <CardContent className="pt-2 space-y-2">
                  {appSettings.appMode === 'verification' ? (
                    <>
                      <Progress value={verificationPercentage} aria-label={`${verificationPercentage.toFixed(0)}% verified`} />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-bold text-foreground">{verifiedStateAssets}</span> of <span className="font-bold text-foreground">{currentlyDisplayedAssets}</span> assets verified.
                        {isFiltered && ` (Showing from a total of ${totalAssetsInScope})`}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-bold text-foreground">{currentlyDisplayedAssets}</span> assets loaded.
                      {isFiltered && ` (Filtered from ${totalAssetsInScope} total)`}
                    </p>
                  )}
              </CardContent>
               {selectedCategories.length > 0 && (
                <CardFooter className="bg-muted/50 p-2 border-t flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{selectedCategories.length} selected</span>
                    <Separator orientation="vertical" className="h-6"/>
                    <Button variant="ghost" size="sm" onClick={handleSelectiveUpload} disabled={isSyncing || (!isOnline && dataSource !== 'local_locked')}>
                        {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ContextualButtonIcon className="mr-2 h-4 w-4" />}
                        {contextualButtonText}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCopyToOffline} disabled={isSyncing || dataSource !== 'cloud'}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy to Offline
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsCategoryBatchEditOpen(true)} disabled={isGuest || (!userProfile?.canEditAssets && !isAdmin)}>
                        <ClipboardEdit className="mr-2 h-4 w-4" /> Batch Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleExportSelection}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDeleteSelectedCategories} disabled={isBatchDeleting || isGuest}>
                        {isBatchDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete
                    </Button>
                </CardFooter>
            )}
          </Card>
        
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-4 p-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {mainCategories.length > 0 ? (
                mainCategories.map(cat => renderDashboardCard(cat, assetsByCategory[cat]))
              ) : (
                  <div className="col-span-full text-center py-24 text-muted-foreground">
                      <FolderSearch className="mx-auto h-12 w-12" />
                      <h3 className="mt-4 text-lg font-semibold">No Assets Found</h3>
                      {searchTerm ? (
                          <p className="mt-2 text-sm">Your search for "{searchTerm}" did not match any assets.</p>
                      ) : (
                          <p className="mt-2 text-sm">Import a file or add an asset to get started.</p>
                      )}
                  </div>
              )}
          </div>
        </div>
        <TravelReportDialog isOpen={isTravelReportOpen} onOpenChange={setIsTravelReportOpen} />
        <AssetForm 
          isOpen={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          asset={selectedAsset} 
          onSave={handleSaveAsset}
          onQuickSave={handleQuickSaveAsset}
          isReadOnly={isFormReadOnly}
          defaultCategory={currentCategory || undefined}
        />
        <AssetBatchEditForm isOpen={isBatchEditOpen} onOpenChange={setIsBatchEditOpen} selectedAssetCount={selectedAssetIds.length} onSave={handleSaveBatchEdit} />
        <CategoryBatchEditForm isOpen={isCategoryBatchEditOpen} onOpenChange={setIsCategoryBatchEditOpen} selectedCategoryCount={selectedCategories.length} onSave={handleSaveCategoryBatchEdit} />
         <ImportScannerDialog
            isOpen={isImportScanOpen}
            onOpenChange={setIsImportScanOpen}
        />
         <SyncConfirmationDialog
          isOpen={isSyncConfirmOpen}
          onOpenChange={setIsSyncConfirmOpen}
          onConfirm={handleSyncConfirm}
          summary={syncSummary}
        />
        <AlertDialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                       {clearAllDialogDescription}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAllAssets} className="bg-destructive hover:bg-destructive/90">
                        Yes, delete all assets
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
         <AlertDialog open={isClearCategoryDialogOpen} onOpenChange={setIsClearCategoryDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete all assets in '{categoryToDelete}'?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all assets from this category on your local device and from the cloud database. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearCategory} className="bg-destructive hover:bg-destructive/90">
                        Yes, delete this category
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        {sheetToEdit && originalSheetNameToEdit && (
            <ColumnCustomizationSheet
                isOpen={isColumnSheetOpen}
                onOpenChange={setIsColumnSheetOpen}
                sheetDefinition={sheetToEdit}
                originalSheetName={originalSheetNameToEdit}
                onSave={handleSaveColumnLayout}
            />
        )}
      </div>
    )
  }

  // TABLE VIEW
  const paginatedCategoryAssets = categoryFilteredAssets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const areAllCategoryResultsSelected = categoryFilteredAssets.length > 0 && categoryFilteredAssets.every(a => selectedAssetIds.includes(a.id));

  const contextualButtonText = dataSource === 'local_locked' ? 'Merge to Main List' : 'Upload Selection';
  const ContextualButtonIcon = dataSource === 'local_locked' ? ArrowRightLeft : CloudUpload;
  
  const currentSheetDefinition = sheetDefinitions[currentCategory!];
  
  let quickViewFields: DisplayField[] = currentSheetDefinition?.displayFields.filter(f => f.quickView) || [];

  if (appSettings.appMode === 'management') {
    quickViewFields = quickViewFields.filter(f => f.key !== 'verifiedStatus');
  }
  
  const backButtonTarget = 'dashboard';


  return (
    <div className="flex flex-col h-full gap-4">
         <AlertDialog open={isDownloadWarningOpen} onOpenChange={setIsDownloadWarningOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unsynced Local Changes</AlertDialogTitle>
                <AlertDialogDescription>
                  You have {numUnsynced} local change(s) that have not been uploaded. 
                  Downloading will overwrite these changes. What would you like to do?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button variant="outline" onClick={handleUploadFirst}>Upload First</Button>
                <AlertDialogAction onClick={handleOverwriteDownload} className={buttonVariants({ variant: "destructive" })}>
                  Discard & Download
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={showProjectSwitchDialog} onOpenChange={setShowProjectSwitchDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>New Firebase Project Detected</AlertDialogTitle>
                    <AlertDialogDescription>
                        You've connected the app to a new Firebase project. To avoid data conflicts, it's highly recommended to clear your local data and sync fresh from the new project.
                        <br/><br/>
                        This will NOT affect any data in your old cloud project.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Keep Local Data</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmProjectSwitch}>
                        Clear and Sync
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => { setView(backButtonTarget); setCurrentCategory(null); setSelectedAssetIds([]); }}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-1 items-center gap-4">
                <h2 className="text-2xl font-bold tracking-tight">
                    {currentCategory}
                </h2>
                {(!lockAssetList || dataSource === 'local_locked') && (userProfile?.canAddAssets || isAdmin) && (
                  <Button variant="outline" size="sm" onClick={handleAddAsset}>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Add Asset
                  </Button>
                )}
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="select-all-in-table-mobile"
                    checked={areAllCategoryResultsSelected}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean, categoryFilteredAssets)}
                    aria-label="Select all in this category"
                    disabled={isGuest}
                />
                <Label htmlFor="select-all-in-table-mobile" className="text-sm font-medium">Select All</Label>
            </div>
            {selectedAssetIds.length > 0 && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedAssetIds.length} selected</span>
                     <Button variant="outline" size="sm" onClick={handleSelectiveUpload} disabled={isSyncing || (!isOnline && dataSource !== 'local_locked')}>
                      {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ContextualButtonIcon className="mr-2 h-4 w-4" />}
                       {contextualButtonText}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopyToOffline} disabled={isSyncing || dataSource !== 'cloud'}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy to Offline
                    </Button>
                     {selectedAssetIds.length === 1 && !isGuest && (
                        <Button variant="outline" size="sm" onClick={() => handleEditAsset(activeAssets.find(a => a.id === selectedAssetIds[0])!)} disabled={!userProfile?.canEditAssets && !isAdmin}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                    )}
                    {selectedAssetIds.length > 0 && !isGuest && (
                        <Button variant="outline" size="sm" onClick={handleBatchEdit} disabled={!userProfile?.canEditAssets && !isAdmin}>
                            <ClipboardEdit className="mr-2 h-4 w-4" /> Batch Edit
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleExportSelection}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleBatchDelete} disabled={isBatchDeleting || isGuest || !isAdmin}>
                        {isBatchDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete
                    </Button>
                </div>
            )}
        </div>
        
        <Card className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-grow overflow-y-auto">
              {/* Unified Card View */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-2 sm:p-4">
                {paginatedCategoryAssets.length > 0 ? (
                  paginatedCategoryAssets.map((asset) => (
                    <Card
                      key={asset.id}
                      data-state={selectedAssetIds.includes(asset.id) ? 'selected' : ''}
                      className="data-[state=selected]:ring-2 data-[state=selected]:ring-primary flex flex-col"
                    >
                      <CardHeader className="flex flex-row items-center space-x-4 p-4">
                          <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                              <Checkbox
                                  checked={selectedAssetIds.includes(asset.id)}
                                  onCheckedChange={(checked) => handleSelectSingle(asset.id, checked as boolean)}
                                  aria-label={`Select asset ${asset.description}`}
                                  disabled={isGuest}
                              />
                          </div>
                          <div className="flex-1 min-w-0" onClick={() => handleViewAsset(asset)}>
                              <CardTitle className="text-base truncate">{asset.description || 'No Description'}</CardTitle>
                              <CardDescription className="flex items-center gap-2 truncate">
                                  {asset.syncStatus === 'local' && (
                                      <TooltipProvider>
                                          <Tooltip>
                                              <TooltipTrigger>
                                                  <CloudOff className="h-4 w-4 text-blue-500" />
                                              </TooltipTrigger>
                                              <TooltipContent><p>Local changes not synced</p></TooltipContent>
                                          </Tooltip>
                                      </TooltipProvider>
                                  )}
                                  {asset.category}
                              </CardDescription>
                          </div>
                          <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={isGuest}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleViewAsset(asset)}>
                                        <FolderSearch className="mr-2 h-4 w-4" /> View
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditAsset(asset)} disabled={!userProfile?.canEditAssets && !isAdmin}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => { setAssetToDelete(asset); setIsDeleteDialogOpen(true); }} className="text-destructive focus:bg-destructive/20" disabled={!isAdmin}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 flex-grow" onClick={() => handleViewAsset(asset)}>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                              {quickViewFields.map(field => {
                                // Exclude fields that are already displayed in the card's header or have dedicated controls.
                                if (['description', 'category', 'verifiedStatus'].includes(field.key)) return null;
                                
                                const value = asset[field.key];
                                if (value === null || value === undefined || String(value).trim() === '') return null;
                                
                                return (
                                    <div key={field.key} className="space-y-1 overflow-hidden">
                                        <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                                        <p className="text-sm font-medium truncate">{String(value)}</p>
                                    </div>
                                )
                              })}
                          </div>
                          {appSettings.appMode === 'verification' && (
                            <div className="mt-4" onClick={e => e.stopPropagation()}>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Verified Status</p>
                                <Select
                                    value={asset.verifiedStatus || 'Unverified'}
                                    onValueChange={async (status) => {
                                      const verifiedDate = status === "Verified" ? new Date().toLocaleDateString("en-CA") : "";
                                      await handleQuickSaveAsset(asset.id, { verifiedStatus: status as any, verifiedDate, remarks: asset.remarks, condition: asset.condition });
                                      addNotification({ title: "Status Updated", description: `Asset status changed to ${status}.` });
                                    }}
                                  >
                                  <SelectTrigger className={cn("h-9 text-sm", getStatusClasses(asset.verifiedStatus || 'Unverified'))}>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="Unverified"><div className="flex items-center"><FileText className="mr-2 h-3 w-3"/>Unverified</div></SelectItem>
                                      <SelectItem value="Verified"><div className="flex items-center"><Check className="mr-2 h-3 w-3"/>Verified</div></SelectItem>
                                  </SelectContent>
                                </Select>
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-24 text-muted-foreground">
                    <FolderSearch className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">No Assets Found</h3>
                    <p className="mt-2 text-sm">No assets found matching your criteria.</p>
                  </div>
                )}
              </div>
            </div>
            <CardFooter className="border-t pt-4">
               <PaginationControls 
                    currentPage={currentPage}
                    totalPages={Math.ceil(categoryFilteredAssets.length / itemsPerPage)}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    setItemsPerPage={setItemsPerPage}
                    totalItems={categoryFilteredAssets.length}
                  />
            </CardFooter>
        </Card>
        <AssetForm 
          isOpen={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          asset={selectedAsset} 
          onSave={handleSaveAsset} 
          onQuickSave={handleQuickSaveAsset}
          isReadOnly={isFormReadOnly}
          defaultCategory={currentCategory || undefined}
        />
        <AssetBatchEditForm 
            isOpen={isBatchEditOpen} 
            onOpenChange={setIsBatchEditOpen}
            selectedAssetCount={selectedAssetIds.length}
            onSave={handleSaveBatchEdit}
        />
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the asset
                        from your {dataSource === 'cloud' ? (isOnline ? 'online database and ' : '') : ''}local storage.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
