
"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { 
    getAssets as getAssetsFS, 
    batchSetAssets as batchSetAssetsFS, 
    clearAssets as clearFirestoreAssets, 
    getSettings as getSettingsFS, 
    updateSettings as updateSettingsFS,
    setAsset as setAssetFS,
    deleteAsset as deleteAssetFS
} from '@/lib/firestore';
import { 
    getAssets as getAssetsRTDB, 
    batchSetAssets as batchSetAssetsRTDB, 
    clearAssets as clearRtdbAssets, 
    getSettings as getSettingsRTDB, 
    updateSettings as updateSettingsRTDB 
} from '@/lib/database';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, Trash2, FileUp, Download, DatabaseZap, AlertTriangle, CloudOff, HardDrive, RefreshCw, CheckCircle, XCircle, ChevronsUpDown, Info, Search, Edit, FileJson, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import type { AppSettings, Asset } from '@/lib/types';
import { saveLocalSettings, clearLocalAssets, saveAssets, saveLockedOfflineAssets, getLocalAssets, getLockedOfflineAssets } from '@/lib/idb';
import { exportFullBackupToJson } from '@/lib/json-export';
import { addNotification } from '@/hooks/use-notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '@/hooks/use-toast';
import { rtdb, db, isConfigValid } from '@/lib/firebase';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

