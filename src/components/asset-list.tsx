"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import dynamic from 'next/dynamic';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/table";
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
  Loader2,
  Trash2,
  ArrowLeft,
  Edit,
  Check,
  FileText,
  FolderSearch,
  CloudUpload,
  PlusCircle,
  ScanSearch,
  CloudOff,
  MapPin,
  RefreshCw,
  ChevronRight,
  TableProperties,
  MoreVertical,
  ShieldQuestion,
  ChevronsUpDown,
  RotateCcw,
  ListFilter,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import type { Asset, DisplayField } from "@/lib/types";
import { NIGERIAN_STATES, ZONAL_STORES, ASSET_CONDITIONS, NIGERIAN_ZONES } from "@/lib/constants";
import { useAppState } from "@/contexts/app-state-context";
import { useAuth } from "@/contexts/auth-context";
import { getAssets as getAssetsFS, batchSetAssets as batchSetAssetsFS } from "@/lib/firestore";
import { getAssets as getAssetsRTDB, batchSetAssets as batchSetAssetsRTDB } from "@/lib/database";
import { getLocalAssets, saveAssets } from "@/lib/idb";
import { cn, normalizeAssetLocation, getStatusClasses, assetMatchesGlobalFilter, sanitizeForFirestore } from "@/lib/utils";
import { addNotification } from "@/hooks/use-notifications";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { PaginationControls } from "./pagination-controls";

// Dynamic Imports for dialogs
const AssetForm = dynamic(() => import("./asset-form").then(mod => mod.AssetForm), { ssr: false });
const ImportScannerDialog = dynamic(() => import("./single-sheet-import-dialog").then(mod => mod.ImportScannerDialog), { ssr: false });
const TravelReportDialog = dynamic(() => import("./travel-report-dialog").then(mod => mod.TravelReportDialog), { ssr: false });
const SyncConfirmationDialog = dynamic(() => import("./sync-confirmation-dialog").then(mod => mod.SyncConfirmationDialog), { ssr: false });
const AssetSummaryDashboard = dynamic(() => import("./asset-summary-dashboard").then(mod => mod.AssetSummaryDashboard), { ssr: false });

const haveAssetDetailsChanged = (a: Partial<Asset>, b: Partial<Asset>): boolean => {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Asset>;
    const metadata = new Set(['id', 'syncStatus', 'lastModified', 'lastModifiedBy', 'lastModifiedByState', 'previousState']);
    for (const key of keys) {
        if (metadata.has(key)) continue;
        if (String(a[key] ?? '') !== String(b[key] ?? '')) return true;
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
}) => (
    <Card className={cn("transition-all hover:shadow-lg flex flex-col overflow-hidden border-primary/5 shadow-sm", isSelected && "ring-2 ring-primary")}>
        <CardHeader className="flex flex-row items-center space-x-4 p-4 bg-muted/10 border-b border-dashed">
            <div onClick={e => e.stopPropagation()}><Checkbox checked={isSelected} onCheckedChange={(c) => onSelect(asset.id, c as boolean)} disabled={isGuest} /></div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onView(asset)}>
                <CardTitle className="text-sm font-bold truncate">{asset.description || 'Untitled Asset'}</CardTitle>
                <CardDescription className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                    {asset.syncStatus === 'local' && <CloudOff className="h-3 w-3 text-primary animate-pulse" />}
                    {asset.assetIdCode || asset.sn || 'No ID'}
                </CardDescription>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onView(asset)}><FolderSearch className="mr-2 h-4 w-4" /> Open Details</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(asset)} disabled={isGuest}><Edit className="mr-2 h-4 w-4" /> Fast Edit</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDelete(asset)} className="text-destructive focus:bg-destructive/10" disabled={!isAdmin}><Trash2 className="mr-2 h-4 w-4" /> Remove</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </CardHeader>
        <CardContent className="p-4 pt-4 flex-grow cursor-pointer" onClick={() => onView(asset)}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {quickViewFields.slice(0, 4).map(field => (
                    <div key={field.key} className="space-y-0.5 overflow-hidden">
                        <p className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-wider">{field.label}</p>
                        <p className="text-xs font-bold truncate">{String(asset[field.key] ?? 'N/A')}</p>
                    </div>
                ))}
            </div>
            {appMode === 'verification' && (
                <div className="mt-4 pt-4 border-t border-dashed space-y-3" onClick={e => e.stopPropagation()}>
                    <Select value={asset.verifiedStatus || 'Unverified'} onValueChange={async (s) => await onQuickSave(asset.id, { verifiedStatus: s as any })}>
                        <SelectTrigger className={cn("h-8 text-[10px] font-black uppercase", getStatusClasses(asset.verifiedStatus || 'Unverified'))}><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Unverified">Unverified</SelectItem><SelectItem value="Verified">Verified</SelectItem></SelectContent>
                    </Select>
                </div>
            )}
        </CardContent>
    </Card>
));
AssetItemCard.displayName = 'AssetItemCard';

