"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
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
  MoreVertical,
  ShieldQuestion,
  ChevronsUpDown,
  RotateCcw,
  MapPin,
  ListFilter,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import type { Asset, AppSettings, SheetDefinition, DisplayField } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/excel-parser";
import { NIGERIAN_ZONES, NIGERIAN_STATES, ZONAL_STORES, SPECIAL_LOCATIONS, NIGERIAN_STATE_CAPITALS, ASSET_CONDITIONS } from "@/lib/constants";
import { useAppState, type SortConfig } from "@/contexts/app-state-context";
import { useAuth } from "@/contexts/auth-context";
import { PaginationControls } from "./pagination-controls";
import { getAssets, batchSetAssets, clearAssets as clearFirestoreAssets, updateSettings as updateSettingsFS } from "@/lib/firestore";
import { getAssets as getAssetsRTDB, batchSetAssets as batchSetAssetsRTDB, clearAssets as clearRtdbAssets } from "@/lib/database";
import { getLocalAssets as getLocalAssetsFromDb, saveAssets, clearLocalAssets, getLockedOfflineAssets, saveLockedOfflineAssets, saveLocalSettings } from "@/lib/idb";
import { cn, normalizeAssetLocation, getStatusClasses, assetMatchesGlobalFilter, sanitizeInput, sanitizeForFirestore } from "@/lib/utils";
import { addNotification } from "@/hooks/use-notifications";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { isToday, isThisWeek, parseISO } from 'date-fns';
import { Badge } from "./ui/badge";
import { motion } from "framer-motion";
import { isAllowed, getRemainingCooldown } from "@/lib/rate-limit";
import { enqueueOp } from "@/lib/offline-queue";
import { monitoring } from "@/lib/monitoring";

// Robust loading for dialogs to prevent ChunkLoadErrors
const AssetForm = dynamic(() => import("./asset-form").then(mod => mod.AssetForm), { ssr: false });
const AssetBatchEditForm = dynamic(() => import("./asset-batch-edit-form").then(mod => mod.AssetBatchEditForm), { ssr: false });
const CategoryBatchEditForm = dynamic(() => import("./category-batch-edit-form").then(mod => mod.CategoryBatchEditForm), { ssr: false });
const ImportScannerDialog = dynamic(() => import("./single-sheet-import-dialog").then(mod => mod.ImportScannerDialog), { ssr: false });
const TravelReportDialog = dynamic(() => import("./travel-report-dialog").then(mod => mod.TravelReportDialog), { ssr: false });
const SyncConfirmationDialog = dynamic(() => import("./sync-confirmation-dialog").then(mod => mod.SyncConfirmationDialog), { ssr: false });
const ColumnCustomizationSheet = dynamic(() => import("./column-customization-sheet").then(mod => mod.ColumnCustomizationSheet), { ssr: false });
const AssetSummaryDashboard = dynamic(() => import("./asset-summary-dashboard").then(mod => mod.AssetSummaryDashboard), { ssr: false });

const haveAssetDetailsChanged = (a: Partial<Asset>, b: Partial<Asset>): boolean => {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Asset>;
    const ignoredKeys = new Set(['id', 'syncStatus', 'lastModified', 'lastModifiedBy', 'lastModifiedByState', 'previousState']);
    for (const key of keys) {
        if (ignoredKeys.has(key)) continue;
        if (typeof a[key] === 'object' || typeof b[key] === 'object') {
            if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) return true;
            continue;
        }
        if (String(a[key] ?? '').trim() !== String(b[key] ?? '').trim()) return true;
    }
    return false;
};