interface DatabaseAdminDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DatabaseAdminDialog({ isOpen, onOpenChange }: DatabaseAdminDialogProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAppSettings, assets, setAssets, setOfflineAssets, activeDatabase, activeGrantId } = useAppState();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDescription, setConfirmDescription] = useState('');
  const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);

  const importFileRef = useRef<HTMLInputElement>(null);
  const [backupToRestore, setBackupToRestore] = useState<{ settings: AppSettings, assets: Asset[] } | null>(null);

  // Firestore Browser State
  const [searchQuery, setSearchQuery] = useState('');
  const [allFsAssets, setAllFsAssets] = useState<Asset[]>([]);
  const [isFsLoading, setIsFsLoading] = useState(false);
  const [selectedFsAsset, setSelectedFsAsset] = useState<Asset | null>(null);
  const [editingAssetJson, setEditingAssetJson] = useState('');

  const fetchFsAssets = useCallback(async () => {
    setIsFsLoading(true);
    try {
        const data = await getAssetsFS();
        setAllFsAssets(data);
    } catch (e) {
        toast({ title: 'Error fetching Firestore assets', variant: 'destructive' });
    } finally {
        setIsFsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) fetchFsAssets();
  }, [isOpen, fetchFsAssets]);

  const filteredFsAssets = useMemo(() => {
    if (!searchQuery) return allFsAssets.slice(0, 100);
    const q = searchQuery.toLowerCase();
    return allFsAssets.filter(a => 
        a.description?.toLowerCase().includes(q) || 
        a.assetIdCode?.toLowerCase().includes(q) || 
        a.sn?.toLowerCase().includes(q)
    ).slice(0, 100);
  }, [allFsAssets, searchQuery]);

  const handleEditFsAsset = (asset: Asset) => {
    setSelectedFsAsset(asset);
    setEditingAssetJson(JSON.stringify(asset, null, 2));
  };

  const handleSaveFsAsset = async () => {
    if (!selectedFsAsset) return;
    try {
        const updated = JSON.parse(editingAssetJson);
        await setAssetFS(updated);
        toast({ title: 'Asset Updated in Firestore' });
        fetchFsAssets();
        setSelectedFsAsset(null);
    } catch (e) {
        toast({ title: 'Invalid JSON format', variant: 'destructive' });
    }
  };

  const handleDeleteFsAsset = async (id: string) => {
    if (!confirm(`Are you sure you want to delete asset ${id}?`)) return;
    try {
        await deleteAssetFS(id);
        toast({ title: 'Asset Deleted' });
        fetchFsAssets();
        if (selectedFsAsset?.id === id) setSelectedFsAsset(null);
    } catch (e) {
        toast({ title: 'Delete Failed', variant: 'destructive' });
    }
  };

  const handlePushFsToRtdb = async () => {
    setIsProcessing(true);
    try {
        const fsAssets = await getAssetsFS();
        if (fsAssets.length > 0) await batchSetAssetsRTDB(fsAssets);
        addNotification({ title: 'Manual Backup Complete', description: 'Firestore pushed to RTDB layer.' });
    } catch (e) {
        addNotification({ title: 'Backup Failed', variant: 'destructive'});
    }
    setIsProcessing(false);
  };

  const handlePullRtdbToFs = async () => {
    setIsProcessing(true);
    try {
        const rtdbAssets = await getAssetsRTDB();
        if (rtdbAssets.length > 0) await batchSetAssetsFS(rtdbAssets);
        addNotification({ title: 'Restore Complete', description: 'RTDB pulled into Firestore layer.' });
        fetchFsAssets();
    } catch (e) {
        addNotification({ title: 'Restore Failed', variant: 'destructive'});
    }
    setIsProcessing(false);
  };

  const handleNukeAll = async () => {
    setIsProcessing(true);
    try {
      await clearLocalAssets();
      await saveLockedOfflineAssets([]);
      setAssets([]);
      setOfflineAssets([]);
      await clearFirestoreAssets();
      await clearRtdbAssets();
      addNotification({ title: "GLOBAL WIPE COMPLETE", variant: 'destructive' });
      fetchFsAssets();
    } catch (e) {
      addNotification({ title: 'Wipe Failed', variant: 'destructive'});
    }
    setIsProcessing(false);
  };

  const openConfirmation = (action: string, title: string, description: string) => {
    setConfirmAction(action);
    setConfirmTitle(title);
    setConfirmDescription(description);
  }
  
  const handleConfirmAction = () => {
    if (!confirmAction) return;
    const action = confirmAction;
    setConfirmAction(null);
    switch(action) {
        case 'nuke_all': handleNukeAll(); break;
        case 'clear_firestore': 
            clearFirestoreAssets().then(() => fetchFsAssets()); 
            break;
        default: break;
    }
  }

  if (userProfile?.loginName !== 'admin') return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl flex flex-col max-h-[95vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="text-primary"/> Global Infrastructure Console</DialogTitle>
            <DialogDescription>Primary: Cloud Firestore | Backup: Realtime Database</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 space-y-6 overflow-y-auto pr-2 pb-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-primary/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2"><ArrowRightLeft className="h-4 w-4"/> Sync & Backup Layer</CardTitle>
                        <CardDescription>Manage redundancy between Firestore and RTDB.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button variant="outline" className="w-full justify-start h-11" onClick={handlePushFsToRtdb} disabled={isProcessing}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Push Firestore to Backup (RTDB)
                        </Button>
                        <Button variant="outline" className="w-full justify-start h-11" onClick={handlePullRtdbToFs} disabled={isProcessing}>
                            <RotateCcw className="mr-2 h-4 w-4" /> Pull Backup (RTDB) to Firestore
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2"><Download className="h-4 w-4"/> System Snapshots</CardTitle>
                        <CardDescription>Hard physical backups of all system settings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button variant="outline" className="w-full justify-start h-11" onClick={() => appSettings && exportFullBackupToJson(allFsAssets, appSettings)} disabled={isProcessing}>
                            <FileJson className="mr-2 h-4 w-4" /> Export Full System JSON
                        </Button>
                    </CardContent>
                </Card>
              </div>

              <Card className="border-primary shadow-lg overflow-hidden">
                <CardHeader className="bg-primary/5 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2"><DatabaseZap className="h-5 w-5"/> Firestore Record Explorer</CardTitle>
                            <CardDescription>Direct Cloud CRUD management for {allFsAssets.length} assets.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Filter by ID, SN, or Description..." 
                                    className="pl-9 h-9" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button size="icon" variant="outline" className="h-9 w-9" onClick={fetchFsAssets} disabled={isFsLoading}>
                                <RefreshCw className={cn("h-4 w-4", isFsLoading && "animate-spin")} />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="flex h-[400px]">
                        {/* List */}
                        <div className="w-1/3 border-r">
                            <ScrollArea className="h-full">
                                <div className="divide-y">
                                    {filteredFsAssets.map(asset => (
                                        <div 
                                            key={asset.id} 
                                            className={cn(
                                                "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                                                selectedFsAsset?.id === asset.id && "bg-primary/10"
                                            )}
                                            onClick={() => handleEditFsAsset(asset)}
                                        >
                                            <p className="text-xs font-bold truncate">{asset.description || 'Untitled'}</p>
                                            <p className="text-[10px] font-mono text-muted-foreground">{asset.id}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[9px] h-4">{asset.category}</Badge>
                                                {asset.verifiedStatus === 'Verified' && <CheckCircle className="h-3 w-3 text-green-500" />}
                                            </div>
                                        </div>
                                    ))}
                                    {filteredFsAssets.length === 0 && (
                                        <div className="p-8 text-center text-sm text-muted-foreground">No records found</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                        
                        {/* Detail/Edit */}
                        <div className="flex-1 bg-muted/10 p-4">
                            {selectedFsAsset ? (
                                <div className="space-y-4 h-full flex flex-col">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold">Edit Cloud Record: <span className="font-mono text-xs text-primary">{selectedFsAsset.id}</span></h4>
                                        <div className="flex gap-2">
                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteFsAsset(selectedFsAsset.id)}>
                                                <Trash2 className="h-4 w-4 mr-1" /> Delete
                                            </Button>
                                            <Button size="sm" onClick={handleSaveFsAsset}>
                                                <DatabaseZap className="h-4 w-4 mr-1" /> Update Firestore
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-0">
                                        <Textarea 
                                            className="h-full font-mono text-xs resize-none"
                                            value={editingAssetJson}
                                            onChange={(e) => setEditingAssetJson(e.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                                    <FileJson className="h-12 w-12 mb-4 opacity-20" />
                                    <p className="text-sm">Select a record to modify cloud data</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/50 bg-destructive/5">
                  <CardHeader className="py-4">
                      <CardTitle className="text-destructive flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4"/> Emergency Maintenance</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                       <Button variant="outline" className="justify-start border-destructive/30 text-destructive hover:bg-destructive hover:text-white" onClick={() => openConfirmation('clear_firestore', 'Wipe Firestore?', 'This will delete all assets from the primary cloud layer.')}>
                          <CloudOff className="mr-2 h-4 w-4" /> Wipe Firestore Asset Layer
                      </Button>
                      <Button variant="destructive" className="justify-start font-bold shadow-lg" onClick={() => openConfirmation('nuke_all', 'GLOBAL DESTRUCTION?', 'This wipes Firestore, RTDB, and Local Cache. IRREVERSIBLE.')}>
                          <DatabaseZap className="mr-2 h-4 w-4" /> NUKE ENTIRE GLOBAL DATABASE
                      </Button>
                  </CardContent>
              </Card>
            </div>

          <DialogFooter className="mt-auto border-t pt-4">
            <DialogClose asChild><Button variant="outline">Close Console</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle className="text-destructive">{confirmTitle}</AlertDialogTitle><AlertDialogDescription>{confirmDescription}</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setBackupToRestore(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmAction} className="bg-destructive hover:bg-destructive/90 text-white">Confirm Destructive Action</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
