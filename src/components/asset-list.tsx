

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
import { Button } from "@/components/ui/button";
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
  Columns,
  Delete,
  PlaneTakeoff,
  Database,
  PlusCircle,
  ScanSearch,
  CloudOff,
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
import type { Asset, SheetDefinition, DisplayField } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile, exportToExcel, sanitizeForFirestore } from "@/lib/excel-parser";
import { NIGERIAN_ZONES, NIGERIAN_STATES, ZONAL_STORES, SPECIAL_LOCATIONS, NIGERIAN_STATE_CAPITALS } from "@/lib/constants";
import { useAppState, type SortConfig } from "@/contexts/app-state-context";
import { useAuth } from "@/contexts/auth-context";
import { AssetBatchEditForm, type BatchUpdateData } from "./asset-batch-edit-form";
import { CategoryBatchEditForm, type CategoryBatchUpdateData } from "./category-batch-edit-form";
import { PaginationControls } from "./pagination-controls";
import { getAssets, batchSetAssets, deleteAsset, batchDeleteAssets, updateSettings } from "@/lib/firestore";
import { getLocalAssets as getLocalAssetsFromDb, saveAssets, clearAssets as clearLocalAssets, getLockedOfflineAssets, saveLockedOfflineAssets, clearLockedOfflineAssets } from "@/lib/idb";
import { cn, normalizeAssetLocation, getStatusClasses } from "@/lib/utils";
import { addNotification } from "@/hooks/use-notifications";
import { ColumnCustomizationSheet } from "./column-customization-sheet";
import { TravelReportDialog } from "./travel-report-dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { ImportScannerDialog } from "./single-sheet-import-dialog";
import { SyncConfirmationDialog, type SyncSummary } from "./sync-confirmation-dialog";
import { exportFullBackupToJson } from "@/lib/json-export";


/**
 * Compares two asset-like objects to see if any relevant fields have changed.
 * @param a The first object.
 * @param b The second object.
 * @returns True if there are changes, false otherwise.
 */