export default function AssetList() {
  const { userProfile, authInitialized } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'table'>('dashboard');
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormReadOnly, setIsFormReadOnly] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [isImportScanOpen, setIsImportScanOpen] = useState(false);
  const [isTravelReportOpen, setIsTravelReportOpen] = useState(false);
  const [syncSummary, setSyncSummary] = useState<any | null>(null);
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);
  const [scopeSort, setScopeSort] = useState<'alpha' | 'volume' | 'zone'>('zone');
  const [currentPage, setCurrentPage] = useState(1);

  const {
    assets, setAssets, isOnline, offlineAssets, dataSource,
    globalStateFilters, setGlobalStateFilters,
    itemsPerPage, setItemsPerPage,
    selectedLocations, selectedAssignees, selectedStatuses, missingFieldFilter,
    setLocationOptions, setAssigneeOptions, setStatusOptions, setConditionOptions,
    sortConfig, setSortConfig,
    appSettings, manualDownloadTrigger, manualUploadTrigger,
    isSyncing, setIsSyncing, searchTerm, activeGrantId, activeDatabase,
    setDataActions
  } = useAppState();

  const grant = useMemo(() => appSettings?.grants?.find(g => g.id === activeGrantId), [appSettings, activeGrantId]);
  const sheetDefinitions = useMemo(() => grant?.sheetDefinitions || {}, [grant]);
  const isAdmin = userProfile?.isAdmin || false;
  const isGuest = userProfile?.isGuest || false;

  const scopedAssets = useMemo(() => {
      const active = dataSource === 'cloud' ? assets : offlineAssets;
      return active.filter(a => a.grantId === activeGrantId);
  }, [assets, offlineAssets, dataSource, activeGrantId]);

  const allAssetsForFiltering = useMemo(() => {
    if (globalStateFilters.includes('All')) return scopedAssets;
    return scopedAssets.filter(asset => globalStateFilters.some(state => assetMatchesGlobalFilter(asset, [state])));
  }, [scopedAssets, globalStateFilters]);

  // --- SYNC ENGINE ---
  const handleDownloadScan = useCallback(async () => {
    if (!isOnline || !authInitialized) return;
    setIsSyncing(true);
    try {
        const getCloud = activeDatabase === 'firestore' ? getAssetsFS : getAssetsRTDB;
        const cloudAssets = await getCloud(activeGrantId!);
        const local = await getLocalAssets();
        const localMap = new Map(local.map(a => [a.id, a]));

        const summary: any = { newFromCloud: [], updatedFromCloud: [], keptLocal: [], deletedOnCloud: [], type: 'download' };
        for (const ca of cloudAssets) {
            const la = localMap.get(ca.id);
            if (la) {
                if (la.syncStatus === 'local' && new Date(la.lastModified!) > new Date(ca.lastModified!)) summary.keptLocal.push(la);
                else if (haveAssetDetailsChanged(la, ca)) summary.updatedFromCloud.push(ca);
            } else summary.newFromCloud.push(ca);
        }
        setSyncSummary(summary);
        setIsSyncConfirmOpen(true);
    } finally { setIsSyncing(false); }
  }, [isOnline, authInitialized, activeDatabase, activeGrantId]);

  const handleUploadScan = useCallback(async () => {
    if (!isOnline || isGuest) return;
    setIsSyncing(true);
    try {
        const local = await getLocalAssets();
        const toPush = local.filter(a => a.syncStatus === 'local' && a.grantId === activeGrantId);
        if (toPush.length > 0) {
            setSyncSummary({ toUpload: toPush, type: 'upload' });
            setIsSyncConfirmOpen(true);
        } else addNotification({ title: 'System Synced' });
    } finally { setIsSyncing(false); }
  }, [isOnline, isGuest, activeGrantId]);

  useEffect(() => { if (manualDownloadTrigger > 0) handleDownloadScan(); }, [manualDownloadTrigger, handleDownloadScan]);
  useEffect(() => { if (manualUploadTrigger > 0) handleUploadScan(); }, [manualUploadTrigger, handleUploadScan]);

  const executeDownload = async () => {
    setIsSyncing(true);
    try {
        const { newFromCloud, updatedFromCloud } = syncSummary;
        let local = await getLocalAssets();
        const map = new Map(local.map(a => [a.id, a]));
        [...newFromCloud, ...updatedFromCloud].forEach(a => map.set(a.id, { ...a, syncStatus: 'synced' }));
        const final = Array.from(map.values());
        await saveAssets(final);
        setAssets(final);
        addNotification({ title: 'Download Successful' });
    } finally { setIsSyncing(false); setIsSyncConfirmOpen(false); }
  };

  const executeUpload = async () => {
    setIsSyncing(true);
    try {
        const { toUpload } = syncSummary;
        const push = activeDatabase === 'firestore' ? batchSetAssetsFS : batchSetAssetsRTDB;
        await push(toUpload);
        let local = await getLocalAssets();
        const updated = local.map(a => toUpload.some((u: any) => u.id === a.id) ? { ...a, syncStatus: 'synced' as const } : a);
        await saveAssets(updated);
        setAssets(updated);
        addNotification({ title: 'Upload Successful' });
    } finally { setIsSyncing(false); setIsSyncConfirmOpen(false); }
  };

  // --- FILTERS & DISPLAY ---
  const displayedAssets = useMemo(() => {
    let res = allAssetsForFiltering.filter(a => !sheetDefinitions[a.category]?.isHidden);
    if (selectedLocations.length > 0) res = res.filter(a => selectedLocations.includes(normalizeAssetLocation(a.location)));
    if (selectedStatuses.length > 0) res = res.filter(a => a.verifiedStatus && selectedStatuses.includes(a.verifiedStatus));
    if (searchTerm) {
        const token = searchTerm.toLowerCase();
        res = res.filter(a => Object.values(a).some(v => String(v).toLowerCase().includes(token)));
    }
    return res.sort((a, b) => {
        if (!sortConfig) return 0;
        const aVal = String(a[sortConfig.key] || '');
        const bVal = String(b[sortConfig.key] || '');
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [allAssetsForFiltering, searchTerm, selectedLocations, selectedStatuses, sortConfig, sheetDefinitions]);

  const assetsByCategory = useMemo(() => {
    return displayedAssets.reduce((acc, a) => {
        const cat = a.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(a);
        return acc;
    }, {} as Record<string, Asset[]>);
  }, [displayedAssets]);

  const categoryFilteredAssets = useMemo(() => {
    if (!currentCategory) return [];
    return displayedAssets.filter(a => a.category === currentCategory);
  }, [currentCategory, displayedAssets]);

  const handleAddAsset = useCallback(() => {
    if (!userProfile?.canAddAssets && !isAdmin) return;
    setSelectedAsset(undefined);
    setIsFormReadOnly(false);
    setIsFormOpen(true);
  }, [isAdmin, userProfile]);

  useEffect(() => {
    setDataActions({ onAddAsset: handleAddAsset, onScanAndImport: () => setIsImportScanOpen(true), onTravelReport: () => setIsTravelReportOpen(true) });
    return () => setDataActions({});
  }, [setDataActions, handleAddAsset]);

  useEffect(() => {
    if (authInitialized) setIsLoading(false);
  }, [authInitialized]);

  if (isLoading || !appSettings) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  const sortedScopeOptions = [...NIGERIAN_STATES].sort((a, b) => {
      if (scopeSort === 'alpha') return a.localeCompare(b);
      if (scopeSort === 'volume') {
          const countA = scopedAssets.filter(asset => assetMatchesGlobalFilter(asset, [a])).length;
          const countB = scopedAssets.filter(asset => assetMatchesGlobalFilter(asset, [b])).length;
          return countB - countA;
      }
      return 0;
  });

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
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0 shadow-2xl border-primary/10 rounded-2xl overflow-hidden" align="start">
                        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Region Filter</span>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScopeSort(s => s === 'alpha' ? 'volume' : 'alpha')} title="Sort Scope">
                                    <ListFilter className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setGlobalStateFilters(['All'])} title="Reset Scope">
                                    <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                        <ScrollArea className="h-[350px]">
                            <div className="p-2 space-y-4">
                                <div className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer" onClick={() => setGlobalStateFilters(['All'])}>
                                    <div className="flex items-center gap-2"><Checkbox checked={globalStateFilters.includes('All')} /><span className="text-sm">All Regions</span></div>
                                </div>
                                {ZONAL_STORES.map(zone => (
                                    <div key={zone} className="space-y-1">
                                        <div className="px-2 py-1 flex items-center justify-between text-[10px] font-black uppercase text-primary/60 tracking-widest">
                                            <span>{zone}</span>
                                            <Button variant="link" className="h-auto p-0 text-[10px]" onClick={() => setGlobalStateFilters(prev => [...new Set([...prev.filter(s => s !== 'All'), ...NIGERIAN_ZONES[zone]])])}>Mark Zone</Button>
                                        </div>
                                        {NIGERIAN_ZONES[zone].map(state => (
                                            <div key={state} className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer" onClick={() => {
                                                const next = globalStateFilters.filter(s => s !== 'All');
                                                setGlobalStateFilters(next.includes(state) ? (next.length === 1 ? ['All'] : next.filter(s => s !== state)) : [...next, state]);
                                            }}>
                                                <div className="flex items-center gap-2"><Checkbox checked={globalStateFilters.includes(state)} /><span className="text-sm">{state}</span></div>
                                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{scopedAssets.filter(a => assetMatchesGlobalFilter(a, [state])).length}</Badge>
                                            </div>
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
                    Object.keys(assetsByCategory).sort().map(cat => (
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
                    <div className="col-span-full py-32 text-center opacity-50"><FolderSearch className="mx-auto h-12 w-12 mb-4"/><h3 className="text-xl font-bold">No assets found in scope</h3></div>
                )}
            </div>
        ) : (
            <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-none bg-transparent">
                <div className="flex items-center gap-2 mb-4">
                    <Button variant="ghost" size="icon" onClick={() => { setView('dashboard'); setCurrentCategory(null); }}><ArrowLeft /></Button>
                    <h2 className="text-2xl font-black">{currentCategory}</h2>
                </div>
                <ScrollArea className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-10">
                        {categoryFilteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(a => (
                            <AssetItemCard 
                                key={a.id} 
                                asset={a} 
                                isSelected={selectedAssetIds.includes(a.id)} 
                                onSelect={(id, c) => setSelectedAssetIds(prev => c ? [...prev, id] : prev.filter(i => i !== id))} 
                                onView={handleViewAsset} 
                                onEdit={(a) => { setSelectedAsset(a); setIsFormReadOnly(false); setIsFormOpen(true); }} 
                                onDelete={asset => { setAssetToDelete(asset); setIsDeleteDialogOpen(true); }} 
                                onQuickSave={async (id, data) => {
                                    const asset = scopedAssets.find(a => a.id === id);
                                    if (!asset) return;
                                    const up = sanitizeForFirestore({ ...asset, ...data, lastModified: new Date().toISOString(), syncStatus: 'local' });
                                    const current = await getLocalAssets();
                                    const idx = current.findIndex(a => a.id === id);
                                    if (idx > -1) { current[idx] = up; await saveAssets(current); setAssets(current); }
                                }} 
                                quickViewFields={sheetDefinitions[currentCategory!]?.displayFields.filter(f => f.quickView) || []} 
                                appMode={appSettings.appMode} 
                                isGuest={isGuest} 
                                isAdmin={isAdmin} 
                            />
                        ))}
                    </div>
                </ScrollArea>
                <PaginationControls currentPage={currentPage} totalPages={Math.ceil(categoryFilteredAssets.length / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} totalItems={categoryFilteredAssets.length} />
            </Card>
        )}

        {isFormOpen && <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={selectedAsset} onSave={async (a) => {
            const up: Asset = { ...a, grantId: activeGrantId!, lastModified: new Date().toISOString(), syncStatus: 'local' };
            const current = await getLocalAssets();
            const idx = current.findIndex(ex => ex.id === a.id);
            if (idx > -1) current[idx] = up; else current.unshift(up);
            await saveAssets(current); setAssets(current); setIsFormOpen(false);
        }} isReadOnly={isFormReadOnly} />}
        
        {isSyncConfirmOpen && <SyncConfirmationDialog isOpen={isSyncConfirmOpen} onOpenChange={setIsSyncConfirmOpen} onConfirm={() => syncSummary?.type === 'download' ? executeDownload() : executeUpload()} summary={syncSummary} />}
        {isTravelReportOpen && <TravelReportDialog isOpen={isTravelReportOpen} onOpenChange={setIsTravelReportOpen} />}
        {isImportScanOpen && <ImportScannerDialog isOpen={isImportScanOpen} onOpenChange={setIsImportScanOpen} />}
        
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Remove record?</AlertDialogTitle><AlertDialogDescription>This will delete the asset locally. Syncing will remove it from the cloud context.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => {
                    const cur = await getLocalAssets();
                    const up = cur.filter(a => a.id !== assetToDelete?.id);
                    await saveAssets(up); setAssets(up); setIsDeleteDialogOpen(false);
                }} className="bg-destructive">Execute Deletion</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
