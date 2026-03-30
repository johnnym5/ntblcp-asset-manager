"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  MoreHorizontal,
  Loader2,
  Trash2,
  ArrowLeft,
  Edit,
  FolderSearch,
  Layout,
  History,
  Camera,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { AssetForm } from "./asset-form";
import type { Asset } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAppState } from "@/contexts/app-state-context";
import { getAssets, batchSetAssets } from "@/lib/firestore";
import { getLocalAssets as getLocalAssetsFromDb, saveAssets } from "@/lib/idb";
import { cn, sanitizeForFirestore } from "@/lib/utils";
import { addNotification } from "@/hooks/use-notifications";
import { ImportScannerDialog } from "./single-sheet-import-dialog";
import { SyncConfirmationDialog, type SyncSummary } from "./sync-confirmation-dialog";
import { AssetSummaryDashboard } from "./asset-summary-dashboard";
import { Badge } from "./ui/badge";
import { useAuth } from "@/contexts/auth-context";

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
  const { userProfile, authInitialized } = useAuth();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormReadOnly, setIsFormReadOnly] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'table'>('dashboard');
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isImportScanOpen, setIsImportScanOpen] = useState(false);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);
  
  const {
    assets, setAssets, isOnline, offlineAssets, dataSource,
    globalStateFilters, appSettings, manualDownloadTrigger,
    manualUploadTrigger, isSyncing, setIsSyncing, searchTerm,
    setDataActions, setAssetToView, assetToView, activeGrantId
  } = useAppState();

  const isAdmin = userProfile?.isAdmin || false;
  const isGuest = userProfile?.isGuest || false;
  const activeAssets = useMemo(() => dataSource === 'cloud' ? assets : offlineAssets, [dataSource, assets, offlineAssets]);

  const enabledSheets = useMemo(() => {
    const activeGrant = appSettings.grants.find(g => g.id === activeGrantId);
    return activeGrant?.enabledSheets || [];
  }, [appSettings.grants, activeGrantId]);

  useEffect(() => {
    const loadData = async () => {
        const data = await getLocalAssetsFromDb();
        setAssets(data);
        setIsLoading(false);
    };
    loadData();
  }, [setAssets]);

  const handleDownloadScan = useCallback(async () => {
    if (!isOnline || !authInitialized || isGuest) return;
    setIsSyncing(true);
    try {
        const cloudAssets = await getAssets();
        const localAssets = await getLocalAssetsFromDb();
        const localAssetsMap = new Map(localAssets.map(a => [a.id, a]));
        const cloudAssetsMap = new Map(cloudAssets.map(a => [a.id, a]));
        
        const summary: SyncSummary = { 
            newFromCloud: [], 
            updatedFromCloud: [], 
            keptLocal: [], 
            toUpload: [], 
            deletedOnCloud: [],
            type: 'download' 
        };
        
        for (const cloudAsset of cloudAssets) {
            if (activeGrantId && cloudAsset.grantId !== activeGrantId) continue;
            const localAsset = localAssetsMap.get(cloudAsset.id);
            if (localAsset) {
                const cloudTimestamp = cloudAsset.lastModified ? new Date(cloudAsset.lastModified).getTime() : 0;
                const localTimestamp = localAsset.lastModified ? new Date(localAsset.lastModified).getTime() : 0;
                if (localAsset.syncStatus === 'local' && localTimestamp > cloudTimestamp) summary.keptLocal.push(localAsset);
                else if (haveAssetDetailsChanged(localAsset, cloudAsset)) summary.updatedFromCloud.push(cloudAsset);
            } else summary.newFromCloud.push(cloudAsset);
        }

        for (const localAsset of localAssets) {
            if (activeGrantId && localAsset.grantId !== activeGrantId) continue;
            if (!cloudAssetsMap.has(localAsset.id) && localAsset.syncStatus === 'synced') {
                summary.deletedOnCloud!.push(localAsset);
            }
        }

        if (summary.newFromCloud.length > 0 || summary.updatedFromCloud.length > 0 || summary.deletedOnCloud!.length > 0) {
            setSyncSummary(summary); 
            setIsSyncConfirmOpen(true); 
        } else {
            addNotification({ title: 'Already In Sync', description: 'Your registry matches the cloud exactly.' });
        }
    } catch (e) { 
        addNotification({ title: "Scan Failed", variant: 'destructive' }); 
    } finally { 
        setIsSyncing(false); 
    }
  }, [isOnline, authInitialized, isGuest, activeGrantId, setIsSyncing]);

  const handleUploadScan = useCallback(async () => {
    if (!isOnline || !authInitialized || isGuest) return;
    setIsSyncing(true);
    try {
        const localAssets = await getLocalAssetsFromDb();
        const assetsToPush = localAssets.filter(a => a.syncStatus === 'local' && (!activeGrantId || a.grantId === activeGrantId));
        if (assetsToPush.length > 0) { 
            setSyncSummary({ newFromCloud: [], updatedFromCloud: [], keptLocal: [], toUpload: assetsToPush, type: 'upload' }); 
            setIsSyncConfirmOpen(true); 
        } else {
            addNotification({ title: 'Zero Modifications', description: 'No local pulses detected for broadcast.' });
        }
    } catch (e) { 
        addNotification({ title: "Sync Failed", variant: 'destructive' }); 
    } finally { 
        setIsSyncing(false); 
    }
  }, [isOnline, authInitialized, isGuest, activeGrantId, setIsSyncing]);

  useEffect(() => { if (manualDownloadTrigger > 0) handleDownloadScan(); }, [manualDownloadTrigger, handleDownloadScan]);
  useEffect(() => { if (manualUploadTrigger > 0) handleUploadScan(); }, [manualUploadTrigger, handleUploadScan]);

  const displayedAssets = useMemo(() => {
    let results = activeAssets.filter(asset => {
        const inActiveProject = !activeGrantId || asset.grantId === activeGrantId;
        const inEnabledClass = enabledSheets.includes(asset.category);
        return inActiveProject && inEnabledClass;
    });

    if (globalStateFilters.length > 0 && !globalStateFilters.includes('All')) {
        results = results.filter(a => globalStateFilters.includes(a.location || ''));
    }

    if (searchTerm) {
        const tokens = searchTerm.toLowerCase().split(' ');
        results = results.filter(a => tokens.every(t => JSON.stringify(a).toLowerCase().includes(t)));
    }
    return results;
  }, [activeAssets, enabledSheets, globalStateFilters, searchTerm, activeGrantId]);

  const assetsByCategory = useMemo(() => {
    return displayedAssets.reduce((acc, asset) => {
        const cat = asset.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(asset);
        return acc;
    }, {} as Record<string, Asset[]>);
  }, [displayedAssets]);

  const handleViewAsset = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormReadOnly(true);
    setIsFormOpen(true);
  }, []);

  const handleEditAsset = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormReadOnly(false);
    setIsFormOpen(true);
  }, []);

  const handleSaveAsset = async (assetToSave: Asset) => {
    const current = await getLocalAssetsFromDb();
    const updated = current.some(a => a.id === assetToSave.id) 
        ? current.map(a => a.id === assetToSave.id ? assetToSave : a) 
        : [assetToSave, ...current];
    await saveAssets(updated);
    setAssets(updated);
    setIsFormOpen(false);
    toast({ title: "Asset record updated locally." });
  };

  const handleSyncConfirmExecute = async () => {
      if (!syncSummary) return;
      setIsSyncing(true);
      try {
          const localAssets = await getLocalAssetsFromDb();
          let nextAssets = [...localAssets];
          if (syncSummary.type === 'download') {
              const remoteItems = [...syncSummary.newFromCloud, ...syncSummary.updatedFromCloud];
              const deleteIds = new Set(syncSummary.deletedOnCloud?.map(a => a.id));
              const remoteMap = new Map(remoteItems.map(a => [a.id, a]));
              nextAssets = nextAssets.filter(a => !deleteIds.has(a.id)).map(a => remoteMap.get(a.id) || a);
              syncSummary.newFromCloud.forEach(a => { if (!nextAssets.some(x => x.id === a.id)) nextAssets.push(a); });
          } else {
              await batchSetAssets(syncSummary.toUpload);
              const uploadedIds = new Set(syncSummary.toUpload.map(a => a.id));
              nextAssets = nextAssets.map(a => uploadedIds.has(a.id) ? { ...a, syncStatus: 'synced' } : a);
          }
          await saveAssets(nextAssets);
          setAssets(nextAssets);
      } catch (e) {
          addNotification({ title: 'Sync Failure', variant: 'destructive' });
      } finally {
          setIsSyncing(false);
          setIsSyncConfirmOpen(false);
          setSyncSummary(null);
      }
  };

  const navigateAsset = (direction: 'next' | 'previous') => {
      if (!selectedAsset || !currentCategory) return;
      const categoryAssets = assetsByCategory[currentCategory];
      const currentIndex = categoryAssets.findIndex(a => a.id === selectedAsset.id);
      let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      
      if (nextIndex >= 0 && nextIndex < categoryAssets.length) {
          setSelectedAsset(categoryAssets[nextIndex]);
      }
  };

  useEffect(() => {
    if (assetToView) {
        handleViewAsset(assetToView);
        setAssetToView(null);
    }
  }, [assetToView, setAssetToView, handleViewAsset]);

  useEffect(() => {
    setDataActions({
        onAddAsset: () => { setSelectedAsset(undefined); setIsFormReadOnly(false); setIsFormOpen(true); },
        onScanAndImport: () => setIsImportScanOpen(true),
        onClearAll: () => {},
        onTravelReport: () => {}
    });
  }, [setDataActions]);

  const categoryAssets = currentCategory ? assetsByCategory[currentCategory] || [] : [];
  const currentIndex = selectedAsset ? categoryAssets.findIndex(a => a.id === selectedAsset.id) : -1;

  return (
    <div className="flex flex-col h-full gap-4">
      <AssetSummaryDashboard />
      
      {view === 'dashboard' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-20">
            {Object.entries(assetsByCategory).map(([cat, catAssets]) => (
                <Card key={cat} className="hover:shadow-xl transition-all cursor-pointer bg-card rounded-3xl" onClick={() => { setView('table'); setCurrentCategory(cat); }}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black uppercase tracking-tight">{cat}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-4xl font-black">{catAssets.length}</div>
                            {catAssets.some(a => !!a.photoDataUri) && (
                                <Badge className="bg-primary/10 text-primary border-primary/20 h-6 px-2 font-black uppercase text-[8px] gap-1">
                                    <Camera className="h-3 w-3" /> Visual Proof
                                </Badge>
                            )}
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Registry Records</p>
                    </CardContent>
                </Card>
            ))}
        </div>
      ) : (
        <div className="space-y-4 pb-20">
            <div className="flex items-center justify-between px-2">
                <Button variant="ghost" onClick={() => setView('dashboard')} className="font-bold rounded-xl"><ArrowLeft className="mr-2 h-4 w-4" /> Exit Layer</Button>
                <h2 className="text-2xl font-black uppercase tracking-tight text-primary">{currentCategory}</h2>
            </div>
            <Card className="rounded-3xl border-2 shadow-2xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="font-black uppercase text-[10px] py-4 px-6">Physical Identification</TableHead>
                            <TableHead className="font-black uppercase text-[10px] py-4">Evidence</TableHead>
                            <TableHead className="font-black uppercase text-[10px] py-4">Status</TableHead>
                            <TableHead className="text-right font-black uppercase text-[10px] py-4 px-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categoryAssets.map(asset => (
                            <TableRow key={asset.id} className="hover:bg-primary/5 cursor-pointer group" onClick={() => handleViewAsset(asset)}>
                                <TableCell className="py-4 px-6">
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm">{asset.description}</span>
                                        <span className="text-[10px] font-mono text-muted-foreground uppercase mt-0.5 tracking-tighter">ID: {asset.assetIdCode || asset.sn || 'UNTAGGED'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4">
                                    {asset.photoDataUri ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg overflow-hidden border border-primary/20">
                                                <img src={asset.photoDataUri} className="h-full w-full object-cover" />
                                            </div>
                                            <Badge variant="outline" className="text-[8px] font-black uppercase border-green-500/20 text-green-600 bg-green-500/5">Verified with Image</Badge>
                                        </div>
                                    ) : (
                                        <Badge variant="outline" className="text-[8px] font-black uppercase opacity-20">No Visual Proof</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="py-4">
                                    <Badge className={cn("text-[10px] font-black h-6 uppercase tracking-widest", asset.verifiedStatus === 'Verified' ? "bg-green-500" : "bg-orange-500")}>
                                        {asset.verifiedStatus || 'UNVERIFIED'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right py-4 px-6" onClick={e => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="group-hover:bg-muted"><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl border-2 shadow-2xl">
                                            <DropdownMenuItem onClick={() => handleViewAsset(asset)} className="font-bold cursor-pointer"><FolderSearch className="mr-2 h-4 w-4" /> Inspect Profile</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleEditAsset(asset)} className="font-bold cursor-pointer"><Edit className="mr-2 h-4 w-4" /> Audit Data</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
      )}

      <AssetForm 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        asset={selectedAsset} 
        onSave={handleSaveAsset} 
        isReadOnly={isFormReadOnly} 
        onQuickSave={async () => {}} 
        onNext={currentIndex < categoryAssets.length - 1 ? () => navigateAsset('next') : undefined}
        onPrevious={currentIndex > 0 ? () => navigateAsset('previous') : undefined}
      />
      
      <ImportScannerDialog isOpen={isImportScanOpen} onOpenChange={setIsImportScanOpen} />
      <SyncConfirmationDialog isOpen={isSyncConfirmOpen} onOpenChange={setIsSyncConfirmOpen} summary={syncSummary} onConfirm={handleSyncConfirmExecute} />
    </div>
  );
}
