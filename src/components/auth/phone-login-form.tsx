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
  FileDown,
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
  Cloud,
  CloudOff,
  CloudUpload,
  HardDrive,
  ArrowRightLeft,
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
import type { Asset } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { parseExcelFile, exportToExcel, sanitizeForFirestore } from "@/lib/excel-parser";
import { NIGERIAN_ZONES, NIGERIAN_STATES, ZONE_NAMES, SPECIAL_LOCATIONS, NIGERIAN_STATE_CAPITALS } from "@/lib/constants";
import { useAppState, type SortConfig } from "@/contexts/app-state-context";
import { useAuth } from "@/contexts/auth-context";
import { AssetBatchEditForm, type BatchUpdateData } from "./asset-batch-edit-form";
import { CategoryBatchEditForm, type CategoryBatchUpdateData } from "./category-batch-edit-form";
import { PaginationControls } from "./pagination-controls";
import { getAssets, batchSetAssets, deleteAsset, batchDeleteAssets } from "@/lib/firestore";
import { getLocalAssets as getLocalAssetsFromDb, saveAssets, clearAssets as clearLocalAssets, getLockedOfflineAssets, saveLockedOfflineAssets, clearLockedOfflineAssets } from "@/lib/idb";
import { cn } from "@/lib/utils";
import { addNotification } from "@/hooks/use-notifications";


const normalizeAssetLocation = (location?: string): string => {
    if (!location) return '';
    const originalLocation = location.trim();
    if (!originalLocation) return '';

    const lowerCaseLocation = originalLocation.toLowerCase();

    const matchedState = NIGERIAN_STATES.find(state => lowerCaseLocation.includes(state.toLowerCase()));
    if (matchedState) return matchedState;

    for (const state in NIGERIAN_STATE_CAPITALS) {
        if (lowerCaseLocation.includes(NIGERIAN_STATE_CAPITALS[state].toLowerCase())) {
            return state;
        }
    }
    return originalLocation.replace(/\b\w/g, l => l.toUpperCase());
};

const getStatusClasses = (status?: 'Verified' | 'Unverified' | 'Discrepancy') => {
    switch (status) {
        case 'Verified':
            return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800 hover:bg-green-200/60 dark:hover:bg-green-900/80 focus:ring-green-500';
        case 'Unverified':
            return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800 hover:bg-red-200/60 dark:hover:bg-red-900/80 focus:ring-red-500';
        case 'Discrepancy':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800 hover:bg-yellow-200/60 dark:hover:bg-yellow-900/80 focus:ring-yellow-500';
        default:
            return '';
    }
}

/**
 * Compares two asset-like objects to see if any relevant fields have changed.
 * @param a The first object.
 * @param b The second object.
 * @returns True if there are changes, false otherwise.
 */