const AssetItemCard = React.memo(({ 
    asset, 
    isSelected, 
    onSelect, 
    onView, 
    onEdit, 
    onDelete, 
    onQuickSave,
    quickViewFields,
    appMode,
    isGuest,
    isAdmin 
}: { 
    asset: Asset, 
    isSelected: boolean, 
    onSelect: (id: string, checked: boolean) => void,
    onView: (asset: Asset) => void,
    onEdit: (asset: Asset) => void,
    onDelete: (asset: Asset) => void,
    onQuickSave: (id: string, data: any) => Promise<void>,
    quickViewFields: DisplayField[],
    appMode: string,
    isGuest: boolean,
    isAdmin: boolean
}) => {
    return (
        <Card
            data-state={isSelected ? 'selected' : ''}
            className="data-[state=selected]:ring-2 data-[state=selected]:ring-primary transition-all duration-300 hover:shadow-lg flex flex-col overflow-hidden border-primary/5 shadow-sm"
        >
            <CardHeader className="flex flex-row items-center space-x-4 p-4 bg-muted/10 border-b border-dashed">
                <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onCheckedChange={(checked) => onSelect(asset.id, checked as boolean)} disabled={isGuest} />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onView(asset)}>
                    <CardTitle className="text-sm font-bold truncate leading-tight">{asset.description || 'Untitled Asset'}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest truncate mt-0.5">
                        {asset.syncStatus === 'local' && <CloudOff className="h-3 w-3 text-primary animate-pulse" />}
                        {asset.assetIdCode || asset.sn || 'No ID'}
                        {asset.approvalStatus === 'pending' && <Badge variant="outline" className="ml-1 bg-yellow-100 text-yellow-800 border-yellow-200 text-[8px] h-4">Pending Approval</Badge>}
                    </CardDescription>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled={isGuest}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 shadow-2xl border-primary/10">
                        <DropdownMenuItem onClick={() => onView(asset)} className="h-9"><FolderSearch className="mr-2 h-4 w-4" /> Open Dashboard</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(asset)} disabled={isGuest} className="h-9"><Edit className="mr-2 h-4 w-4" /> Fast Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete(asset)} className="h-9 text-destructive focus:bg-destructive/10 focus:text-destructive" disabled={!isAdmin}><Trash2 className="mr-2 h-4 w-4" /> Remove Record</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="p-4 pt-4 flex-grow cursor-pointer" onClick={() => onView(asset)}>
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
                {appMode === 'verification' && (
                <div className="mt-4 pt-4 border-t border-dashed space-y-3" onClick={e => e.stopPropagation()}>
                    <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground/60 flex items-center gap-1">
                            <Check className="h-2 w-2"/> Verification Status
                        </Label>
                        <Select value={asset.verifiedStatus || 'Unverified'} onValueChange={async (s) => {
                                await onQuickSave(asset.id, { verifiedStatus: s as any, verifiedDate: s === "Verified" ? new Date().toLocaleDateString("en-CA") : "", remarks: asset.remarks, condition: asset.condition });
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
                    <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground/60 flex items-center gap-1">
                            <ShieldQuestion className="h-2 w-2"/> Condition
                        </Label>
                        <Select value={asset.condition || ''} onValueChange={async (c) => {
                                await onQuickSave(asset.id, { verifiedStatus: asset.verifiedStatus, remarks: asset.remarks, condition: c });
                                addNotification({ title: "Condition Updated", description: `Set to ${c}` });
                        }}>
                            <SelectTrigger className="h-8 text-[10px] font-bold bg-muted/50 border-none shadow-inner rounded-lg">
                            <SelectValue placeholder="Condition..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {ASSET_CONDITIONS.map(cond => (
                                    <SelectItem key={cond} value={cond} className="text-[10px] font-bold">{cond}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                )}
            </CardContent>
        </Card>
    );
});
AssetItemCard.displayName = 'AssetItemCard';

