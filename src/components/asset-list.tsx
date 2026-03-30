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
  CloudDownload,
  Layout,
  History
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/checkbox";
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
import { AssetSummaryDashboard } from "./asset-summary-dashboard";
import { Badge } from "./ui/badge";

const haveAssetDetailsChanged = (a: Partial<Asset>, b: Partial<Asset>): boolean => {
    const keys = Object.keys(b) as (keyof Asset)[];
    for (const key of keys) {
        if (['id', 'syncStatus', 'lastModified', 'lastModifiedBy', 'lastModifiedByState', 'approvalStatus', 'pendingChanges', 'changeSubmittedBy'].includes(key)) {
            continue;
        }
        const valA = String(a[key] ?? '').trim();
        const valB = String(b[key] ?? '').trim();
        if (valA !== valB) return true;
    }
    return false;
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
    assets, setAssets, isOnline, offlineAssets, setOfflineAssets, dataSource, setDataSource,
    globalStateFilter, setGlobalStateFilter,
    itemsPerPage, setItemsPerPage,
    selectedLocations, setSelectedLocations, selectedAssignees, setSelectedAssignees, selectedStatuses, setSelectedStatuses, missingFieldFilter, setMissingFieldFilter,
    setLocationOptions, setAssigneeOptions, statusOptions, setStatusOptions,
    sortConfig, setSortConfig,
    appSettings, setAppSettings,
    manualDownloadTrigger,
    manualUploadTrigger,
    isSyncing, setIsSyncing,
    searchTerm,
    assetToView, setAssetToView,
    setDataActions,
  } = useAppState();

  const { enabledSheets, lockAssetList, sheetDefinitions } = appSettings;
  const isAdmin = userProfile?.isAdmin || false;
  const isGuest = userProfile?.isGuest || false;
  const activeAssets = useMemo(() => dataSource === 'cloud' ? assets : offlineAssets, [dataSource, assets, offlineAssets]);

  const handleDownloadScan = useCallback(async () => {
    if (!isOnline || !authInitialized || isGuest) return;
    setIsSyncing(true);
    addNotification({ title: 'Scanning for cloud changes...' });
    try {
        const cloudAssets = await getAssets();
        const localAssets = await getLocalAssetsFromDb();
        const localAssetsMap = new Map(localAssets.map(a => [a.id, a]));
        const summary: SyncSummary = { newFromCloud: [], updatedFromCloud: [], keptLocal: [], toUpload: [], type: 'download' };
        for (const cloudAsset of cloudAssets) {
            const localAsset = localAssetsMap.get(cloudAsset.id);
            if (localAsset) {
                const cloudTimestamp = cloudAsset.lastModified ? new Date(cloudAsset.lastModified).getTime() : 0;
                const localTimestamp = localAsset.lastModified ? new Date(localAsset.lastModified).getTime() : 0;
                if (localAsset.syncStatus === 'local' && localTimestamp > cloudTimestamp) summary.keptLocal.push(localAsset);
                else if (haveAssetDetailsChanged(localAsset, cloudAsset)) summary.updatedFromCloud.push(cloudAsset);
            } else summary.newFromCloud.push(cloudAsset);
        }
        if (summary.newFromCloud.length === 0 && summary.updatedFromCloud.length === 0) addNotification({ title: 'Already Up-to-Date' });
        else { setSyncSummary(summary); setIsSyncConfirmOpen(true); }
    } catch (e) { addNotification({ title: "Scan Failed", variant: 'destructive' }); }
    finally { setIsSyncing(false); }
  }, [isOnline, authInitialized, isGuest, setIsSyncing]);

  const handleUploadScan = useCallback(async () => {
    if (!isOnline || !authInitialized || isGuest) return;
    setIsSyncing(true);
    try {
        const localAssets = await getLocalAssetsFromDb();
        const assetsToPush = localAssets.filter(a => a.syncStatus === 'local');
        if (assetsToPush.length > 0) { setSyncSummary({ newFromCloud: [], updatedFromCloud: [], keptLocal: [], toUpload: assetsToPush, type: 'upload' }); setIsSyncConfirmOpen(true); }
        else addNotification({ title: 'No Local Changes' });
    } catch (e) { addNotification({ title: "Upload Scan Failed", variant: 'destructive' }); }
    finally { setIsSyncing(false); }
  }, [isOnline, authInitialized, isGuest, setIsSyncing]);

  useEffect(() => { if (manualDownloadTrigger > 0) handleDownloadScan(); }, [manualDownloadTrigger, handleDownloadScan]);
  useEffect(() => { if (manualUploadTrigger > 0) handleUploadScan(); }, [manualUploadTrigger, handleUploadScan]);

  const displayedAssets = useMemo(() => {
    let results = activeAssets.filter(asset => enabledSheets.includes(asset.category));
    if (globalStateFilter !== 'All') results = results.filter(a => a.location === globalStateFilter);
    if (searchTerm) {
        const tokens = searchTerm.toLowerCase().split(' ');
        results = results.filter(a => tokens.every(t => JSON.stringify(a).toLowerCase().includes(t)));
    }
    return results;
  }, [activeAssets, enabledSheets, globalStateFilter, searchTerm]);

  const assetsByMajorSection = useMemo(() => {
    return displayedAssets.reduce((acc, asset) => {
        const section = asset.majorSection || 'Standard Register';
        if (!acc[section]) acc[section] = {};
        const cat = asset.category || 'Uncategorized';
        if (!acc[section][cat]) acc[section][cat] = [];
        acc[section][cat].push(asset);
        return acc;
    }, {} as Record<string, Record<string, Asset[]>>);
  }, [displayedAssets]);

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

  const handleSaveAsset = async (assetToSave: Asset) => {
    const current = await getLocalAssetsFromDb();
    const updated = current.some(a => a.id === assetToSave.id) ? current.map(a => a.id === assetToSave.id ? assetToSave : a) : [assetToSave, ...current];
    await saveAssets(updated);
    setAssets(updated);
    setIsFormOpen(false);
  };

  if (isLoading && !activeAssets.length) {
    useEffect(() => {
        getLocalAssetsFromDb().then(data => { setAssets(data); setIsLoading(false); });
    }, []);
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <AssetSummaryDashboard />
      
      {view === 'dashboard' ? (
        <div className="space-y-8">
          {Object.entries(assetsByMajorSection).sort((a,b) => a[0].localeCompare(b[0])).map(([section, categories]) => (
            <div key={section} className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-primary/10 rounded-lg"><Layout className="h-4 w-4 text-primary" /></div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">{section}</h3>
                    <Separator className="flex-1" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Object.entries(categories).map(([cat, catAssets]) => {
                        const total = catAssets.length;
                        const verified = catAssets.filter(a => a.verifiedStatus === 'Verified').length;
                        const percentage = Math.round((verified / total) * 100);
                        return (
                            <Card key={cat} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setView('table'); setCurrentCategory(cat); }}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold truncate">{cat}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="text-2xl font-black">{total}</div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                                            <span>Progress</span>
                                            <span>{percentage}%</span>
                                        </div>
                                        <Progress value={percentage} className="h-1" />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setView('dashboard')}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Sections</Button>
                <h2 className="text-lg font-black uppercase tracking-tight">{currentCategory}</h2>
            </div>
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Asset</TableHead>
                            <TableHead>Context/Batch</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayedAssets.filter(a => a.category === currentCategory).map(asset => (
                            <TableRow key={asset.id}>
                                <TableCell>
                                    <div className="font-bold">{asset.description}</div>
                                    <div className="text-[10px] font-mono text-muted-foreground">{asset.assetIdCode || asset.sn}</div>
                                </TableCell>
                                <TableCell>
                                    {asset.normalizedLabel ? (
                                        <Badge variant="secondary" className="text-[9px] uppercase font-bold">
                                            <History className="h-3 w-3 mr-1" /> {asset.normalizedLabel}
                                        </Badge>
                                    ) : <span className="text-muted-foreground text-xs italic">N/A</span>}
                                </TableCell>
                                <TableCell>
                                    <Badge className={cn("text-[10px] uppercase font-black", asset.verifiedStatus === 'Verified' ? "bg-green-500" : "bg-orange-500")}>
                                        {asset.verifiedStatus}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleViewAsset(asset)}><FolderSearch className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleEditAsset(asset)}><Edit className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
      )}

      <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={selectedAsset} onSave={handleSaveAsset} isReadOnly={isFormReadOnly} onQuickSave={async () => {}} />
      <SyncConfirmationDialog isOpen={isSyncConfirmOpen} onOpenChange={setIsSyncConfirmOpen} summary={syncSummary} onConfirm={() => {}} />
    </div>
  );
}