const haveAssetDetailsChanged = (a: Partial<Asset>, b: Partial<Asset>): boolean => {
    const keys = Object.keys(b) as (keyof Asset)[];
    for (const key of keys) {
        if (['id', 'syncStatus', 'lastModified', 'lastModifiedBy', 'lastModifiedByState', 'approvalStatus', 'pendingChanges', 'changeSubmittedBy'].includes(key)) {
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
  const [isImporting, setIsImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [isTravelReportOpen, setIsTravelReportOpen] = useState(false);
  const [isImportScanOpen, setIsImportScanOpen] = useState(false);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);
  
  const {
    assets, setAssets, isOnline, setIsOnline, 
    offlineAssets, setOfflineAssets, dataSource, setDataSource,
    globalStateFilter, setGlobalStateFilter,
    itemsPerPage, setItemsPerPage,
    selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter,
    setLocationOptions, setAssigneeOptions, statusOptions, setStatusOptions,
    sortConfig, setSortConfig,
    appSettings, setAppSettings,
    manualDownloadTrigger,
    manualUploadTrigger,
    isSyncing, setIsSyncing,
    searchTerm,
    assetToView, setAssetToView,
    setDataActions,
    showProjectSwitchDialog,
    setShowProjectSwitchDialog,
  } = useAppState();

  const { enabledSheets, lockAssetList, sheetDefinitions } = appSettings;

  const isAdmin = userProfile?.isAdmin || false;
  const isGuest = userProfile?.isGuest || false;
  
  const activeAssets = useMemo(() => dataSource === 'cloud' ? assets : offlineAssets, [dataSource, assets, offlineAssets]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCategories([]);
  }, [searchTerm, selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter, globalStateFilter, dataSource]);
  
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

          if (assetsToPush.length > 0) {
              await batchSetAssets(assetsToPush);
              
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
  }, [syncSummary, setAssets, setIsSyncing]);

  const handleDownloadScan = useCallback(async () => {
    if (!isOnline || !authInitialized || isGuest) return;
    setIsSyncing(true);
    addNotification({ title: 'Scanning for cloud changes...' });

    try {
        const cloudAssets = await getAssets();
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
  }, [isOnline, authInitialized, isGuest, setIsOnline, setIsSyncing]);
  
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
    const currentAssets = dataSource === 'cloud' ? assets : offlineAssets;
    if (isAdmin && globalStateFilter && globalStateFilter !== 'All') {
        const zones: Record<string, string[]> = NIGERIAN_ZONES;
        const capitals: Record<string, string> = NIGERIAN_STATE_CAPITALS;
        const isZone = ZONAL_STORES.includes(globalStateFilter);

        if (isZone) {
            const lowerCaseFilter = globalStateFilter.toLowerCase().trim();
            return currentAssets.filter(asset => {
                const assetLocation = (asset.location || "").toLowerCase().trim();
                return assetLocation.includes(lowerCaseFilter) && assetLocation.includes("zonal store");
            });
        }
        
        if (SPECIAL_LOCATIONS.includes(globalStateFilter)) {
            const lowerCaseFilter = globalStateFilter.toLowerCase().trim();
            return currentAssets.filter(asset => (asset.location || "").toLowerCase().trim().includes(lowerCaseFilter));
        }

        const lowerCaseFilter = globalStateFilter.toLowerCase().trim();
        const capitalCity = capitals[globalStateFilter]?.toLowerCase().trim();
        return currentAssets.filter(asset => {
            const assetLocation = (asset.location || "").toLowerCase().trim();
            const matchesState = assetLocation.startsWith(lowerCaseFilter);
            const matchesCapital = capitalCity ? assetLocation.startsWith(capitalCity) : false;
            return matchesState || matchesCapital;
        });

    } else if (!isAdmin && userProfile?.state) {
        const lowerCaseFilter = userProfile.state.toLowerCase().trim();
        const capitalCity = NIGERIAN_STATE_CAPITALS[userProfile.state]?.toLowerCase().trim();
        return currentAssets.filter(asset => {
            const assetLocation = (asset.location || "").toLowerCase().trim();
            const matchesState = assetLocation.startsWith(lowerCaseFilter);
            const matchesCapital = capitalCity ? assetLocation.startsWith(capitalCity) : false;
            return matchesState || matchesCapital;
        });
    }
    return currentAssets;
  }, [assets, offlineAssets, dataSource, globalStateFilter, isAdmin, userProfile?.state]);
  
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
    return [...assetsToSort].sort((a, b) => {
        if (config.key === 'sn') {
            const numA = Number(a.sn) || 0;
            const numB = Number(b.sn) || 0;
            if (numA < numB) return config.direction === 'asc' ? -1 : 1;
            if (numA > numB) return config.direction === 'asc' ? 1 : -1;
            return 0;
        }
        
        const aVal = a[config.key] ?? '';
        const bVal = b[config.key] ?? '';
        if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
        return 0;
    });
  };

  const displayedAssets = useMemo(() => {
    let results = allAssetsForFiltering.filter(asset => enabledSheets.includes(asset.category));

    const hasFilters = selectedLocations.length > 0 || selectedAssignees.length > 0 || selectedStatuses.length > 0 || missingFieldFilter;
    if (hasFilters) {
        results = results.filter(asset => {
            const locationMatch = selectedLocations.length === 0 || selectedLocations.includes(normalizeAssetLocation(asset.location));
            const assigneeMatch = selectedAssignees.length === 0 || (asset.assignee && selectedAssignees.map(a => a.toLowerCase()).includes(asset.assignee.trim().toLowerCase()));
            const statusMatch = selectedStatuses.length === 0 || (asset.verifiedStatus && selectedStatuses.includes(asset.verifiedStatus));
            const missingFieldMatch = !missingFieldFilter || !asset[missingFieldFilter as keyof Asset];
            return locationMatch && assigneeMatch && statusMatch && missingFieldMatch;
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
  }, [allAssetsForFiltering, searchTerm, selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter, sortConfig, enabledSheets]);

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
      addNotification({ title: "Asset List Locked", description: "Adding new assets to the main list is disabled. Switch to 'Locked Offline' source to add.", variant: "destructive" });
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
    if (!userProfile?.canEditAssets && !userProfile?.canVerifyAssets && !isAdmin) {
      addNotification({ title: "Permission Denied", description: "You do not have permission to edit assets.", variant: "destructive" });
      return;
    }
    if (lockAssetList && isAdmin && dataSource === 'cloud') {
        addNotification({ title: "Edits Disabled", description: "The main asset list is locked. Switch to 'Locked Offline' source to make changes and merge.", variant: "destructive" });
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
          await deleteAsset(assetToDelete.id);
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
              await batchDeleteAssets(selectedAssetIds);
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
    const isNewAsset = !assets.some(a => a.id === assetToSave.id);

    if (dataSource === 'cloud' && lockAssetList && isAdmin) {
      if (isNewAsset) {
          addNotification({ title: "Add Disabled", description: "Cannot add new assets to the locked main list.", variant: "destructive" });
      } else {
          addNotification({ title: "Edits Disabled", description: "The main asset list is locked. Switch to 'Locked Offline' source to make changes and merge.", variant: "destructive" });
      }
      return;
    }

    const sourceAssets = dataSource === 'cloud' ? assets : offlineAssets;
    const originalAsset = sourceAssets.find(a => a.id === assetToSave.id);

    const changes: Partial<Asset> = {};
    if (originalAsset) {
      (Object.keys(assetToSave) as Array<keyof Asset>).forEach(key => {
        if (haveAssetDetailsChanged({ [key]: originalAsset[key] }, { [key]: assetToSave[key] })) {
          (changes as any)[key] = assetToSave[key];
        }
      });
    }

    if (!originalAsset || Object.keys(changes).length > 0) {
        let finalAsset: Asset = assetToSave;

        if (isAdmin || isNewAsset) {
            finalAsset = sanitizeForFirestore({
                ...assetToSave,
                lastModified: new Date().toISOString(),
                lastModifiedBy: userProfile?.displayName,
                lastModifiedByState: userProfile?.state,
                syncStatus: dataSource === 'cloud' ? 'local' : undefined,
                approvalStatus: undefined,
                pendingChanges: undefined,
                changeSubmittedBy: undefined,
            });
        } else {
            // Non-admin user making a change
            finalAsset = sanitizeForFirestore({
                ...originalAsset!,
                approvalStatus: 'pending',
                pendingChanges: changes,
                changeSubmittedBy: {
                    displayName: userProfile?.displayName || 'Unknown',
                    loginName: userProfile?.loginName || 'unknown',
                    state: userProfile?.state || 'Unknown',
                },
                lastModified: new Date().toISOString(),
                lastModifiedBy: userProfile?.displayName,
                lastModifiedByState: userProfile?.state,
                syncStatus: 'local',
            });
            addNotification({ title: 'Submitted for Approval', description: 'Your changes have been sent to an administrator for review.' });
        }
      
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
        if (isAdmin || isNewAsset) {
            addNotification({ title: 'Saved Locally', description: 'Changes will be synced with the cloud.' });
        }
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

    if (lockAssetList && isAdmin && dataSource === 'cloud') {
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

  const handleImportClick = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    addNotification({ title: "Parsing file...", description: "Please wait..." });

    // Enforce Sandbox-First Imports: All imports now go to the locked offline store first for review.
    const baseAssets = await getLockedOfflineAssets();
    const { assets: newAssets, updatedAssets, skipped, errors } = await parseExcelFile(file, appSettings, baseAssets);

    errors.forEach(error => addNotification({ title: "Import Error", description: error, variant: "destructive" }));
    if (skipped > 0) {
        addNotification({ title: "Import Notice", description: `${skipped} assets were skipped (either duplicates or because the list is locked).` });
    }

    const allChanges = [...newAssets, ...updatedAssets].map(asset => ({
        ...asset,
        lastModified: new Date().toISOString(),
        lastModifiedBy: userProfile?.displayName,
        lastModifiedByState: userProfile?.state,
        syncStatus: undefined // No sync status for locked offline items
    }));

    if (allChanges.length > 0) {
        const assetMap = new Map(baseAssets.map(a => [a.id, a]));
        allChanges.forEach(a => assetMap.set(a.id, a));
        const combinedAssets = Array.from(assetMap.values());
        
        await saveLockedOfflineAssets(combinedAssets);
        setOfflineAssets(combinedAssets);
        addNotification({ title: 'Imported to Locked Offline Store', description: `${allChanges.length} changes saved. Review and merge to main list when ready.` });
        setDataSource('local_locked'); // Switch to the offline view to show the imported data
        
    } else if (errors.length === 0) {
        addNotification({ title: "No Changes Detected", description: "No new or updated assets were found."});
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsImporting(false);
  };
  
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
              const allAssetsInCloud = await getAssets();
              if (allAssetsInCloud.length > 0) {
                  const idsToDelete = allAssetsInCloud.map((a) => a.id);
                  await batchDeleteAssets(idsToDelete);
              }
              addNotification({ title: 'All Cloud Assets Cleared', description: 'The application is now in a clean state.' });
          } catch (e) {
              addNotification({ title: 'Error', description: 'Could not clear all assets from the database.', variant: 'destructive' });
          }
      }
    } else {
      addNotification({ title: 'Clearing Offline Assets...', description: 'Removing all locked offline assets.' });
      await clearLockedOfflineAssets();
      setOfflineAssets([]);
      addNotification({ title: 'Offline Data Cleared', description: 'The locked offline store is now empty.' });
    }

    setSelectedAssetIds([]);

  }, [isOnline, isAdmin, setAssets, dataSource, setOfflineAssets]);

  const handleClearAllClick = useCallback(() => setIsClearAllDialogOpen(true), []);
  
  const handleExportToJson = useCallback(() => {
    try {
        exportFullBackupToJson(activeAssets, appSettings);
        addNotification({
            title: 'Exporting Full Backup',
            description: `Your data is being downloaded as ntblcp-full-backup.json.`,
        });
    } catch (e) {
        addNotification({
            title: 'Export Failed',
            description: e instanceof Error ? e.message : 'An unknown error occurred.',
            variant: 'destructive',
        });
    }
  }, [activeAssets, appSettings]);

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

  useEffect(() => {
    setDataActions({
        onAddAsset: handleAddAsset,
        onImport: handleImportClick,
        onScanAndImport: () => setIsImportScanOpen(true),
        onClearAll: handleClearAllClick,
        onTravelReport: handleTravelReport,
        onExportToJson: handleExportToJson,
        onExport: handleExport,
        isImporting,
    });
    return () => setDataActions({});
  }, [
    setDataActions, 
    handleAddAsset, 
    handleImportClick, 
    handleClearAllClick, 
    handleTravelReport,
    handleExportToJson,
    handleExport,
    isImporting
  ]);

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
        await batchDeleteAssets(idsToDelete);
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
        await batchSetAssets(assetsToUpload);

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
  }, [isOnline, view, selectedCategories, selectedAssetIds, assetsByCategory, setIsSyncing, setAssets, dataSource]);
  
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

    if (data.hide && isAdmin) {
        const newEnabledSheets = appSettings.enabledSheets.filter(sheet => !selectedCategories.includes(sheet));
        setAppSettings(prev => ({ ...prev, enabledSheets: newEnabledSheets }));
        await updateSettings({ enabledSheets: newEnabledSheets });
        addNotification({ title: 'Sheets Hidden', description: `${selectedCategories.length} categories have been hidden from view.`});
        setSelectedCategories([]);
    }

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
              await batchDeleteAssets(idsToDelete);
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

  const handleSaveColumnSettings = async (newDefinition: SheetDefinition) => {
    if (!currentCategory) return;
    const newSettings = {
      ...appSettings,
      sheetDefinitions: {
        ...appSettings.sheetDefinitions,
        [currentCategory]: newDefinition,
      }
    };
    setAppSettings(newSettings);
    await updateSettings({ sheetDefinitions: newSettings.sheetDefinitions });
    addNotification({ title: "Column settings saved", description: "Your changes have been saved." });
  };

  const clearAllDialogDescription = useMemo(() => {
    let message = `This will permanently delete all asset records from the ${dataSource === 'cloud' ? 'main' : 'locked offline'} store on your local device.`;
    if (isAdmin && isOnline && dataSource === 'cloud') {
      message += " As an admin who is online, this will ALSO delete all assets from the cloud database, which cannot be undone."
    }
    return message;
  }, [isAdmin, isOnline, dataSource]);

  const handleSyncConfirm = () => {
    if (syncSummary?.type === 'download') {
        executeDownload();
    } else if (syncSummary?.type === 'upload') {
        executeUpload();
    }
  };

  const handleConfirmProjectSwitch = async () => {
    setShowProjectSwitchDialog(false);
    addNotification({ title: 'Switching Projects...', description: 'Clearing all local data...' });
    await clearLocalAssets();
    await clearLockedOfflineAssets();
    setAssets([]);
    setOfflineAssets([]);
    addNotification({ title: 'Local Data Cleared', description: 'Attempting to sync with new project.' });
    handleDownloadScan();
  };

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  const renderDashboardCard = (category: string, categoryAssets: Asset[]) => {
      const total = categoryAssets.length;
      const verified = categoryAssets.filter(a => a.verifiedStatus === 'Verified').length;
      const percentage = total > 0 ? (verified / total) * 100 : 0;
      const isSelected = selectedCategories.includes(category);
      
      return (
          <Card key={category} className={cn("hover:shadow-md transition-shadow flex flex-col", isSelected && "ring-2 ring-primary")}>
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
    const isFiltered = searchTerm || selectedLocations.length > 0 || selectedAssignees.length > 0 || selectedStatuses.length > 0 || missingFieldFilter;
    const areAllCategoriesSelected = Object.keys(assetsByCategory).length > 0 && selectedCategories.length === Object.keys(assetsByCategory).length;
    
    const contextualButtonText = dataSource === 'local_locked' ? 'Merge to Main List' : 'Upload Selection';
    const ContextualButtonIcon = dataSource === 'local_locked' ? ArrowRightLeft : CloudUpload;

    const mainCategories = Object.keys(assetsByCategory).sort((a,b) => a.localeCompare(b));

    return (
      <div className="flex flex-col h-full gap-4">
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
        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx, .xls" className="hidden" />
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
                                    {SPECIAL_LOCATIONS.map((loc) => (
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
                    <div className="flex items-center justify-between gap-4">
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
                    <Button variant="ghost" size="sm" onClick={() => setIsCategoryBatchEditOpen(true)} disabled={isGuest || (!userProfile?.canEditAssets && !isAdmin)}>
                        <ClipboardEdit className="mr-2 h-4 w-4" /> Batch Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDeleteSelectedCategories} disabled={isBatchDeleting || isGuest}>
                        {isBatchDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete
                    </Button>
                </CardFooter>
            )}
          </Card>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        <TravelReportDialog isOpen={isTravelReportOpen} onOpenChange={setIsTravelReportOpen} />
        <AssetForm 
          isOpen={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          asset={selectedAsset} 
          onSave={handleSaveAsset}
          onQuickSave={handleQuickSaveAsset}
          isReadOnly={isFormReadOnly} 
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
  
  let tableFields: DisplayField[] = currentSheetDefinition?.displayFields.filter(f => f.table) || [];
  let quickViewFields: DisplayField[] = currentSheetDefinition?.displayFields.filter(f => f.quickView) || [];

  if (appSettings.appMode === 'management') {
    tableFields = tableFields.filter(f => f.key !== 'verifiedStatus');
    quickViewFields = quickViewFields.filter(f => f.key !== 'verifiedStatus');
  }
  
  const backButtonTarget = 'dashboard';


  return (
    <div className="flex flex-col h-full gap-4">
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
                <div className="md:hidden flex items-center space-x-2">
                    <Checkbox
                        id="select-all-in-table-mobile"
                        checked={areAllCategoryResultsSelected}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean, categoryFilteredAssets)}
                        aria-label="Select all in this category"
                        disabled={isGuest}
                    />
                    <Label htmlFor="select-all-in-table-mobile" className="text-sm font-medium">Select All</Label>
                </div>
            </div>
             {isAdmin && currentCategory && (
              <Button variant="outline" size="sm" onClick={() => setIsColumnSheetOpen(true)}>
                <Columns className="mr-2 h-4 w-4" />
                Edit Table
              </Button>
            )}
            {selectedAssetIds.length > 0 && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedAssetIds.length} selected</span>
                     <Button variant="outline" size="sm" onClick={handleSelectiveUpload} disabled={isSyncing || (!isOnline && dataSource !== 'local_locked')}>
                      {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ContextualButtonIcon className="mr-2 h-4 w-4" />}
                       {contextualButtonText}
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
                    <Button variant="destructive" size="sm" onClick={handleBatchDelete} disabled={isBatchDeleting || isGuest || !isAdmin}>
                        {isBatchDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete
                    </Button>
                </div>
            )}
        </div>
        
        <Card className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-grow overflow-y-auto">
               {/* Desktop Table */}
              <div className="hidden md:block">
                <Table className="relative">
                    <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={areAllCategoryResultsSelected}
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean, categoryFilteredAssets)}
                                    aria-label="Select all in this category"
                                    disabled={isGuest}
                                />
                            </TableHead>
                            {tableFields.map(field => (
                              <TableHead key={field.key}>{field.label}</TableHead>
                            ))}
                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedCategoryAssets.length > 0 ? (
                        paginatedCategoryAssets.map((asset) => (
                            <TableRow 
                              key={asset.id}
                              data-state={selectedAssetIds.includes(asset.id) ? 'selected' : ''} 
                              onClick={() => handleViewAsset(asset)}
                              className="cursor-pointer"
                            >
                                <TableCell onClick={e => e.stopPropagation()}>
                                    <Checkbox 
                                        checked={selectedAssetIds.includes(asset.id)}
                                        onCheckedChange={(checked) => handleSelectSingle(asset.id, checked as boolean)}
                                        aria-label={`Select asset ${asset.description}`}
                                        disabled={isGuest}
                                    />
                                </TableCell>
                                {tableFields.map(field => (
                                  <TableCell key={field.key} onClick={field.key === 'verifiedStatus' ? (e) => e.stopPropagation() : undefined}>
                                    {field.key === 'verifiedStatus' && appSettings.appMode === 'verification' ? (
                                      <Select
                                        value={asset.verifiedStatus || 'Unverified'}
                                        onValueChange={async (status) => {
                                          if (lockAssetList && isAdmin && dataSource === 'cloud') {
                                              addNotification({ title: "Edits Disabled", description: "The main asset list is locked. Switch to 'Locked Offline' source to make changes and merge.", variant: "destructive" });
                                              return;
                                          }
                                          const verifiedDate = status === "Verified" ? new Date().toLocaleDateString("en-CA") : "";
                                          await handleQuickSaveAsset(asset.id, {
                                              verifiedStatus: status as 'Verified' | 'Unverified',
                                              verifiedDate,
                                              remarks: asset.remarks,
                                              condition: asset.condition,
                                          });
                                          addNotification({ title: "Status Updated", description: `Asset status changed to ${status}.` });
                                        }}
                                      >
                                        <SelectTrigger className={cn("w-[130px] h-8 text-xs font-medium", getStatusClasses(asset.verifiedStatus || 'Unverified'))}>
                                          <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Unverified"><div className="flex items-center"><FileText className="mr-2 h-3 w-3"/>Unverified</div></SelectItem>
                                          <SelectItem value="Verified"><div className="flex items-center"><Check className="mr-2 h-3 w-3"/>Verified</div></SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <span className="flex items-center gap-2">
                                        {field.key === 'description' && asset.syncStatus === 'local' && (
                                            <TooltipProvider><Tooltip><TooltipTrigger><CloudOff className="h-4 w-4 text-blue-500" /></TooltipTrigger><TooltipContent><p>Local changes not synced</p></TooltipContent></Tooltip></TooltipProvider>
                                        )}
                                        {String(asset[field.key] ?? 'N/A')}
                                      </span>
                                    )}
                                  </TableCell>
                                ))}
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={isGuest}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewAsset(asset); }}>
                                            <FolderSearch className="mr-2 h-4 w-4" />
                                            View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditAsset(asset); }} disabled={!userProfile?.canEditAssets && !isAdmin}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit Full Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setAssetToDelete(asset); setIsDeleteDialogOpen(true); }} className="text-destructive focus:bg-destructive/20" disabled={!isAdmin}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </TableCell>
                            </TableRow>
                        ))
                        ) : (
                            <TableRow><TableCell colSpan={tableFields.length + 2} className="text-center h-24">No assets found matching your criteria.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
              </div>

               {/* Mobile Cards */}
              <div className="md:hidden space-y-4 p-2 sm:p-4">
                {paginatedCategoryAssets.length > 0 ? (
                  paginatedCategoryAssets.map((asset) => (
                    <Card
                      key={asset.id}
                      data-state={selectedAssetIds.includes(asset.id) ? 'selected' : ''}
                      className="data-[state=selected]:ring-2 data-[state=selected]:ring-primary"
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
                              <CardDescription className="flex items-center gap-2">
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
                      <CardContent className="p-4 pt-0" onClick={() => handleViewAsset(asset)}>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                              {quickViewFields.map(field => {
                                // Exclude fields that are already displayed in the card's header or have dedicated controls.
                                if (['description', 'category', 'verifiedStatus'].includes(field.key)) return null;
                                
                                const value = asset[field.key];
                                if (value === null || value === undefined || String(value).trim() === '') return null;
                                
                                return (
                                    <div key={field.key} className="space-y-1">
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
                                      if (lockAssetList && isAdmin && dataSource === 'cloud') {
                                          addNotification({ title: "Edits Disabled", description: "The main asset list is locked.", variant: "destructive" });
                                          return;
                                      }
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
                  <div className="text-center py-24 text-muted-foreground">No assets found matching your criteria.</div>
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
        {currentCategory && currentSheetDefinition && (
          <ColumnCustomizationSheet 
            isOpen={isColumnSheetOpen}
            onOpenChange={setIsColumnSheetOpen}
            sheetDefinition={currentSheetDefinition}
            onSave={handleSaveColumnSettings}
          />
        )}
    </div>
  );
}

    

    

    

    