const haveAssetDetailsChanged = (a: Partial<Asset>, b: Partial<Asset>): boolean => {
    const keys = Object.keys(b) as (keyof Asset)[];
    for (const key of keys) {
        if (key === 'id' || key === 'syncStatus' || key === 'lastModified' || key === 'lastModifiedBy' || key === 'lastModifiedByState') {
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

const StateProgress: React.FC<{ state: string, allAssets: Asset[] }> = ({ state, allAssets }) => {
  const stateAssets = useMemo(() => {
    const lowerCaseState = state.toLowerCase();
    const capitalCity = NIGERIAN_STATE_CAPITALS[state]?.toLowerCase().trim();
    return allAssets.filter(asset => {
      const assetLocation = (asset.location || "").toLowerCase().trim();
      const matchesState = assetLocation.startsWith(lowerCaseState);
      const matchesCapital = capitalCity ? assetLocation.startsWith(capitalCity) : false;
      return matchesState || matchesCapital;
    });
  }, [state, allAssets]);

  const total = stateAssets.length;
  if (total === 0) {
    return (
      <div className="flex justify-between items-center w-full">
        <span>{state}</span>
        <span className="text-xs text-muted-foreground">0 assets</span>
      </div>
    );
  }

  const verified = stateAssets.filter(a => a.verifiedStatus === 'Verified').length;
  const percentage = (verified / total) * 100;

  return (
    <div className="flex flex-col w-full gap-1">
      <div className="flex justify-between items-center w-full text-sm">
        <span>{state}</span>
        <span className="text-xs font-mono">{verified}/{total} verified</span>
      </div>
      <Progress value={percentage} className="h-1.5" />
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
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCategoryBatchEditOpen, setIsCategoryBatchEditOpen] = useState(false);
  
  const {
    assets, setAssets, isOnline, setIsOnline, 
    offlineAssets, setOfflineAssets, dataSource, setDataSource,
    globalStateFilter, setGlobalStateFilter,
    itemsPerPage, setItemsPerPage,
    selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter,
    setLocationOptions, setAssigneeOptions, statusOptions, setStatusOptions,
    sortConfig,
    appSettings,
    manualSyncTrigger, isSyncing, setIsSyncing,
    setDataActions,
    searchTerm,
    autoSyncEnabled,
  } = useAppState();

  const { enabledSheets, lockAssetList } = appSettings;

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
  const performSync = useCallback(async () => {
    if (!isOnline || !authInitialized || isGuest) return;

    setIsSyncing(true);
    addNotification({ title: 'Syncing with cloud...' });

    try {
        const localAssets = await getLocalAssetsFromDb();
        const cloudAssets = await getAssets();
        
        const assetsToPush = localAssets.filter(asset => asset.syncStatus === 'local');
        
        if (assetsToPush.length > 0) {
          await batchSetAssets(assetsToPush);
          addNotification({ title: 'Local changes pushed', description: `${assetsToPush.length} assets updated in the cloud.`});
        }
        
        const finalAssets = cloudAssets.map(asset => ({ ...asset, syncStatus: 'synced' as const }));
        
        await saveAssets(finalAssets);
        setAssets(finalAssets);
        
        addNotification({ title: 'Sync Complete', description: 'Your local data is up to date.' });
    } catch (error) {
        console.error("Sync failed:", error);
        toast({
          title: "Sync Failed",
          description: (error as Error).message,
          variant: 'destructive'
        });
        setIsOnline(false);
    } finally {
        setIsSyncing(false);
    }
  }, [isOnline, authInitialized, isGuest, toast, setIsOnline, setAssets, setIsSyncing]);
  
  useEffect(() => {
    const loadInitialData = async () => {
        setIsLoading(true);
        const localAssets = await getLocalAssetsFromDb();
        const localOfflineAssets = await getLockedOfflineAssets();
        setAssets(localAssets);
        setOfflineAssets(localOfflineAssets);
        setIsLoading(false);

        if (isOnline && authInitialized && !isGuest) {
          await performSync();
        }
    };

    if (authInitialized) {
        loadInitialData();
    }
  }, [authInitialized, performSync, setAssets, isOnline, isGuest, setOfflineAssets]);
  
  useEffect(() => {
    if (!isOnline) return;

    const shouldSync = manualSyncTrigger > 0 || autoSyncEnabled;
    
    if (shouldSync && authInitialized && !isGuest && dataSource === 'cloud') {
        performSync();
    }
  }, [manualSyncTrigger, isOnline, autoSyncEnabled, authInitialized, performSync, isGuest, dataSource]);
  
  useEffect(() => {
    setStatusOptions([
      { value: "Verified", label: "Verified" },
      { value: "Unverified", label: "Unverified" },
      { value: "Discrepancy", label: "Discrepancy" },
    ]);
  }, [setStatusOptions]);

  const allAssetsForFiltering = useMemo(() => {
    const currentAssets = dataSource === 'cloud' ? assets : offlineAssets;
    if (isAdmin && globalStateFilter && globalStateFilter !== 'All') {
        const zones: Record<string, string[]> = NIGERIAN_ZONES;
        const capitals: Record<string, string> = NIGERIAN_STATE_CAPITALS;
        const isZone = !!zones[globalStateFilter];

        if (isZone) {
            const lowerCaseZone = globalStateFilter.toLowerCase();
            return currentAssets.filter(asset => {
                const assetLocation = (asset.location || "").toLowerCase().trim();
                return assetLocation.includes(lowerCaseZone) && assetLocation.includes("zonal store");
            });
        } else {
            const lowerCaseFilter = globalStateFilter.toLowerCase().trim();
            const capitalCity = capitals[globalStateFilter]?.toLowerCase().trim();
            return currentAssets.filter(asset => {
                const assetLocation = (asset.location || "").toLowerCase().trim();
                const matchesState = assetLocation.startsWith(lowerCaseFilter);
                const matchesCapital = capitalCity ? assetLocation.startsWith(capitalCity) : false;
                return matchesState || matchesCapital;
            });
        }
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
    if (lockAssetList && isAdmin && dataSource === 'cloud') {
      addNotification({ title: "Asset List Locked", description: "Adding new assets to the main list is disabled. Switch to 'Locked Offline' source to add.", variant: "destructive" });
      return;
    }
    setSelectedAsset(undefined);
    setIsFormReadOnly(false);
    setIsFormOpen(true);
  }, [lockAssetList, isAdmin, dataSource]);
  
  const handleViewAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormReadOnly(true);
    setIsFormOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormReadOnly(false);
    setIsFormOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!assetToDelete) return;

    if (lockAssetList && isAdmin && dataSource === 'cloud') {
        addNotification({ title: "Deletion Disabled", description: "The main asset list is locked.", variant: "destructive" });
        setIsDeleteDialogOpen(false);
        return;
    }

    if (dataSource === 'cloud') {
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
  }

  const handleBatchDelete = async () => {
    if (lockAssetList && isAdmin && dataSource === 'cloud') {
        addNotification({ title: "Deletion Disabled", description: "The main asset list is locked.", variant: "destructive" });
        return;
    }
    
    setIsBatchDeleting(true);
    const assetsToDeleteCount = selectedAssetIds.length;

    if (dataSource === 'cloud') {
      let currentAssets = await getLocalAssetsFromDb();
      currentAssets = currentAssets.filter(a => !selectedAssetIds.includes(a.id));
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
      currentOfflineAssets = currentOfflineAssets.filter(a => !selectedAssetIds.includes(a.id));
      await saveLockedOfflineAssets(currentOfflineAssets);
      setOfflineAssets(currentOfflineAssets);
      addNotification({ title: 'Deleted from Offline Store', description: `${assetsToDeleteCount} assets deleted.` });
    }

    setSelectedAssetIds([]);
    setIsBatchDeleting(false);
  }

  const handleBatchEdit = () => setIsBatchEditOpen(true);
  
  const handleSaveBatchEdit = async (data: BatchUpdateData) => {
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
    const sourceAssets = dataSource === 'cloud' ? assets : offlineAssets;
    const originalAsset = sourceAssets.find(a => a.id === assetToSave.id);

    if (!originalAsset || haveAssetDetailsChanged(originalAsset, assetToSave)) {
      const finalAsset: Asset = sanitizeForFirestore({
        ...assetToSave,
        lastModified: new Date().toISOString(),
        lastModifiedBy: userProfile?.displayName,
        lastModifiedByState: userProfile?.state,
        syncStatus: dataSource === 'cloud' ? 'local' : undefined,
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

  const handleQuickSaveAsset = async (assetId: string, data: { remarks?: string; verifiedStatus?: 'Verified' | 'Unverified' | 'Discrepancy', verifiedDate?: string }) => {
    const sourceAssets = dataSource === 'cloud' ? assets : offlineAssets;
    const asset = sourceAssets.find(a => a.id === assetId);
    if (!asset) return;

    if (asset.remarks === data.remarks && asset.verifiedStatus === data.verifiedStatus) {
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
        addNotification({ title: "Import Notice", description: `${skipped} assets were skipped as they already exist.` });
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
  
  const handleExportClick = useCallback((categoriesToExport?: string[]) => {
    const categories = categoriesToExport && categoriesToExport.length > 0 ? categoriesToExport : Object.keys(assetsByCategory);
    const assetsToExport = displayedAssets.filter(asset => categories.includes(asset.category));

    if (assetsToExport.length === 0) {
      addNotification({ title: "No Data to Export", description: "There are no assets in the selected categories." });
      return;
    }
    try {
      const exportPrefix = userProfile?.state || 'user-export';
      let fileName = `${exportPrefix}-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      if(categoriesToExport && categoriesToExport.length > 0){
          fileName = `${exportPrefix}-${categoriesToExport.join('&')}-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      }

      exportToExcel(assetsToExport, appSettings.sheetDefinitions, fileName);
      addNotification({ title: "Export Successful" });
    } catch(error) {
      console.error("Export Error:", error);
      addNotification({ title: "Export Failed", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
    }
  }, [displayedAssets, userProfile, assetsByCategory, appSettings]);
  
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
  
  const handleSelectiveSync = useCallback(async () => {
    if (!isOnline) {
      addNotification({title: "Offline", description: "Cannot sync while offline.", variant: "destructive"});
      return;
    }

    if (dataSource === 'local_locked') {
        handleMergeToMainList();
        return;
    }

    const idsToSync = view === 'dashboard'
      ? selectedCategories.flatMap(cat => assetsByCategory[cat]?.map(a => a.id) || [])
      : selectedAssetIds;

    if (idsToSync.length === 0) {
      addNotification({title: "No Selection", description: "Please select assets or categories to sync."});
      return;
    }
    
    setIsSyncing(true);
    try {
      addNotification({title: "Syncing selected items...", description: `Preparing to sync ${idsToSync.length} assets.`});
      const allLocalAssets = await getLocalAssetsFromDb();
      const assetsToSync = allLocalAssets.filter(a => idsToSync.includes(a.id));

      if (assetsToSync.length > 0) {
        await batchSetAssets(assetsToSync);

        const updatedLocalAssets = allLocalAssets.map(asset => 
          idsToSync.includes(asset.id) ? { ...asset, syncStatus: 'synced' as const } : asset
        );
        await saveAssets(updatedLocalAssets);
        setAssets(updatedLocalAssets);
        
        addNotification({title: "Selective Sync Complete", description: `${assetsToSync.length} assets have been synced to the cloud.`});
      }

    } catch(e) {
      console.error("Selective sync failed", e);
      addNotification({title: "Sync Failed", description: (e as Error).message, variant: "destructive"});
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

        addNotification({ title: 'Merge Complete', description: `${idsToMerge.length} assets merged to the main list and are ready for cloud sync.` });
        
    } catch (e) {
        addNotification({ title: 'Merge Failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
        setIsSyncing(false);
        setSelectedAssetIds([]);
        setSelectedCategories([]);
    }
  };


  useEffect(() => {
    const hasCurrentAssets = activeAssets.length > 0;
    setDataActions({
        onImport: handleImportClick,
        onExport: () => handleExportClick(),
        onAddAsset: handleAddAsset,
        onClearAll: handleClearAllClick,
        isImporting: isImporting,
        isAdmin: isAdmin,
        hasAssets: hasCurrentAssets
    });

    return () => {
        setDataActions({});
    }
  }, [
      setDataActions, 
      handleImportClick, 
      handleExportClick, 
      handleAddAsset, 
      handleClearAllClick, 
      isImporting, 
      isAdmin, 
      activeAssets.length
  ]);
  
  const handleSaveCategoryBatchEdit = async (data: CategoryBatchUpdateData) => {
    let assetsToUpdate: Asset[] = [];
    selectedCategories.forEach(category => {
        assetsToUpdate.push(...(assetsByCategory[category] || []));
    });

    if (data.hide && isAdmin) {
        const newSettings = { 
          ...appSettings,
          enabledSheets: appSettings.enabledSheets.filter(sheet => !selectedCategories.includes(sheet))
        };
        // await updateSettings(newSettings);
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

  const clearAllDialogDescription = useMemo(() => {
    let message = `This will permanently delete all asset records from the ${dataSource === 'cloud' ? 'main' : 'locked offline'} store on your local device.`;
    if (isAdmin && isOnline && dataSource === 'cloud') {
      message += " As an admin who is online, this will ALSO delete all assets from the cloud database, which cannot be undone."
    }
    return message;
  }, [isAdmin, isOnline, dataSource]);

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  // DASHBOARD VIEW
  if (view === 'dashboard') {
    const totalAssetsInScope = allAssetsForFiltering.length;
    const currentlyDisplayedAssets = displayedAssets.length;
    const verifiedStateAssets = displayedAssets.filter(asset => asset.verifiedStatus === 'Verified').length;
    const verificationPercentage = currentlyDisplayedAssets > 0 ? (verifiedStateAssets / currentlyDisplayedAssets) * 100 : 0;
    const isFiltered = searchTerm || selectedLocations.length > 0 || selectedAssignees.length > 0 || selectedStatuses.length > 0 || missingFieldFilter;
    const areAllCategoriesSelected = Object.keys(assetsByCategory).length > 0 && selectedCategories.length === Object.keys(assetsByCategory).length;
    
    const syncButtonText = dataSource === 'local_locked' ? 'Merge to Main List' : 'Sync to Cloud';
    const SyncButtonIcon = dataSource === 'local_locked' ? ArrowRightLeft : CloudUpload;

    return (
      <div className="flex flex-col h-full gap-4">
        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx, .xls" className="hidden" />
        <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight flex-1">
                {isFiltered ? `Filter Results` : 'Asset Dashboard'}
            </h2>
            {selectedCategories.length > 0 && (
                 <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedCategories.length} selected</span>
                     <Button variant="outline" size="sm" onClick={handleSelectiveSync} disabled={isSyncing || (!isOnline && dataSource !== 'local_locked')}>
                      {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <SyncButtonIcon className="mr-2 h-4 w-4" />}
                       {syncButtonText}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsCategoryBatchEditOpen(true)} disabled={isGuest}>
                        <ClipboardEdit className="mr-2 h-4 w-4" /> Batch Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportClick(selectedCategories)}>
                        <FileDown className="mr-2 h-4 w-4" /> Export
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelectedCategories} disabled={isBatchDeleting || isGuest}>
                        {isBatchDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete
                    </Button>
                </div>
            )}
        </div>
        <Card>
             <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span>Verification Status</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDataSource(prev => prev === 'cloud' ? 'local_locked' : 'cloud')}>
                              {dataSource === 'cloud' ? <Cloud className="h-5 w-5 text-blue-500"/> : <HardDrive className="h-5 w-5 text-gray-500" />}
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
                
                <div className="flex items-center gap-4">
                  {isAdmin && !isFiltered && (
                    <Select
                        value={globalStateFilter || 'All'}
                        onValueChange={(value) => setGlobalStateFilter(value)}
                    >
                    <SelectTrigger className="w-full sm:w-[280px]">
                      <SelectValue placeholder="Select a location to filter..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">Overall (All Assets)</SelectItem>
                        <SelectSeparator />
                        <SelectGroup>
                            <SelectLabel>Special Locations</SelectLabel>
                            {SPECIAL_LOCATIONS.map((loc) => (
                                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                            ))}
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectGroup>
                            <SelectLabel>Geopolitical Zones</SelectLabel>
                            {ZONE_NAMES.map((zone) => (
                                <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                            ))}
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectGroup>
                            <SelectLabel>States</SelectLabel>
                            {NIGERIAN_STATES.map((state) => (
                                <SelectItem key={state} value={state}>
                                  <StateProgress state={state} allAssets={activeAssets} />
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                    </Select>
                  )}
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="select-all-categories" className="text-sm font-medium">Select All</Label>
                    <Checkbox
                        id="select-all-categories"
                        checked={areAllCategoriesSelected}
                        onCheckedChange={(checked) => handleSelectAllCategories(checked as boolean)}
                        aria-label="Select all categories"
                        disabled={isGuest}
                    />
                  </div>
                </div>
            </CardHeader>
             <CardContent className="pt-2 space-y-2">
                <Progress value={verificationPercentage} aria-label={`${verificationPercentage.toFixed(0)}% verified`} />
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{verifiedStateAssets}</span> of <span className="font-bold text-foreground">{currentlyDisplayedAssets}</span> assets verified.
                  {isFiltered && ` (Showing from a total of ${totalAssetsInScope})`}
                </p>
            </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Object.keys(assetsByCategory).length > 0 ? (
                Object.entries(assetsByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryAssets]) => {
                    const total = categoryAssets.length;
                    const verified = categoryAssets.filter(a => a.verifiedStatus === 'Verified').length;
                    const percentage = total > 0 ? (verified / total) * 100 : 0;
                    const isSelected = selectedCategories.includes(category);
                    
                    return (
                        <Card key={category} className={cn("hover:shadow-md transition-shadow flex flex-col", isSelected && "ring-2 ring-primary")}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium pr-2">{category}</CardTitle>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handleSelectCategory(category, checked as boolean)}
                                  aria-label={`Select category ${category}`}
                                  disabled={isGuest}
                                />
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <div>
                                    <div className="text-2xl font-bold">{total}</div>
                                    <p className="text-xs text-muted-foreground">{isFiltered ? 'Assets found' : 'Total assets'} in this category</p>
                                </div>
                                <div className="space-y-2">
                                    <Progress value={percentage} aria-label={`${percentage.toFixed(0)}% verified`} />
                                    <p className="text-xs text-muted-foreground">{verified} of {total} verified</p>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0 pb-4">
                              <Button variant="link" className="p-0 h-auto" onClick={() => { setView('table'); setCurrentCategory(category); }}>View Assets</Button>
                            </CardFooter>
                        </Card>
                    );
                })
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
      </div>
    )
  }

  // TABLE VIEW
  const paginatedCategoryAssets = categoryFilteredAssets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const areAllCategoryResultsSelected = categoryFilteredAssets.length > 0 && categoryFilteredAssets.every(a => selectedAssetIds.includes(a.id));

  const syncButtonText = dataSource === 'local_locked' ? 'Merge to Main List' : 'Sync to Cloud';
  const SyncButtonIcon = dataSource === 'local_locked' ? ArrowRightLeft : CloudUpload;

  return (
    <div className="flex flex-col h-full gap-4">
        <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => { setView('dashboard'); setCurrentCategory(null); setSelectedAssetIds([]); }}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold tracking-tight flex-1">
                {currentCategory}
            </h2>
            {selectedAssetIds.length > 0 && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedAssetIds.length} selected</span>
                     <Button variant="outline" size="sm" onClick={handleSelectiveSync} disabled={isSyncing || (!isOnline && dataSource !== 'local_locked')}>
                      {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <SyncButtonIcon className="mr-2 h-4 w-4" />}
                       {syncButtonText}
                    </Button>
                     {selectedAssetIds.length === 1 && (
                        <Button variant="outline" size="sm" onClick={() => handleEditAsset(activeAssets.find(a => a.id === selectedAssetIds[0])!)} disabled={isGuest}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                    )}
                    {selectedAssetIds.length > 0 && (
                        <Button variant="outline" size="sm" onClick={handleBatchEdit} disabled={isGuest}>
                            <ClipboardEdit className="mr-2 h-4 w-4" /> Batch Edit
                        </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={handleBatchDelete} disabled={isBatchDeleting || isGuest}>
                        {isBatchDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete
                    </Button>
                </div>
            )}
        </div>
        
        <Card className="flex-1 flex flex-col">
            <CardContent className="p-0 flex-1 overflow-auto">
              <Table>
                  <TableHeader>
                      <TableRow>
                      <TableHead className="w-[50px]">
                          <Checkbox
                              checked={areAllCategoryResultsSelected}
                              onCheckedChange={(checked) => handleSelectAll(checked as boolean, categoryFilteredAssets)}
                              aria-label="Select all in this category"
                              disabled={isGuest}
                          />
                      </TableHead>
                      <TableHead>S/N</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Verified Status</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {paginatedCategoryAssets.length > 0 ? (
                      paginatedCategoryAssets.map((asset) => (
                          <TableRow key={asset.id} data-state={selectedAssetIds.includes(asset.id) ? 'selected' : ''} onClick={() => handleViewAsset(asset)} className="cursor-pointer">
                              <TableCell onClick={e => e.stopPropagation()}>
                                  <Checkbox 
                                      checked={selectedAssetIds.includes(asset.id)}
                                      onCheckedChange={(checked) => handleSelectSingle(asset.id, checked as boolean)}
                                      aria-label={`Select asset ${asset.description}`}
                                      disabled={isGuest}
                                  />
                              </TableCell>
                              <TableCell>{asset.sn ?? 'N/A'}</TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                    <span>{asset.description}</span>
                                    {asset.syncStatus === 'local' && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <CloudOff className="h-4 w-4 text-blue-500" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Local changes not synced</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                    {asset.syncStatus === 'syncing' && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Syncing...</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                </div>
                              </TableCell>
                              <TableCell>{asset.assetIdCode ?? 'N/A'}</TableCell>
                              <TableCell>{asset.assignee ?? 'N/A'}</TableCell>
                              <TableCell>
                                <div className={cn("w-[135px] h-9 text-sm inline-flex items-center justify-center rounded-md px-2 py-1", getStatusClasses(asset.verifiedStatus || 'Unverified'))}>
                                  {asset.verifiedStatus === 'Verified' && <Check className="mr-2 h-4 w-4" />}
                                  {asset.verifiedStatus === 'Unverified' && <FileText className="mr-2 h-4 w-4" />}
                                  {asset.verifiedStatus === 'Discrepancy' && <AlertCircle className="mr-2 h-4 w-4" />}
                                  {asset.verifiedStatus || 'Unverified'}
                                </div>
                              </TableCell>
                              <TableCell>{asset.lastModified ? new Date(asset.lastModified).toLocaleString() : 'N/A'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                  <DropdownMenu>
                                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={isGuest}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditAsset(asset); }}>
                                          <Edit className="mr-2 h-4 w-4" />
                                          Edit Full Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setAssetToDelete(asset); setIsDeleteDialogOpen(true); }} className="text-destructive focus:bg-destructive/20">
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
                          <TableRow><TableCell colSpan={8} className="text-center h-24">No assets found matching your criteria.</TableCell></TableRow>
                      )}
                  </TableBody>
              </Table>
            </CardContent>
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
    </div>
  );
}