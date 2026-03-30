
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
  DropdownMenuSeparator,
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
  History
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { AssetForm } from "./asset-form";
import type { Asset } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAppState } from "@/contexts/app-state-context";
import { getAssets, batchDeleteAssets } from "@/lib/firestore";
import { getLocalAssets as getLocalAssetsFromDb, saveAssets } from "@/lib/idb";
import { cn, sanitizeForFirestore } from "@/lib/utils";
import { addNotification } from "@/hooks/use-notifications";
import { ImportScannerDialog } from "./single-sheet-import-dialog";
import { SyncConfirmationDialog, type SyncSummary } from "./sync-confirmation-dialog";
import { AssetSummaryDashboard } from "./asset-summary-dashboard";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
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

  const handleDownloadScan = useCallback(async () => {
    if (!isOnline || !authInitialized || isGuest) return;
    setIsSyncing(true);
    addNotification({ title: 'Scanning Registry...' });
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
        
        // Find new/updated items
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

        // Detect items deleted on cloud
        for (const localAsset of localAssets) {
            if (activeGrantId && localAsset.grantId !== activeGrantId) continue;
            if (!cloudAssetsMap.has(localAsset.id) && localAsset.syncStatus === 'synced') {
                summary.deletedOnCloud!.push(localAsset);
            }
        }

        if (summary.newFromCloud.length === 0 && summary.updatedFromCloud.length === 0 && summary.deletedOnCloud!.length === 0) {
            addNotification({ title: 'Registry Up-to-Date' });
        } else { 
            setSyncSummary(summary); 
            setIsSyncConfirmOpen(true); 
        }
    } catch (e) { 
        addNotification({ title: "Scan Failed", description: "Database connection lost or permissions denied.", variant: 'destructive' }); 
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
            addNotification({ title: 'No Changes to Sync' });
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
              const { newFromCloud, updatedFromCloud, deletedOnCloud } = syncSummary;
              const remoteItems = [...newFromCloud, ...updatedFromCloud];
              const deleteIds = new Set(deletedOnCloud?.map(a => a.id));

              // Apply remote items
              const remoteMap = new Map(remoteItems.map(a => [a.id, a]));
              nextAssets = nextAssets
                .filter(a => !deleteIds.has(a.id))
                .map(a => remoteMap.get(a.id) || a);
              
              const currentIds = new Set(nextAssets.map(a => a.id));
              newFromCloud.forEach(a => {
                  if (!currentIds.has(a.id)) nextAssets.push(a);
              });

              addNotification({ title: 'Download Successful', description: `Injected ${remoteItems.length} changes and purged ${deleteIds.size} records.` });
          } else {
              // Upload Logic
              await batchSetAssets(syncSummary.toUpload);
              const uploadedIds = new Set(syncSummary.toUpload.map(a => a.id));
              nextAssets = nextAssets.map(a => uploadedIds.has(a.id) ? { ...a, syncStatus: 'synced' } : a);
              addNotification({ title: 'Upload Successful', description: `Broadcast ${syncSummary.toUpload.length} changes to cloud.` });
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

  if (isLoading && !activeAssets.length) {
    useEffect(() => {
        getLocalAssetsFromDb().then(data => { setAssets(data); setIsLoading(false); });
    }, [setAssets]);
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <AssetSummaryDashboard />
      
      {view === 'dashboard' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
          {Object.entries(assetsByMajorSection).sort((a,b) => a[0].localeCompare(b[0])).map(([section, categories]) => (
            <div key={section} className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-primary/10 rounded-lg"><Layout className="h-4 w-4 text-primary" /></div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">{section}</h3>
                    <Separator className="flex-1 opacity-50" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Object.entries(categories).map(([cat, catAssets]) => {
                        const total = catAssets.length;
                        const verified = catAssets.filter(a => a.verifiedStatus === 'Verified').length;
                        const percentage = Math.round((verified / total) * 100);
                        return (
                            <Card key={cat} className="hover:shadow-2xl transition-all duration-500 cursor-pointer group border-2 border-primary/5 hover:border-primary/20 bg-card rounded-3xl" onClick={() => { setView('table'); setCurrentCategory(cat); }}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-black truncate group-hover:text-primary transition-colors uppercase tracking-tight">{cat}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-baseline gap-2">
                                        <div className="text-4xl font-black tracking-tighter">{total}</div>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Records</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                                            <span>Sync Progress</span>
                                            <span className={cn(percentage === 100 ? "text-green-600" : "text-primary")}>{percentage}%</span>
                                        </div>
                                        <Progress value={percentage} className={cn("h-1.5 bg-muted", percentage === 100 && "bg-green-100")} />
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
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300 pb-20">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setView('dashboard')} className="hover:bg-primary/5 font-bold rounded-xl px-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sections
                </Button>
                <div className="flex flex-col items-end">
                    <h2 className="text-2xl font-black uppercase tracking-tight text-primary leading-none">{currentCategory}</h2>
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mt-1">Registry Detail View</span>
                </div>
            </div>
            <Card className="rounded-3xl border-2 shadow-2xl overflow-hidden border-border/50">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="border-b-2">
                            <TableHead className="font-black uppercase text-[10px] tracking-widest py-4 px-6">Asset Identification</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest py-4">Registry Context</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest py-4">Status</TableHead>
                            <TableHead className="text-right font-black uppercase text-[10px] tracking-widest py-4 px-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayedAssets.filter(a => a.category === currentCategory).map(asset => (
                            <TableRow key={asset.id} className="hover:bg-primary/5 transition-colors border-b last:border-0 group">
                                <TableCell className="py-4 px-6">
                                    <div className="font-black text-sm text-foreground">{asset.description}</div>
                                    <div className="text-[10px] font-mono text-muted-foreground mt-1 group-hover:text-primary transition-colors">TAG: {asset.assetIdCode || asset.sn || 'UNTAGGED'}</div>
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="flex flex-wrap gap-2">
                                        {asset.normalizedLabel ? (
                                            <Badge variant="secondary" className="text-[9px] uppercase font-black tracking-widest h-5 bg-muted/50">
                                                <History className="h-3 w-3 mr-1.5 opacity-50" /> {asset.normalizedLabel}
                                            </Badge>
                                        ) : <span className="text-muted-foreground text-[10px] font-bold italic opacity-30">BASE REGISTER</span>}
                                        {asset.yearBucket && <Badge variant="outline" className="text-[9px] h-5 border-primary/30 text-primary font-black">{asset.yearBucket}</Badge>}
                                    </div>
                                </TableCell>
                                <TableCell className="py-4">
                                    <Badge className={cn(
                                        "text-[10px] uppercase font-black tracking-widest h-6 px-4 rounded-lg shadow-xl", 
                                        asset.verifiedStatus === 'Verified' ? "bg-green-500 hover:bg-green-600 shadow-green-500/20" : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
                                    )}>
                                        {asset.verifiedStatus || 'UNVERIFIED'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right py-4 px-6">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 transition-all"><MoreHorizontal className="h-5 w-5" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-2xl w-56 shadow-2xl p-2 border-2">
                                            <DropdownMenuItem onClick={() => handleViewAsset(asset)} className="py-3 font-bold text-xs rounded-xl cursor-pointer"><FolderSearch className="mr-3 h-4 w-4 text-primary" /> Inspect Registry Profile</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleEditAsset(asset)} className="py-3 font-bold text-xs rounded-xl cursor-pointer"><Edit className="mr-3 h-4 w-4 text-primary" /> Edit Structural Data</DropdownMenuItem>
                                            <DropdownMenuSeparator className="my-2" />
                                            <DropdownMenuItem onClick={() => { setAssetToDelete(asset); setIsDeleteDialogOpen(true); }} className="py-3 font-bold text-xs text-destructive focus:bg-destructive/10 rounded-xl cursor-pointer"><Trash2 className="mr-3 h-4 w-4" /> Delete Entry</DropdownMenuItem>
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
      />
      
      <ImportScannerDialog isOpen={isImportScanOpen} onOpenChange={setIsImportScanOpen} />
      
      <SyncConfirmationDialog 
        isOpen={isSyncConfirmOpen} 
        onOpenChange={setIsSyncConfirmOpen} 
        summary={syncSummary} 
        onConfirm={handleSyncConfirmExecute} 
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="rounded-3xl border-destructive/10">
              <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive text-2xl font-black tracking-tight">Confirm Record Deletion?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                      This will permanently remove <strong>{assetToDelete?.description}</strong> from the local registry and mark it for cloud removal during the next sync pulse.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                  <AlertDialogCancel className="font-bold rounded-xl px-6">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {}} className="bg-destructive hover:bg-destructive/90 font-black uppercase tracking-widest text-xs h-11 px-8 rounded-xl shadow-xl shadow-destructive/20">Delete Record</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