const ScopeItem = ({ 
    locationName, 
    allAssets, 
    isSelected, 
    onToggle 
}: { 
    locationName: string; 
    allAssets: Asset[]; 
    isSelected: boolean; 
    onToggle: (name: string) => void 
}) => {
    const total = useMemo(() => {
        if (locationName === 'All') return allAssets.length;
        return allAssets.filter(a => assetMatchesGlobalFilter(a, locationName)).length;
    }, [locationName, allAssets]);

    return (
        <div 
            className={cn(
                "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all",
                isSelected ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
            )}
            onClick={() => onToggle(locationName)}
        >
            <div className="flex items-center gap-2">
                <Checkbox checked={isSelected} onCheckedChange={() => onToggle(locationName)} />
                <span className="text-sm">{locationName}</span>
            </div>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{total}</Badge>
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
  const [syncSummary, setSyncSummary] = useState<any | null>(null);
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);
  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [sheetToEdit, setSheetToEdit] = useState<SheetDefinition | null>(null);
  const [originalSheetNameToEdit, setOriginalSheetNameToEdit] = useState<string | null>(null);
  const [isDownloadWarningOpen, setIsDownloadWarningOpen] = useState(false);
  const [numUnsynced, setNumUnsynced] = useState(0);
  const [scopeSort, setScopeSort] = useState<'alpha' | 'volume' | 'zone'>('zone');
  
  const {
    assets, setAssets, isOnline, setIsOnline, 
    offlineAssets, setOfflineAssets, dataSource, setDataSource,
    globalStateFilters, setGlobalStateFilters,
    itemsPerPage, setItemsPerPage,
    selectedLocations, setSelectedLocations,
    selectedAssignees, setSelectedAssignees,
    selectedStatuses, setSelectedStatuses,
    missingFieldFilter, setMissingFieldFilter,
    dateFilter, setDateFilter,
    setLocationOptions, setAssigneeOptions, setStatusOptions,
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

  const grant = useMemo(() => appSettings?.grants?.find(g => g.id === activeGrantId), [appSettings, activeGrantId]);
  const sheetDefinitions = useMemo(() => grant?.sheetDefinitions || {}, [grant]);
  const isAdmin = userProfile?.isAdmin || false;
  const isGuest = userProfile?.isGuest || false;
  const activeAssets = useMemo(() => dataSource === 'cloud' ? assets : offlineAssets, [dataSource, assets, offlineAssets]);

  // Project Isolation: Filter all assets by activeGrantId before anything else
  const scopedAssets = useMemo(() => {
      return activeAssets.filter(a => a.grantId === activeGrantId);
  }, [activeAssets, activeGrantId]);

  const allAssetsForFiltering = useMemo(() => {
    if (globalStateFilters.includes('All')) return scopedAssets;
    return scopedAssets.filter(asset => globalStateFilters.some(state => assetMatchesGlobalFilter(asset, state)));
  }, [scopedAssets, globalStateFilters]);

  // Regional Sorting Logic
  const sortedScopeOptions = useMemo(() => {
      const options = [...NIGERIAN_STATES];
      if (scopeSort === 'alpha') return options.sort();
      if (scopeSort === 'volume') {
          return options.sort((a, b) => {
              const countA = scopedAssets.filter(asset => assetMatchesGlobalFilter(asset, a)).length;
              const countB = scopedAssets.filter(asset => assetMatchesGlobalFilter(asset, b)).length;
              return countB - countA;
          });
      }
      return options; // Default by constant order (which is alpha anyway)
  }, [scopedAssets, scopeSort]);

  const handleToggleScope = (name: string) => {
      if (name === 'All') {
          setGlobalStateFilters(['All']);
          return;
      }
      setGlobalStateFilters(prev => {
          let next = prev.filter(s => s !== 'All');
          if (next.includes(name)) {
              next = next.filter(s => s !== name);
              if (next.length === 0) next = ['All'];
          } else {
              next.push(name);
          }
          return next;
      });
  };

  const resetScope = () => setGlobalStateFilters(['All']);

  // --- SYNC ENGINE ---
  const executeDownload = useCallback(async (summary: any, isFirstTime?: boolean) => {
    setIsSyncing(true);
    if (!isFirstTime) addNotification({ title: 'Syncing Project Data...' });
    try {
        const { newFromCloud, updatedFromCloud, deletedOnCloud } = summary;
        let localAssets = await getLocalAssetsFromDb();
        const mergedAssetsMap = new Map(localAssets.map(a => [a.id, a]));
        if (deletedOnCloud?.length > 0) deletedOnCloud.forEach((a: any) => mergedAssetsMap.delete(a.id));
        const assetsToProcess = [...newFromCloud, ...updatedFromCloud];
        assetsToProcess.forEach(a => mergedAssetsMap.set(a.id, { ...a, syncStatus: 'synced' }));
        const finalAssets = Array.from(mergedAssetsMap.values());
        await saveAssets(finalAssets);
        setAssets(finalAssets);
        if (!isFirstTime) addNotification({ title: 'Project Sync Successful', description: `${assetsToProcess.length} items updated.` });
    } catch (error) {
        monitoring.trackError(error, { component: 'AssetList', action: 'executeDownload' });
        if (isFirstTime) setFirstTimeSetupStatus('idle');
    } finally {
        setIsSyncing(false);
        setIsSyncConfirmOpen(false);
        setSyncSummary(null);
        if (isFirstTime) setFirstTimeSetupStatus('complete');
    }
  }, [setAssets, setIsSyncing, setFirstTimeSetupStatus]);

  const executeUpload = useCallback(async () => {
      if (!syncSummary || syncSummary.type !== 'upload') return;
      setIsSyncing(true);
      addNotification({ title: 'Uploading local changes...' });
      try {
          const { toUpload: assetsToPush } = syncSummary;
          const batchSet = activeDatabase === 'firestore' ? batchSetAssets : batchSetAssetsRTDB;
          await batchSet(assetsToPush);
          // Mirror to Backup
          if (activeDatabase === 'firestore') batchSetAssetsRTDB(assetsToPush).catch(() => {});
          else batchSetAssetsFS(assetsToPush).catch(() => {});
          
          const localAssets = await getLocalAssetsFromDb();
          const localMap = new Map(localAssets.map(a => [a.id, a]));
          assetsToPush.forEach(p => { if (localMap.has(p.id)) localMap.set(p.id, { ...localMap.get(p.id)!, syncStatus: 'synced' }); });
          const updatedLocalAssets = Array.from(localMap.values());
          await saveAssets(updatedLocalAssets);
          setAssets(updatedLocalAssets);
          addNotification({ title: 'Cloud Project Updated' });
      } catch (error: any) {
          monitoring.trackError(error, { component: 'AssetList', action: 'executeUpload' });
          addNotification({ title: "Upload Failed", variant: 'destructive' });
      } finally {
          setIsSyncing(false);
          setIsSyncConfirmOpen(false);
          setSyncSummary(null);
      }
  }, [syncSummary, setAssets, setIsSyncing, activeDatabase]);

  const handleDownloadScan = useCallback(async (isFirstTime = false) => {
    if (!isOnline || !authInitialized || isGuest) return;
    if (!isFirstTime && !isAllowed('sync-download', 5000)) return;
    setIsSyncing(true);
    try {
        const getCloudAssets = activeDatabase === 'firestore' ? getAssets : getAssetsRTDB;
        const allCloudAssets = await getCloudAssets(activeGrantId);
        const userAuthorizedStates = isAdmin ? ['All'] : (userProfile?.states || []);
        const cloudAssets = allCloudAssets.filter(a => {
            if (isAdmin) return true;
            return userAuthorizedStates.some(state => assetMatchesGlobalFilter(a, state));
        });
        const localAssets = await getLocalAssetsFromDb();
        const localAssetsMap = new Map(localAssets.map(a => [a.id, a]));
        const summary: any = { newFromCloud: [], updatedFromCloud: [], keptLocal: [], toUpload: [], deletedOnCloud: [], type: 'download' };
        cloudAssets.forEach(ca => {
            const la = localAssetsMap.get(ca.id);
            if (la) {
                if (la.syncStatus === 'local' && new Date(la.lastModified || 0) > new Date(ca.lastModified || 0)) summary.keptLocal.push(la);
                else if (haveAssetDetailsChanged(la, ca)) summary.updatedFromCloud.push(ca);
            } else summary.newFromCloud.push(ca);
        });
        if (summary.newFromCloud.length === 0 && summary.updatedFromCloud.length === 0) {
            if (isFirstTime) setFirstTimeSetupStatus('complete');
        } else {
            if (isFirstTime) await executeDownload(summary, true);
            else { setSyncSummary(summary); setIsSyncConfirmOpen(true); }
        }
    } catch (error) {
        setIsOnline(false);
    } finally { setIsSyncing(false); }
  }, [isOnline, authInitialized, isGuest, isAdmin, userProfile, setIsOnline, setIsSyncing, activeDatabase, activeGrantId, executeDownload, setFirstTimeSetupStatus]);

  useEffect(() => { if (manualDownloadTrigger > 0) handleDownloadScan(); }, [manualDownloadTrigger, handleDownloadScan]);
  useEffect(() => { if (manualUploadTrigger > 0) handleUploadScan(); }, [manualUploadTrigger, handleUploadScan]);

  const handleUploadScan = useCallback(async () => {
    if (!isOnline || isGuest) return;
    setIsSyncing(true);
    try {
        const localAssets = await getLocalAssetsFromDb();
        const assetsToPush = localAssets.filter(a => a.syncStatus === 'local' && a.grantId === activeGrantId);
        if (assetsToPush.length > 0) {
            setSyncSummary({ newFromCloud: [], updatedFromCloud: [], keptLocal: [], toUpload: assetsToPush, type: 'upload' });
            setIsSyncConfirmOpen(true);
        } else addNotification({ title: 'Project Fully Synced' });
    } finally { setIsSyncing(false); }
  }, [isOnline, isGuest, activeGrantId, setIsSyncing]);

  // --- FILTERS & DISPLAY ---
  const displayedAssets = useMemo(() => {
    let res = allAssetsForFiltering.filter(a => {
      const def = sheetDefinitions?.[a.category || ''];
      if (!def || def.isHidden) return false;
      if (userProfile?.loginName === 'admin') return true;
      const disabledFor = def.disabledFor || [];
      if (disabledFor.includes('all') && !userProfile?.isAdmin) return false;
      return true;
    });
    if (selectedLocations.length > 0) res = res.filter(a => selectedLocations.includes(normalizeAssetLocation(a.location)));
    if (selectedAssignees.length > 0) res = res.filter(a => a.assignee && selectedAssignees.includes(a.assignee.trim()));
    if (selectedStatuses.length > 0) res = res.filter(a => a.verifiedStatus && selectedStatuses.includes(a.verifiedStatus));
    if (conditionFilter.length > 0) res = res.filter(a => a.condition && conditionFilter.includes(a.condition));
    if (missingFieldFilter) res = res.filter(a => !a[missingFieldFilter as keyof Asset]);
    if (searchTerm) {
        const tokens = searchTerm.toLowerCase().split(' ').filter(t => t.length > 0);
        res = res.filter(a => {
            const h = Object.values(a).join(' ').toLowerCase();
            return tokens.every(t => h.includes(t));
        });
    }
    return [...res].sort((a, b) => {
        if (!sortConfig) return 0;
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        return sortConfig.direction === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [allAssetsForFiltering, searchTerm, selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter, conditionFilter, sheetDefinitions, userProfile, sortConfig]);

  const assetsByCategory = useMemo(() => {
    return displayedAssets.reduce((acc, a) => {
        const cat = a.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(a);
        return acc;
    }, {} as Record<string, Asset[]>);
  }, [displayedAssets]);

  const handleAddAsset = useCallback(() => {
    if (!userProfile?.canAddAssets && !isAdmin) return;
    setSelectedAsset(undefined);
    setIsFormReadOnly(false);
    setIsFormOpen(true);
  }, [isAdmin, userProfile]);

  const handleQuickSaveAsset = useCallback(async (assetId: string, data: any) => {
    const asset = scopedAssets.find(a => a.id === assetId);
    if (!asset) return;
    const up: Asset = sanitizeForFirestore({ ...asset, ...data, lastModified: new Date().toISOString(), lastModifiedBy: userProfile?.displayName, lastModifiedByState: userProfile?.states[0], syncStatus: 'local' });
    const current = await getLocalAssetsFromDb();
    const idx = current.findIndex(a => a.id === assetId);
    if (idx > -1) { current[idx] = up; await saveAssets(current); setAssets(current); }
  }, [scopedAssets, userProfile, setAssets]);

  useEffect(() => {
    setDataActions({ onAddAsset: handleAddAsset, onClearAll: () => setIsClearAllDialogOpen(true), onTravelReport: () => setIsTravelReportOpen(true), onScanAndImport: () => setIsImportScanOpen(true) });
    return () => setDataActions({});
  }, [setDataActions, handleAddAsset]);

  if (isLoading || !appSettings) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col h-full gap-6 max-w-full">
        <AssetSummaryDashboard />
        
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><TableProperties className="h-5 w-5 text-primary" /></div>
                <h2 className="text-xl font-bold tracking-tight">Active Project Assets</h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="h-10 rounded-xl border-primary/20 bg-background px-4 font-bold min-w-[200px] justify-between">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary"/>
                                <span>{globalStateFilters.includes('All') ? 'Overall Project Scope' : `${globalStateFilters.length} States Selected`}</span>
                            </div>
                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0 shadow-2xl border-primary/10 rounded-2xl overflow-hidden" align="start">
                        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Region Filter</span>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScopeSort(s => s === 'alpha' ? 'volume' : 'alpha')} title="Sort Scope">
                                    <ListFilter className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={resetScope} title="Reset Scope">
                                    <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                        <ScrollArea className="h-[350px]">
                            <div className="p-2 space-y-4">
                                <ScopeItem locationName="All" allAssets={scopedAssets} isSelected={globalStateFilters.includes('All')} onToggle={handleToggleScope} />
                                {ZONAL_STORES.map(zone => (
                                    <div key={zone} className="space-y-1">
                                        <div className="px-2 py-1 flex items-center justify-between text-[10px] font-black uppercase text-primary/60 tracking-widest">
                                            <span>{zone}</span>
                                            <Button variant="link" className="h-auto p-0 text-[10px]" onClick={() => {
                                                const states = NIGERIAN_ZONES[zone as keyof typeof NIGERIAN_ZONES];
                                                setGlobalStateFilters(prev => [...new Set([...prev.filter(s => s !== 'All'), ...states])]);
                                            }}>Mark Zone</Button>
                                        </div>
                                        {NIGERIAN_ZONES[zone as keyof typeof NIGERIAN_ZONES].filter(s => sortedScopeOptions.includes(s)).map(state => (
                                            <ScopeItem key={state} locationName={state} allAssets={scopedAssets} isSelected={globalStateFilters.includes(state)} onToggle={handleToggleScope} />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </PopoverContent>
                </Popover>
            </div>
        </div>

        {view === 'dashboard' ? (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {Object.keys(assetsByCategory).length > 0 ? (
                    Object.keys(assetsByCategory).map(cat => (
                        <Card key={cat} className="group hover:shadow-xl transition-all border-primary/10 overflow-hidden">
                            <CardHeader className="p-4 bg-muted/20 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold truncate tracking-tight">{cat}</CardTitle>
                                <Badge variant="outline" className="font-bold text-[10px]">{assetsByCategory[cat].length}</Badge>
                            </CardHeader>
                            <CardContent className="p-4 pt-6 space-y-4">
                                <div className="text-3xl font-black">{assetsByCategory[cat].length}</div>
                                {appSettings.appMode === 'verification' && (
                                    <Progress value={(assetsByCategory[cat].filter(a => a.verifiedStatus === 'Verified').length / assetsByCategory[cat].length) * 100} className="h-1.5" />
                                )}
                                <Button variant="outline" size="sm" className="w-full text-xs font-bold" onClick={() => { setView('table'); setCurrentCategory(cat); }}>View Records</Button>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-32 text-center opacity-50"><FolderSearch className="mx-auto h-12 w-12 mb-4"/><h3 className="text-xl font-bold">No assets found in active scope</h3></div>
                )}
            </div>
        ) : (
            <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-none bg-transparent">
                <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="icon" onClick={() => setView('dashboard')}><ArrowLeft /></Button>
                    <h2 className="text-2xl font-black">{currentCategory}</h2>
                </div>
                <ScrollArea className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-10">
                        {categoryFilteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(a => (
                            <AssetItemCard key={a.id} asset={a} isSelected={selectedAssetIds.includes(a.id)} onSelect={(id, c) => setSelectedAssetIds(prev => c ? [...prev, id] : prev.filter(i => i !== id))} onView={handleViewAsset} onEdit={handleEditAsset} onDelete={a => { setAssetToDelete(a); setIsDeleteDialogOpen(true); }} onQuickSave={handleQuickSaveAsset} quickViewFields={sheetDefinitions[currentCategory!]?.displayFields.filter(f => f.quickView) || []} appMode={appSettings.appMode} isGuest={isGuest} isAdmin={isAdmin} />
                        ))}
                    </div>
                </ScrollArea>
                <PaginationControls currentPage={currentPage} totalPages={Math.ceil(categoryFilteredAssets.length / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} totalItems={categoryFilteredAssets.length} />
            </Card>
        )}

        {isFormOpen && <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={selectedAsset} onSave={async (a) => {
            const up: Asset = { ...a, grantId: activeGrantId!, lastModified: new Date().toISOString(), syncStatus: 'local' };
            const current = await getLocalAssetsFromDb();
            const idx = current.findIndex(ex => ex.id === a.id);
            if (idx > -1) current[idx] = up; else current.unshift(up);
            await saveAssets(current); setAssets(current); setIsFormOpen(false);
        }} onQuickSave={handleQuickSaveAsset} isReadOnly={isFormReadOnly} defaultCategory={currentCategory || undefined} />}
        {isSyncConfirmOpen && <SyncConfirmationDialog isOpen={isSyncConfirmOpen} onOpenChange={setIsSyncConfirmOpen} onConfirm={() => syncSummary?.type === 'download' ? executeDownload(syncSummary) : executeUpload()} summary={syncSummary} />}
        {isTravelReportOpen && <TravelReportDialog isOpen={isTravelReportOpen} onOpenChange={setIsTravelReportOpen} />}
        {isImportScanOpen && <ImportScannerDialog isOpen={isImportScanOpen} onOpenChange={setIsImportScanOpen} />}
    </div>
  );
}
