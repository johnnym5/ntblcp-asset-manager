
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
  FileUp,
  MoreHorizontal,
  PlusCircle,
  Loader2,
  Trash2,
  ArrowLeft,
  Folder,
  Edit,
  AlertCircle,
  Check,
  FileText,
  ClipboardEdit,
  FolderSearch,
  X,
  CloudOff,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Asset, AssetChange, InboxMessageGroup } from "@/lib/types";
import { addNotification } from "@/hooks/use-notifications";
import { parseExcelFile, exportToExcel } from "@/lib/excel-parser";
import { NIGERIAN_ZONES, NIGERIAN_STATES, ZONE_NAMES, SPECIAL_LOCATIONS, NIGERIAN_STATE_CAPITALS } from "@/lib/constants";
import { useAppState, type SortConfig } from "@/contexts/app-state-context";
import { useAuth } from "@/contexts/auth-context";
import { AssetBatchEditForm, type BatchUpdateData } from "./asset-batch-edit-form";
import { PaginationControls } from "./pagination-controls";
import { getAssets, batchSetAssets, deleteAsset, batchDeleteAssets } from "@/lib/firestore";
import { getLocalAssets as getLocalAssetsFromDb, saveAssets, clearAssets as clearLocalAssets } from "@/lib/idb";
import { cn } from "@/lib/utils";
import { onSnapshot, query, collection, Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";


const ITEMS_PER_PAGE = 25;

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


export default function AssetList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormReadOnly, setIsFormReadOnly] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { userProfile } = useAuth();

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
  
  const isInitialLoad = useRef(true);

  const { 
    searchTerm,
    isOnline, setIsOnline, globalStateFilter, setGlobalStateFilter,
    selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter,
    sortConfig,
    enabledSheets, lockAssetList,
    manualSyncTrigger, isSyncing, setIsSyncing,
    autoSyncEnabled,
    setDataActions,
    setInboxMessages, setUnreadInboxCount,
    setLocationOptions, setAssigneeOptions, setStatusOptions
  } = useAppState();

  const isSyncingRef = useRef(isSyncing);
  isSyncingRef.current = isSyncing;
  const isAdmin = userProfile?.displayName?.toLowerCase().trim() === 'admin';

  useEffect(() => {
    setCurrentPage(1);
    setSelectedCategories([]);
  }, [searchTerm, selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter, globalStateFilter, view]);
  
  const getNewestDuplicate = (assetsToFilter: Asset[]): Asset[] => {
    const uniqueAssetMap = new Map<string, Asset>();
  
    assetsToFilter.forEach(asset => {
      const key = asset.id;
  
      const existingAsset = uniqueAssetMap.get(key);
      if (!existingAsset) {
        uniqueAssetMap.set(key, asset);
      } else {
        const existingTimestamp = existingAsset.lastModified ? new Date(existingAsset.lastModified).getTime() : 0;
        const currentTimestamp = asset.lastModified ? new Date(asset.lastModified).getTime() : 0;
        
        if (currentTimestamp > existingTimestamp) {
          uniqueAssetMap.set(key, asset);
        }
      }
    });
    return Array.from(uniqueAssetMap.values());
  };

  const handleFetchedAssets = useCallback(async (fetchedAssets: Asset[], isManualSync = false) => {
    const localAssets = await getLocalAssetsFromDb();
    let mergedAssets = [...localAssets];

    if (isManualSync) {
      const fetchedAssetsMap = new Map(fetchedAssets.map(a => [a.id, a]));
      const localOnlyNewAssets = localAssets.filter(la => !fetchedAssetsMap.has(la.id));
      mergedAssets = [...fetchedAssets, ...localOnlyNewAssets];
    } else {
      const mergedAssetMap = new Map<string, Asset>();
      localAssets.forEach(asset => mergedAssetMap.set(asset.id, asset));
      fetchedAssets.forEach(asset => {
        const existing = mergedAssetMap.get(asset.id);
        if (!existing || new Date(asset.lastModified || 0) > new Date(existing.lastModified || 0)) {
            mergedAssetMap.set(asset.id, { ...asset, syncStatus: 'synced' });
        }
      });
      mergedAssets = Array.from(mergedAssetMap.values());
    }
    
    const assetsToPush = mergedAssets.filter(a => a.syncStatus === 'local');
    if (isOnline && assetsToPush.length > 0) {
      addNotification({ title: 'Syncing Local Changes', description: `Uploading ${assetsToPush.length} pending assets.` });
      try {
          await batchSetAssets(assetsToPush.map(a => ({...a, syncStatus: 'synced'})));
      } catch(e) {
          addNotification({title: 'Sync Error', description: 'Failed to upload some local changes.', variant: 'destructive'});
      }
    }
    
    const finalAssets = getNewestDuplicate(mergedAssets);
    setAssets(finalAssets);
    await saveAssets(finalAssets);
    isInitialLoad.current = false;
}, [isOnline]);

  
  useEffect(() => {
    const loadInitialData = async () => {
        setIsLoading(true);
        const localAssets = await getLocalAssetsFromDb();
        const uniqueAssets = getNewestDuplicate(localAssets);
        setAssets(uniqueAssets);
        setIsLoading(false);
    };
    loadInitialData();
  }, []);

  // Real-time listener for Admins with Auto-Sync
  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    if (isOnline && isAdmin && autoSyncEnabled) {
      setIsSyncing(true);
  
      const q = query(collection(db, 'assets'));
      unsubscribe = onSnapshot(q, async (querySnapshot) => {
        if (!isInitialLoad.current) {
          const hasChanges = querySnapshot.docChanges().length > 0;
          if (hasChanges) {
            addNotification({ title: 'Real-time Sync', description: 'Asset data has been updated from the cloud.' });
          }
        }
  
        const fetchedAssets: Asset[] = [];
        querySnapshot.forEach((doc) => {
          fetchedAssets.push({ id: doc.id, ...doc.data() } as Asset);
        });
        await handleFetchedAssets(fetchedAssets, false);
        
        if (isSyncingRef.current) {
          setIsSyncing(false);
        }
      }, (error) => {
        const errorMessage = (error as any).message || 'An unknown error occurred.';
        if ((error as any).code === 'permission-denied' || errorMessage.includes('insufficient permissions')) {
          addNotification({ title: "Permissions Error", description: "You don't have permission to read asset data. Please check Firestore rules.", variant: 'destructive' })
        } else if ((error as any).code === 'resource-exhausted') {
            addNotification({ title: 'Sync Paused', description: 'Cloud read quota exceeded. Syncing is paused.', variant: 'destructive' });
        } else {
          addNotification({ title: 'Sync Error', description: 'Lost connection to the database.', variant: 'destructive' });
        }
        setIsSyncing(false);
        setIsOnline(false);
      });
    }
  
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (isSyncingRef.current) {
        setIsSyncing(false);
      }
    };
  }, [isOnline, isAdmin, autoSyncEnabled, handleFetchedAssets, setIsOnline, setIsSyncing]);
  

  // Manual sync for all users (or admins with auto-sync off)
  useEffect(() => {
    const pushLocalChanges = async () => {
      if (isSyncingRef.current) return;
      setIsSyncing(true);
      
      try {
        const localAssets = await getLocalAssetsFromDb();
        const assetsToPush = localAssets.filter(a => a.syncStatus === 'local');
        
        if (assetsToPush.length === 0) {
          addNotification({ title: 'No Changes to Sync', description: 'Your local data is already up to date.' });
          setIsSyncing(false);
          return;
        }

        addNotification({ title: 'Syncing with Cloud', description: `Uploading ${assetsToPush.length} changed assets.` });
        await batchSetAssets(assetsToPush.map(a => ({...a, syncStatus: 'synced'})));

        const updatedLocalAssets = localAssets.map(a => 
            assetsToPush.find(p => p.id === a.id) ? { ...a, syncStatus: 'synced' as const } : a
        );
        
        await saveAssets(updatedLocalAssets);
        setAssets(updatedLocalAssets);
        
        addNotification({ title: 'Sync Complete', description: 'Your local changes have been saved to the cloud.' });
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (errorMessage.includes('permission-denied') || errorMessage.includes('insufficient permissions')) {
          addNotification({ title: 'Permissions Error', description: 'You do not have permission to write to the database. Check Firestore rules.', variant: 'destructive' });
        } else {
          addNotification({ title: 'Sync Failed', description: errorMessage, variant: 'destructive' });
        }
        setIsOnline(false); // Go offline if sync fails to prevent further issues
      } finally {
        setIsSyncing(false);
      }
    };
    
    if (manualSyncTrigger > 0 && isOnline) {
      if (!(isAdmin && autoSyncEnabled)) {
        pushLocalChanges();
      }
    }
  }, [manualSyncTrigger, isOnline, isAdmin, autoSyncEnabled, setIsOnline, setIsSyncing]);

  
  useEffect(() => {
    setStatusOptions([
      { value: "Verified", label: "Verified" },
      { value: "Unverified", label: "Unverified" },
      { value: "Discrepancy", label: "Discrepancy" },
    ]);
  }, [setStatusOptions]);

  const globallyFilteredAssets = useMemo(() => {
    return assets.filter(asset => enabledSheets.includes(asset.category));
  }, [assets, enabledSheets]);
  
  const stateFilteredAssets = useMemo(() => {
    if (!globalStateFilter) {
      return globallyFilteredAssets; // Admin view or no filter set
    }
    
    const zones: Record<string, string[]> = NIGERIAN_ZONES;
    const isZone = !!zones[globalStateFilter]; // Check if the filter is a zone name

    if (isZone) {
      const statesInZone = new Set(zones[globalStateFilter].map(s => s.toLowerCase()));
      return globallyFilteredAssets.filter(asset => {
        const assetLocation = (asset.location || "").trim().toLowerCase();
        for (const state of statesInZone) {
            if (assetLocation.includes(state)) return true;
        }
        return false;
      });
    } else {
      const lowerCaseFilter = globalStateFilter.toLowerCase().trim();
      return globallyFilteredAssets.filter(asset => {
        const assetLocation = (asset.location || "").trim().toLowerCase();
        return assetLocation.includes(lowerCaseFilter);
      });
    }
  }, [globallyFilteredAssets, globalStateFilter]);
  
  useEffect(() => {
    const locations = new Set<string>();
    stateFilteredAssets.forEach(asset => {
      const normalized = normalizeAssetLocation(asset.location);
      if (normalized) {
        locations.add(normalized);
      }
    });
    setLocationOptions(Array.from(locations).map(l => ({ label: l, value: l })).sort((a, b) => a.label.localeCompare(b.label)));

    const assigneeMap = new Map<string, string>();
    stateFilteredAssets.forEach(asset => {
      if (asset.assignee) {
        const assigneeName = asset.assignee.trim();
        if (assigneeName) {
            const lowerCaseName = assigneeName.toLowerCase();
            if (!assigneeMap.has(lowerCaseName)) {
                assigneeMap.set(lowerCaseName, assigneeName);
            }
        }
      }
    });
    setAssigneeOptions(Array.from(assigneeMap.values()).map(a => ({ label: a, value: a })).sort((a,b) => a.label.localeCompare(b.label)));
  }, [stateFilteredAssets, setLocationOptions, setAssigneeOptions]);


  const sortAssets = (assetsToSort: Asset[], config: SortConfig | null): Asset[] => {
    if (!config) return assetsToSort;
    return [...assetsToSort].sort((a, b) => {
        const aVal = a[config.key] ?? '';
        const bVal = b[config.key] ?? '';
        if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
        return 0;
    });
  };

  const displayedAssets = useMemo(() => {
    let results = stateFilteredAssets;

    // Apply filters from filter sheet
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

    // Apply search term
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
  }, [stateFilteredAssets, searchTerm, selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter, sortConfig]);

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
    if (lockAssetList) {
      addNotification({ title: "Asset List Locked", description: "Adding new assets is disabled. This can be changed in settings by an admin.", variant: "destructive" });
      return;
    }
    setSelectedAsset(undefined);
    setIsFormReadOnly(false);
    setIsFormOpen(true);
  }, [lockAssetList]);
  
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

    if (lockAssetList) {
        addNotification({ title: "Deletion Disabled", description: "The asset list is locked and cannot be modified.", variant: "destructive" });
        setIsDeleteDialogOpen(false);
        return;
    }
    
    // Always update locally first for immediate UI feedback
    const currentAssets = await getLocalAssetsFromDb();
    const updatedAssets = currentAssets.filter(a => a.id !== assetToDelete.id);
    await saveAssets(updatedAssets);
    setAssets(updatedAssets);
    addNotification({ title: 'Deleted Locally', description: 'Asset will be removed from cloud on next sync.' });
    
    if (isOnline) {
        try {
            await deleteAsset(assetToDelete.id);
        } catch (e) {
            addNotification({ title: 'Sync Error', description: 'Could not delete asset from the cloud, it remains deleted locally.', variant: 'destructive' });
        }
    }
    
    setAssetToDelete(null);
    setIsDeleteDialogOpen(false);
  }

  const handleBatchDelete = async (idsToDelete: string[]) => {
    if (lockAssetList) {
        addNotification({ title: "Deletion Disabled", description: "The asset list is locked and cannot be modified.", variant: "destructive" });
        return;
    }
    
    setIsBatchDeleting(true);
    const assetsToDeleteCount = idsToDelete.length;
    
    // Update locally first for snappy UI
    let currentAssets = await getLocalAssetsFromDb();
    currentAssets = currentAssets.filter(a => !idsToDelete.includes(a.id));
    await saveAssets(currentAssets);
    setAssets(currentAssets);
    addNotification({ title: 'Deleted Locally', description: `${assetsToDeleteCount} assets deleted. Will sync on next connection.` });

    if (isOnline) {
        try {
            await batchDeleteAssets(idsToDelete);
        } catch (e) {
            addNotification({ title: 'Error', description: 'Could not delete all selected assets from the cloud. They remain deleted locally.', variant: 'destructive' });
        }
    }
    
    setSelectedAssetIds([]);
    setSelectedCategories([]);
    setIsBatchDeleting(false);
  }

  const handleBatchEdit = () => setIsBatchEditOpen(true);
  
  const handleSaveBatchEdit = async (data: BatchUpdateData) => {
    const assetsToUpdateCount = selectedAssetIds.length;
    addNotification({ title: 'Batch Updating...', description: `Applying changes to ${assetsToUpdateCount} assets.` });

    const assetsToUpdate = assets.filter(asset => selectedAssetIds.includes(asset.id));
    const updatedAssets = assetsToUpdate.map(asset => {
        const updatedAsset: Asset = { 
            ...asset, 
            ...data, 
            lastModified: new Date().toISOString(),
            lastModifiedBy: userProfile?.displayName,
            lastModifiedByState: userProfile?.state,
            syncStatus: 'local',
        };
        if (data.verifiedStatus === 'Verified' && !asset.verifiedDate) {
            updatedAsset.verifiedDate = new Date().toLocaleDateString("en-CA");
        } else if (data.verifiedStatus && data.verifiedStatus !== 'Verified') {
            updatedAsset.verifiedDate = '';
        }
        return updatedAsset;
    });

    let currentAssets = await getLocalAssetsFromDb();
    const updatedAssetMap = new Map(updatedAssets.map(a => [a.id, a]));
    currentAssets = currentAssets.map(asset => updatedAssetMap.get(asset.id) || asset);
    await saveAssets(currentAssets);
    setAssets(currentAssets);
    
    addNotification({ title: 'Updated Locally', description: `Updated ${assetsToUpdateCount} assets. Sync when ready.` });
    
    setSelectedAssetIds([]);
  };

  const handleSaveAsset = async (assetToSave: Asset) => {
    const finalAsset: Asset = { 
      ...assetToSave, 
      lastModified: new Date().toISOString(),
      lastModifiedBy: userProfile?.displayName,
      lastModifiedByState: userProfile?.state,
      syncStatus: 'local',
    };
    
    const currentAssets = await getLocalAssetsFromDb();
    const existingIndex = currentAssets.findIndex(a => a.id === finalAsset.id);
    if (existingIndex > -1) {
        currentAssets[existingIndex] = finalAsset;
    } else {
        currentAssets.unshift(finalAsset);
    }
    await saveAssets(currentAssets);
    setAssets(currentAssets);
    addNotification({ title: 'Saved Locally', description: 'Changes saved. Sync when ready.' });
    setIsFormOpen(false);
  };

  const handleQuickSaveAsset = async (assetId: string, data: { remarks?: string; verifiedStatus?: 'Verified' | 'Unverified' | 'Discrepancy', verifiedDate?: string }) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    const updatedAsset: Asset = { 
        ...asset, 
        ...data, 
        lastModified: new Date().toISOString(),
        lastModifiedBy: userProfile?.displayName,
        lastModifiedByState: userProfile?.state,
        syncStatus: 'local',
    };

    const currentAssets = await getLocalAssetsFromDb();
    const existingIndex = currentAssets.findIndex(a => a.id === assetId);
    if (existingIndex > -1) {
        currentAssets[existingIndex] = updatedAsset;
        await saveAssets(currentAssets);
        setAssets(currentAssets);
    }
  };

  const handleImportClick = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    addNotification({ title: "Parsing file...", description: "Please wait while we process your Excel file." });
    
    const baseAssets = await getLocalAssetsFromDb();

    const { assets: newAssets, updatedAssets, skipped, errors } = await parseExcelFile(file, enabledSheets, baseAssets, lockAssetList);
    
    errors.forEach(error => addNotification({ title: "Import Error", description: error, variant: "destructive" }));
    if (skipped > 0) {
        const message = lockAssetList 
          ? `${skipped} assets were skipped because they are not in the master list.`
          : `${skipped} assets were skipped due to missing data.`;
        addNotification({ title: "Import Notice", description: message });
    }

    const allChanges = [...newAssets, ...updatedAssets].map(asset => ({
        ...asset,
        lastModified: new Date().toISOString(),
        lastModifiedBy: userProfile?.displayName,
        lastModifiedByState: userProfile?.state,
        syncStatus: 'local' as const, // Mark all imported/updated as 'local'
    }));

    if (allChanges.length > 0) {
        const assetMap = new Map(baseAssets.map(a => [a.id, a]));
        allChanges.forEach(a => assetMap.set(a.id, a));
        const combinedAssets = Array.from(assetMap.values());
        
        await saveAssets(combinedAssets);
        setAssets(combinedAssets);

        addNotification({ title: 'Imported Locally', description: `${allChanges.length} changes saved. Sync when you go online.` });

    } else if (errors.length === 0) {
        addNotification({ title: "No Changes Detected", description: "No new or updated assets were found in the file."});
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsImporting(false);
  };
  
  const handleExportClick = useCallback(() => {
    let assetsToExport: Asset[];
    let exportPrefix: string;

    const isAdminUser = userProfile?.displayName?.trim().toLowerCase() === 'admin';
    const basePrefix = isAdminUser ? 'admin' : userProfile?.state || 'assets';
    
    if (view === 'dashboard' && selectedCategories.length > 0) {
      assetsToExport = assets.filter(a => selectedCategories.includes(a.category));
      exportPrefix = `${basePrefix}-${selectedCategories.join('_')}`;
    } else if (view === 'table' && currentCategory) {
      assetsToExport = categoryFilteredAssets;
      exportPrefix = `${basePrefix}-${currentCategory}`;
    } else {
      assetsToExport = displayedAssets;
      exportPrefix = basePrefix;
    }
  
    if (assetsToExport.length === 0) {
      addNotification({ title: "No Data to Export", description: "There are no assets in the current view to export." });
      return;
    }
    
    try {
      const fileName = `${exportPrefix}-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      exportToExcel(assetsToExport, fileName);
      addNotification({ title: "Export Successful" });
    } catch(error) {
      console.error("Export Error:", error);
      addNotification({ title: "Export Failed", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
    }
  }, [view, categoryFilteredAssets, displayedAssets, userProfile, currentCategory, selectedCategories, assets]);
  
  const handleSelectAll = (checked: boolean, allFilteredAssets: Asset[]) => {
    if (checked) {
      setSelectedAssetIds(allFilteredAssets.map(a => a.id));
    } else {
      setSelectedAssetIds([]);
    }
  };

  const handleSelectSingle = (assetId: string, checked: boolean) => {
    setSelectedAssetIds(prev => checked ? [...prev, assetId] : prev.filter(id => id !== assetId));
  };

  const handleClearAllAssets = useCallback(async () => {
    setIsClearAllDialogOpen(false);
    
    // Offline Mode: Clear local storage only
    if (!isOnline) {
        addNotification({ title: 'Clearing Local Assets...', description: 'Removing all assets from your device.' });
        await clearLocalAssets();
        setAssets([]);
        setSelectedAssetIds([]);
        setSelectedCategories([]);
        addNotification({ title: 'Local Data Cleared', description: 'All assets have been removed from this device.' });
        return;
    }

    // Online Mode: Admin clears everything
    if (isOnline && isAdmin) {
        addNotification({ title: 'Clearing Database...', description: `This will remove all assets.` });
        try {
            const allAssetsInCloud = await getAssets();
            if (allAssetsInCloud.length > 0) {
                const idsToDelete = allAssetsInCloud.map((a) => a.id);
                await batchDeleteAssets(idsToDelete);
            }
            // Also clear locally to ensure consistency
            await clearLocalAssets();
            setAssets([]);
            setSelectedAssetIds([]);
            setSelectedCategories([]);
            addNotification({ title: 'All Assets Cleared', description: 'The application is now in a clean state.' });
        } catch (e) {
            addNotification({ title: 'Error', description: 'Could not clear all assets from the database.', variant: 'destructive' });
        }
    }
  }, [isOnline, isAdmin]);

  const handleClearAllClick = useCallback(() => setIsClearAllDialogOpen(true), []);
  
  useEffect(() => {
    setDataActions({
        onImport: handleImportClick,
        onExport: handleExportClick,
        onAddAsset: handleAddAsset,
        onClearAll: handleClearAllClick,
        isImporting: isImporting,
        isAdmin: isAdmin,
        hasAssets: assets.length > 0
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
      assets.length
  ]);

  const clearAllDialogDescription = useMemo(() => {
    if (!isOnline) {
        return "This action cannot be undone. This will permanently delete all asset records from your local device storage.";
    }
    // Online case is always admin, since button is disabled for others
    return `You are in Admin Mode. This action cannot be undone. This will permanently delete ALL asset records from both the central database and your local device, resetting the application for ALL users.`;
  }, [isOnline]);

  const locationCounts = useMemo(() => {
    if (!isAdmin) return {};

    const counts: { [key: string]: { total: number; verified: number } } = {};

    const allLocations = [...NIGERIAN_STATES, ...ZONE_NAMES, ...SPECIAL_LOCATIONS];

    allLocations.forEach(loc => {
      counts[loc] = { total: 0, verified: 0 };
    });

    globallyFilteredAssets.forEach(asset => {
      const isVerified = asset.verifiedStatus === 'Verified';
      const assetLocationLower = (asset.location || '').toLowerCase();

      // Count for States
      const assetState = NIGERIAN_STATES.find(state => assetLocationLower.includes(state.toLowerCase()));
      if (assetState) {
        counts[assetState].total++;
        if (isVerified) counts[assetState].verified++;
      }

      // Count for Zones
      for (const zone in NIGERIAN_ZONES) {
        if (assetLocationLower.includes(zone.toLowerCase())) {
          counts[zone].total++;
          if (isVerified) counts[zone].verified++;
        }
      }

      // Count for Special Locations
      const assetSpecialLoc = SPECIAL_LOCATIONS.find(loc => assetLocationLower.includes(loc.toLowerCase()));
      if (assetSpecialLoc) {
        counts[assetSpecialLoc].total++;
        if (isVerified) counts[assetSpecialLoc].verified++;
      }
    });

    return counts;
  }, [isAdmin, globallyFilteredAssets]);

  const handleSelectCategory = (category: string, checked: boolean) => {
    setSelectedCategories(prev => {
        const newSelection = checked ? [...prev, category] : prev.filter(c => c !== category);
        return newSelection;
    });
  };

  const handleBatchDeleteCategories = () => {
    if (selectedCategories.length === 0) return;
    const idsToDelete = assets.filter(a => selectedCategories.includes(a.category)).map(a => a.id);
    handleBatchDelete(idsToDelete);
  };


  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  // DASHBOARD VIEW
  if (view === 'dashboard') {
    const totalStateAssets = displayedAssets.length;
    const verifiedStateAssets = displayedAssets.filter(asset => asset.verifiedStatus === 'Verified').length;
    const verificationPercentage = totalStateAssets > 0 ? (verifiedStateAssets / totalStateAssets) * 100 : 0;
    const isFiltered = searchTerm || selectedLocations.length > 0 || selectedAssignees.length > 0 || selectedStatuses.length > 0 || missingFieldFilter;
    
    const overallTotal = globallyFilteredAssets.length;
    const overallVerified = globallyFilteredAssets.filter(asset => asset.verifiedStatus === 'Verified').length;


    return (
      <div className="flex flex-col h-full gap-4">
        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".xlsx, .xls" className="hidden" />
        <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight flex-1">
                {isFiltered ? `Filter Results` : (selectedCategories.length > 0 ? `${selectedCategories.length} Categories Selected` : 'Asset Dashboard')}
            </h2>
             {selectedCategories.length > 0 && (
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportClick} disabled={isBatchDeleting}>
                        <FileDown className="mr-2 h-4 w-4" /> Export
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleBatchDeleteCategories} disabled={isBatchDeleting}>
                        {isBatchDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Delete
                    </Button>
                </div>
            )}
        </div>
        <Card>
             <CardHeader>
                <CardTitle>
                    {isAdmin && !isFiltered ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold tracking-tight">Asset Verification Status for</span>
                        <Select
                            value={globalStateFilter || 'all'}
                            onValueChange={(value) => setGlobalStateFilter(value === 'all' ? '' : value)}
                        >
                        <SelectTrigger className="w-full sm:w-auto min-w-[280px]">
                            <SelectValue placeholder="Select a location..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                <div>
                                    <p>Overall (All Assets)</p>
                                    <p className="text-xs text-muted-foreground">{overallVerified} of {overallTotal} verified</p>
                                </div>
                            </SelectItem>
                            <SelectSeparator />
                            <SelectGroup>
                                <SelectLabel>Special Locations</SelectLabel>
                                {SPECIAL_LOCATIONS.map((loc) => (
                                    <SelectItem key={loc} value={loc}>
                                        <div>
                                            <p>{loc}</p>
                                            <p className="text-xs text-muted-foreground">{(locationCounts[loc]?.verified || 0)} of {(locationCounts[loc]?.total || 0)} verified</p>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                            <SelectSeparator />
                            <SelectGroup>
                                <SelectLabel>Geopolitical Zones</SelectLabel>
                                {ZONE_NAMES.map((zone) => (
                                    <SelectItem key={zone} value={zone}>
                                        <div>
                                            <p>{zone}</p>
                                            <p className="text-xs text-muted-foreground">{(locationCounts[zone]?.verified || 0)} of {(locationCounts[zone]?.total || 0)} verified</p>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                            <SelectSeparator />
                            <SelectGroup>
                                <SelectLabel>States</SelectLabel>
                                {NIGERIAN_STATES.map((state) => (
                                    <SelectItem key={state} value={state}>
                                       <div>
                                            <p>{state}</p>
                                            <p className="text-xs text-muted-foreground">{(locationCounts[state]?.verified || 0)} of {(locationCounts[state]?.total || 0)} verified</p>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                        </Select>
                    </div>
                    ) : (
                    <>
                        {globalStateFilter && !isFiltered
                        ? `Asset Verification Status for ${globalStateFilter}`
                        : `Overall Asset Verification Status`
                        }
                    </>
                    )}
                </CardTitle>
            </CardHeader>
             <CardContent className="pt-2 space-y-2">
                <Progress value={verificationPercentage} aria-label={`${verificationPercentage.toFixed(0)}% verified`} />
                <p className="text-sm text-muted-foreground">
                    <span className="font-bold text-foreground">{verifiedStateAssets}</span> of <span className="font-bold text-foreground">{totalStateAssets}</span> assets verified.
                    {isFiltered && ` (across ${Object.keys(assetsByCategory).length} categories)`}
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
                        <Card 
                            key={category} 
                            className={cn(
                                "hover:shadow-md transition-shadow flex flex-col cursor-pointer",
                                isSelected && "ring-2 ring-primary"
                            )}
                            onClick={() => handleSelectCategory(category, !isSelected)}
                        >
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{category}</CardTitle>
                                <Checkbox 
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                        handleSelectCategory(category, checked as boolean);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={`Select category ${category}`}
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
                              <Button variant="link" className="p-0 h-auto" onClick={(e) => { e.stopPropagation(); setView('table'); setCurrentCategory(category); }}>View Assets</Button>
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
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const areAllCategoryResultsSelected = categoryFilteredAssets.length > 0 && categoryFilteredAssets.every(a => selectedAssetIds.includes(a.id));

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
                     {selectedAssetIds.length === 1 && (
                        <Button variant="outline" size="sm" onClick={() => handleEditAsset(assets.find(a => a.id === selectedAssetIds[0])!)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                    )}
                    {selectedAssetIds.length > 0 && (
                        <Button variant="outline" size="sm" onClick={handleBatchEdit}>
                            <ClipboardEdit className="mr-2 h-4 w-4" /> Batch Edit
                        </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={() => handleBatchDelete(selectedAssetIds)} disabled={isBatchDeleting}>
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
                          />
                      </TableHead>
                      <TableHead>S/N</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Asset ID</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Verified Status</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead className="w-[50px] text-right">Actions</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {paginatedCategoryAssets.length > 0 ? (
                      paginatedCategoryAssets.map((asset) => (
                          <TableRow key={asset.id} data-state={selectedAssetIds.includes(asset.id) ? "selected" : ""} onClick={() => handleViewAsset(asset)} className="cursor-pointer">
                          <TableCell onClick={e => e.stopPropagation()}>
                              <Checkbox 
                                  checked={selectedAssetIds.includes(asset.id)}
                                  onCheckedChange={(checked) => handleSelectSingle(asset.id, checked as boolean)}
                                  aria-label={`Select asset ${asset.description}`}
                              />
                          </TableCell>
                          <TableCell>{asset.sn || 'N/A'}</TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                                <span>{asset.description}</span>
                                {(asset.syncStatus === 'local' || asset.syncStatus === 'syncing') && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                {asset.syncStatus === 'syncing' 
                                                    ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                    : <CloudOff className="h-4 w-4 text-blue-500" />
                                                }
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{asset.syncStatus === 'syncing' ? 'Syncing...' : 'Changes pending sync'}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                          </TableCell>
                          <TableCell>{asset.assetIdCode || 'N/A'}</TableCell>
                          <TableCell>{asset.assignee || 'N/A'}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={asset.verifiedStatus || "Unverified"}
                              onValueChange={async (status) => {
                                const verifiedDate =
                                  status === "Verified"
                                    ? new Date().toLocaleDateString("en-CA")
                                    : "";
                                await handleQuickSaveAsset(asset.id, {
                                  verifiedStatus: status as any,
                                  verifiedDate,
                                });
                                addNotification({
                                  title: "Status Updated",
                                  description: `Asset status changed to ${status}.`,
                                });
                              }}
                            >
                              <SelectTrigger className={cn("w-[150px] h-9 text-sm", getStatusClasses(asset.verifiedStatus || 'Unverified'))}>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Unverified">
                                  <div className="flex items-center">
                                    <FileText className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" />
                                    Unverified
                                  </div>
                                </SelectItem>
                                <SelectItem value="Verified">
                                  <div className="flex items-center">
                                    <Check className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                                    Verified
                                  </div>
                                </SelectItem>
                                <SelectItem value="Discrepancy">
                                  <div className="flex items-center">
                                    <AlertCircle className="mr-2 h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                    Discrepancy
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>{asset.lastModified ? new Date(asset.lastModified).toLocaleString() : 'N/A'}</TableCell>
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                              <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditAsset(asset); }}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setAssetToDelete(asset); setIsDeleteDialogOpen(true); }} className="text-destructive focus:bg-destructive/20">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                  </DropdownMenuItem>
                              </DropdownMenuContent>
                              </DropdownMenu>
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
                    totalPages={Math.ceil(categoryFilteredAssets.length / ITEMS_PER_PAGE)}
                    onPageChange={setCurrentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
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
                        from your {isOnline ? 'online database' : 'local storage'}.
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

