
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { 
    getAssets as getAssetsFS, 
    batchSetAssets as batchSetAssetsFS, 
    clearAssets as clearFirestoreAssets, 
    setAsset as setAssetFS,
    deleteAsset as deleteAssetFS
} from '@/lib/firestore';
import { 
    getAssets as getAssetsRTDB, 
    batchSetAssets as batchSetAssetsRTDB, 
    clearAssets as clearRtdbAssets, 
} from '@/lib/database';
import { useAuth } from '@/contexts/auth-context';
import { 
    Loader2, 
    Trash2, 
    FileUp, 
    Download, 
    DatabaseZap, 
    AlertTriangle, 
    CloudOff, 
    RefreshCw, 
    CheckCircle, 
    Search, 
    FileJson, 
    ArrowRightLeft, 
    ShieldCheck, 
    PlusCircle, 
    History, 
    Database, 
    UploadCloud
} from 'lucide-react';
import type { Asset } from '@/lib/types';
import { clearLocalAssets, saveLockedOfflineAssets } from '@/lib/idb';
import { exportFullBackupToJson, exportAssetsToJson } from '@/lib/json-export';
import { addNotification } from '@/hooks/use-notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';

interface DatabaseAdminDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DatabaseAdminDialog({ isOpen, onOpenChange }: DatabaseAdminDialogProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAssets, setOfflineAssets, activeGrantId } = useAppState();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDescription, setConfirmDescription] = useState('');

  // Scoped Export State
  const [targetProjectId, setTargetProjectId] = useState<string>('all');
  const [targetCategory, setTargetCategory] = useState<string>('all');

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

  const projects = useMemo(() => appSettings?.grants || [], [appSettings]);
  const categories = useMemo(() => {
    const uniqueCats = new Set<string>();
    allFsAssets.forEach(a => { if(a.category) uniqueCats.add(a.category) });
    return Array.from(uniqueCats).sort();
  }, [allFsAssets]);

  const filteredFsAssets = useMemo(() => {
    let base = allFsAssets;
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        base = base.filter(a => 
            a.description?.toLowerCase().includes(q) || 
            a.assetIdCode?.toLowerCase().includes(q) || 
            a.sn?.toLowerCase().includes(q)
        );
    }
    return base.slice(0, 100);
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

  const handleCreateCloudSnapshot = async () => {
    setIsProcessing(true);
    try {
        let assetsToBackup = allFsAssets;
        if (targetProjectId !== 'all') assetsToBackup = assetsToBackup.filter(a => a.grantId === targetProjectId);
        if (targetCategory !== 'all') assetsToBackup = assetsToBackup.filter(a => a.category === targetCategory);

        if (assetsToBackup.length > 0) {
            await batchSetAssetsRTDB(assetsToBackup);
            addNotification({ title: 'Cloud Snapshot Created', description: `${assetsToBackup.length} records pushed to Realtime Database backup.` });
        } else {
            toast({ title: 'No records to snapshot', variant: 'destructive' });
        }
    } catch (e) {
        addNotification({ title: 'Snapshot Failed', variant: 'destructive'});
    }
    setIsProcessing(false);
  };

  const handleExportJson = () => {
    let assetsToExport = allFsAssets;
    if (targetProjectId !== 'all') assetsToExport = assetsToExport.filter(a => a.grantId === targetProjectId);
    if (targetCategory !== 'all') assetsToExport = assetsToExport.filter(a => a.category === targetCategory);

    if (assetsToExport.length === 0) {
        toast({ title: 'No assets found for current scope', variant: 'destructive' });
        return;
    }

    try {
        if (targetProjectId === 'all' && targetCategory === 'all' && appSettings) {
            exportFullBackupToJson(assetsToExport, appSettings);
        } else {
            exportAssetsToJson(assetsToExport, `assetain-export-${targetProjectId}-${targetCategory}.json`);
        }
        addNotification({ title: 'Export Successful', description: `${assetsToExport.length} records saved to file.` });
    } catch (e) {
        toast({ title: 'Export failed', variant: 'destructive' });
    }
  };

  const handlePullRtdbToFs = async () => {
    setIsProcessing(true);
    try {
        const rtdbAssets = await getAssetsRTDB();
        if (rtdbAssets.length > 0) {
            await batchSetAssetsFS(rtdbAssets);
            addNotification({ title: 'Cloud Restore Complete', description: `${rtdbAssets.length} records recovered from Realtime Database.` });
            fetchFsAssets();
        }
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
      addNotification({ title: "GLOBAL WIPE COMPLETE", description: "All local and cloud layers cleared.", variant: 'destructive' });
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
        <DialogContent className="max-w-6xl flex flex-col h-[90vh] p-0 overflow-hidden bg-[#0f172a] text-slate-200 border-slate-800">
          <Tabs defaultValue="backup" className="flex flex-col h-full">
            <div className="px-6 pt-6 bg-[#1e293b]/50 border-b border-slate-800">
                <DialogHeader className="mb-6">
                    <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-white">
                        <ShieldCheck className="text-blue-500 h-8 w-8"/> Global Infrastructure Console
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Authorized Access Only: Cloud Firestore (Main) | Realtime Database (Redundancy)
                    </DialogDescription>
                </DialogHeader>
                
                <TabsList className="bg-transparent h-auto p-0 gap-8 justify-start border-b-0">
                    <TabsTrigger value="backup" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-white text-slate-400 font-bold px-0 pb-4 h-auto transition-all">
                        Backup & Export
                    </TabsTrigger>
                    <TabsTrigger value="restore" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-white text-slate-400 font-bold px-0 pb-4 h-auto transition-all">
                        Restore & Import
                    </TabsTrigger>
                    <TabsTrigger value="explorer" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-white text-slate-400 font-bold px-0 pb-4 h-auto transition-all">
                        Database Explorer
                    </TabsTrigger>
                    <TabsTrigger value="destructive" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:bg-transparent data-[state=active]:text-red-500 text-slate-400 font-bold px-0 pb-4 h-auto transition-all">
                        Destructive Zone
                    </TabsTrigger>
                </TabsList>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-8">
                    {/* BACKUP & EXPORT */}
                    <TabsContent value="backup" className="m-0 space-y-8 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white">Backup & Export</h2>
                            <p className="text-slate-400 text-sm">
                                Create offline (JSON) or online (Realtime Database) backups. You can scope backups to a specific organization and/or collection.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Target Organization (Project)</Label>
                                <Select value={targetProjectId} onValueChange={setTargetProjectId}>
                                    <SelectTrigger className="bg-[#1e293b] border-slate-700 h-12 text-white">
                                        <SelectValue placeholder="All Organizations" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                        <SelectItem value="all">All Organizations</SelectItem>
                                        {projects.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Data to Export (Collection)</Label>
                                <Select value={targetCategory} onValueChange={setTargetCategory}>
                                    <SelectTrigger className="bg-[#1e293b] border-slate-700 h-12 text-white">
                                        <SelectValue placeholder="All Collections" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                                        <SelectItem value="all">All Collections</SelectItem>
                                        {categories.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <Button variant="default" className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-indigo-900/20" onClick={handleExportJson}>
                                <Download className="mr-3 h-6 w-6" /> Export to JSON (Offline)
                            </Button>
                            <Button variant="default" className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-indigo-900/20" onClick={handleCreateCloudSnapshot} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : <PlusCircle className="mr-3 h-6 w-6" />}
                                Create Cloud Snapshot (Manual)
                            </Button>
                        </div>
                    </TabsContent>

                    {/* RESTORE & IMPORT */}
                    <TabsContent value="restore" className="m-0 space-y-8 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white">Restore & Recovery</h2>
                            <p className="text-slate-400 text-sm">
                                Recover data from existing snapshots or external files. Note: Restoring data will merge with or overwrite existing Firestore records.
                            </p>
                        </div>

                        <Card className="bg-[#1e293b]/30 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2"><ArrowRightLeft className="text-blue-500 h-5 w-5"/> Cloud Synchronization</CardTitle>
                                <CardDescription className="text-slate-400">Restore the primary Firestore layer from the Realtime Database redundancy layer.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" className="w-full h-12 border-blue-500/30 text-blue-400 hover:bg-blue-500/10" onClick={handlePullRtdbToFs} disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />}
                                    Pull RTDB Snapshot to Firestore
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#1e293b]/30 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2"><FileUp className="text-blue-500 h-5 w-5"/> Manual JSON Import</CardTitle>
                                <CardDescription className="text-slate-400">Upload an Assetain system backup file to perform a bulk data merge.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="p-8 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center gap-4 hover:border-blue-500/50 transition-colors cursor-pointer">
                                    <UploadCloud className="h-12 w-12 text-slate-500" />
                                    <div className="text-center">
                                        <p className="text-sm font-bold">Click to upload or drag & drop</p>
                                        <p className="text-xs text-slate-500">Only .json files generated by Assetain are supported</p>
                                    </div>
                                    <Input type="file" className="hidden" accept=".json" />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* DATABASE EXPLORER */}
                    <TabsContent value="explorer" className="m-0 animate-in fade-in slide-in-from-left-2 duration-300">
                        <Card className="bg-[#1e293b]/30 border-slate-800 overflow-hidden">
                            <CardHeader className="bg-[#1e293b]/50 border-b border-slate-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2"><Database className="h-5 w-5 text-blue-500"/> Firestore Record Explorer</CardTitle>
                                        <CardDescription className="text-slate-400">Direct Cloud management for {allFsAssets.length} active records.</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-80">
                                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                            <Input 
                                                placeholder="Search IDs, Serials, or Descriptions..." 
                                                className="pl-10 h-10 bg-[#0f172a] border-slate-700 text-white" 
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <Button size="icon" variant="outline" className="h-10 w-10 border-slate-700 hover:bg-[#0f172a]" onClick={fetchFsAssets} disabled={isFsLoading}>
                                            <RefreshCw className={cn("h-4 w-4 text-slate-400", isFsLoading && "animate-spin")} />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="flex h-[500px]">
                                    {/* List */}
                                    <div className="w-1/3 border-r border-slate-800 bg-[#0f172a]/50">
                                        <ScrollArea className="h-full">
                                            <div className="divide-y divide-slate-800">
                                                {filteredFsAssets.map(asset => (
                                                    <div 
                                                        key={asset.id} 
                                                        className={cn(
                                                            "p-4 cursor-pointer hover:bg-blue-500/5 transition-colors",
                                                            selectedFsAsset?.id === asset.id && "bg-blue-500/10 border-l-4 border-blue-500"
                                                        )}
                                                        onClick={() => handleEditFsAsset(asset)}
                                                    >
                                                        <p className="text-sm font-bold truncate text-white">{asset.description || 'Untitled'}</p>
                                                        <p className="text-[10px] font-mono text-slate-500 mt-1">{asset.id}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Badge variant="outline" className="text-[10px] bg-slate-800 border-slate-700 text-slate-400 font-normal">{asset.category}</Badge>
                                                            {asset.verifiedStatus === 'Verified' && <CheckCircle className="h-3 w-3 text-emerald-500" />}
                                                        </div>
                                                    </div>
                                                ))}
                                                {filteredFsAssets.length === 0 && (
                                                    <div className="p-12 text-center text-sm text-slate-500 italic">No records found matching criteria</div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                    
                                    {/* Detail/Edit */}
                                    <div className="flex-1 bg-[#0f172a]/20 p-6">
                                        {selectedFsAsset ? (
                                            <div className="space-y-6 h-full flex flex-col">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-1">
                                                        <h4 className="text-white font-bold">Edit Cloud Document</h4>
                                                        <p className="text-xs font-mono text-blue-400">{selectedFsAsset.id}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDeleteFsAsset(selectedFsAsset.id)}>
                                                            <Trash2 className="h-4 w-4 mr-2" /> Delete Document
                                                        </Button>
                                                        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveFsAsset}>
                                                            <DatabaseZap className="h-4 w-4 mr-2" /> Update Firestore
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
                                                    <Textarea 
                                                        className="h-full w-full font-mono text-xs p-4 resize-none bg-[#0f172a] text-blue-100 border-none focus-visible:ring-0"
                                                        value={editingAssetJson}
                                                        onChange={(e) => setEditingAssetJson(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                                <FileJson className="h-20 w-20 mb-4 opacity-10" />
                                                <p className="text-lg font-medium opacity-50">Select a record to modify cloud data</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* DESTRUCTIVE ZONE */}
                    <TabsContent value="destructive" className="m-0 space-y-8 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-red-500">Destructive Operations</h2>
                            <p className="text-slate-400 text-sm">
                                Use these controls with extreme caution. Operations here bypass standard workflows and affect live production databases immediately.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="bg-red-500/5 border-red-500/20">
                                <CardHeader>
                                    <CardTitle className="text-lg text-red-400 flex items-center gap-2"><CloudOff className="h-5 w-5"/> Wipe Firestore Assets</CardTitle>
                                    <CardDescription className="text-red-400/60">Permanently delete all asset records from the primary Firestore layer.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button variant="outline" className="w-full h-12 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => openConfirmation('clear_firestore', 'Wipe Firestore Layer?', 'This will permanently remove ALL assets from the primary cloud database. This action cannot be reversed.')}>
                                        Execute Firestore Wipe
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="bg-red-500/10 border-red-500 shadow-2xl shadow-red-900/20">
                                <CardHeader>
                                    <CardTitle className="text-xl text-red-500 flex items-center gap-2 font-black tracking-tighter"><DatabaseZap className="h-6 w-6"/> TOTAL GLOBAL RESET</CardTitle>
                                    <CardDescription className="text-red-400 font-bold">NUCLEAR OPTION: Wipes Firestore, Realtime Database, and clears local browser cache.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button variant="destructive" className="w-full h-14 bg-red-600 hover:bg-red-700 font-black text-lg" onClick={() => openConfirmation('nuke_all', 'GLOBAL DESTRUCTION?', 'WARNING: This will clear EVERYTHING across all cloud and local layers. This is the absolute reset button.')}>
                                        INITIATE GLOBAL WIPE
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </div>
            </ScrollArea>

            <DialogFooter className="px-8 py-4 bg-[#1e293b]/50 border-t border-slate-800">
                <DialogClose asChild><Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10">Close Console</Button></DialogClose>
            </DialogFooter>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent className="bg-[#0f172a] text-white border-slate-800">
              <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-500 text-2xl font-black uppercase tracking-tighter">{confirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400 text-lg">
                      {confirmDescription}
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmAction} className="bg-red-600 hover:bg-red-700 text-white font-bold">Confirm Destructive Action</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
