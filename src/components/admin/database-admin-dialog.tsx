
"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
    deleteAsset as deleteAssetFS,
    getSettings as getSettingsFS
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
    RefreshCw, 
    Search, 
    FileJson, 
    ArrowRightLeft, 
    ShieldCheck, 
    PlusCircle, 
    Database, 
    UploadCloud,
    ChevronRight,
    FileText,
    Settings,
    Edit3
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
import { Separator } from '../ui/separator';

interface DatabaseAdminDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type CollectionType = 'assets' | 'config';

export function DatabaseAdminDialog({ isOpen, onOpenChange }: DatabaseAdminDialogProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAssets, setOfflineAssets } = useAppState();
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
  const [selectedCollection, setSelectedCollection] = useState<CollectionType>('assets');
  const [allFsAssets, setAllFsAssets] = useState<Asset[]>([]);
  const [fsSettings, setFsSettings] = useState<any>(null);
  const [isFsLoading, setIsFsLoading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [editingAssetJson, setEditingAssetJson] = useState('');

  const fetchFsData = useCallback(async () => {
    setIsFsLoading(true);
    try {
        if (selectedCollection === 'assets') {
            const data = await getAssetsFS();
            setAllFsAssets(data);
        } else {
            const settings = await getSettingsFS();
            setFsSettings(settings);
        }
    } catch (e) {
        toast({ title: 'Error fetching Firestore data', variant: 'destructive' });
    } finally {
        setIsFsLoading(false);
    }
  }, [selectedCollection, toast]);

  useEffect(() => {
    if (isOpen) fetchFsData();
  }, [isOpen, fetchFsData]);

  const projects = useMemo(() => appSettings?.grants || [], [appSettings]);
  const categories = useMemo(() => {
    const uniqueCats = new Set<string>();
    allFsAssets.forEach(a => { if(a.category) uniqueCats.add(a.category) });
    return Array.from(uniqueCats).sort();
  }, [allFsAssets]);

  const filteredDocs = useMemo(() => {
    if (selectedCollection === 'config') {
        return [{ id: 'settings', data: fsSettings }];
    }
    
    let base = allFsAssets;
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        base = base.filter(a => 
            a.description?.toLowerCase().includes(q) || 
            a.assetIdCode?.toLowerCase().includes(q) || 
            a.sn?.toLowerCase().includes(q) ||
            a.id.toLowerCase().includes(q)
        );
    }
    return base.map(a => ({ id: a.id, data: a }));
  }, [allFsAssets, fsSettings, searchQuery, selectedCollection]);

  const selectedDocData = useMemo(() => {
    if (!selectedDocId) return null;
    return filteredDocs.find(d => d.id === selectedDocId)?.data || null;
  }, [selectedDocId, filteredDocs]);

  const handleSelectDoc = (id: string) => {
    setSelectedDocId(id);
    setIsJsonMode(false);
    const data = filteredDocs.find(d => d.id === id)?.data;
    if (data) setEditingAssetJson(JSON.stringify(data, null, 2));
  };

  const handleSaveDoc = async () => {
    if (!selectedDocId || !isJsonMode) return;
    try {
        const updated = JSON.parse(editingAssetJson);
        if (selectedCollection === 'assets') {
            await setAssetFS(updated);
            toast({ title: 'Asset Updated in Firestore' });
        } else {
            // Config update would go here if implemented for raw JSON
            toast({ title: 'Manual config editing restricted to UI for safety', variant: 'destructive' });
            return;
        }
        fetchFsData();
        setIsJsonMode(false);
    } catch (e) {
        toast({ title: 'Invalid JSON format', variant: 'destructive' });
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (selectedCollection === 'config') return;
    if (!confirm(`Are you sure you want to delete asset ${id}?`)) return;
    try {
        await deleteAssetFS(id);
        toast({ title: 'Asset Deleted' });
        fetchFsData();
        if (selectedDocId === id) setSelectedDocId(null);
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
            fetchFsData();
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
      fetchFsData();
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
            clearFirestoreAssets().then(() => fetchFsData()); 
            break;
        default: break;
    }
  }

  if (userProfile?.loginName !== 'admin') return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl flex flex-col h-[95vh] p-0 overflow-hidden bg-background border-border">
          <Tabs defaultValue="explorer" className="flex flex-col h-full">
            <div className="px-6 pt-6 bg-muted/30 border-b border-border">
                <DialogHeader className="mb-6">
                    <DialogTitle className="flex items-center gap-2 text-2xl font-black tracking-tight">
                        <ShieldCheck className="text-primary h-8 w-8"/> Assetain Infrastructure Console
                    </DialogTitle>
                    <DialogDescription>
                        Authorized Management: Primary Firestore Storage & RTDB Backup Layer
                    </DialogDescription>
                </DialogHeader>
                
                <TabsList className="bg-transparent h-auto p-0 gap-8 justify-start border-b-0">
                    <TabsTrigger value="explorer" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground font-bold px-0 pb-4 h-auto transition-all uppercase text-xs tracking-widest">
                        Database Explorer
                    </TabsTrigger>
                    <TabsTrigger value="backup" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground font-bold px-0 pb-4 h-auto transition-all uppercase text-xs tracking-widest">
                        Backup & Export
                    </TabsTrigger>
                    <TabsTrigger value="restore" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground font-bold px-0 pb-4 h-auto transition-all uppercase text-xs tracking-widest">
                        Restore & Import
                    </TabsTrigger>
                    <TabsTrigger value="destructive" className="rounded-none border-b-2 border-transparent data-[state=active]:border-destructive data-[state=active]:bg-transparent data-[state=active]:text-destructive text-muted-foreground font-bold px-0 pb-4 h-auto transition-all uppercase text-xs tracking-widest">
                        Destructive Zone
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
                {/* DATABASE EXPLORER (FIRESTORE STYLE) */}
                <TabsContent value="explorer" className="m-0 h-full flex flex-col animate-in fade-in duration-300">
                    <div className="bg-muted/10 border-b p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className="h-8 px-3 font-bold uppercase tracking-tighter text-[10px] bg-background">
                                <Database className="mr-2 h-3 w-3 text-primary"/> (default)
                            </Badge>
                            <div className="h-4 w-px bg-border"/>
                            <div className="relative w-80">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search documents..." 
                                    className="pl-10 h-9 bg-background border-border" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button size="sm" variant="outline" className="h-9 font-bold bg-background" onClick={fetchFsData} disabled={isFsLoading}>
                            <RefreshCw className={cn("mr-2 h-4 w-4", isFsLoading && "animate-spin")} /> Refresh Cloud
                        </Button>
                    </div>

                    <div className="flex-1 flex overflow-hidden divide-x border-b">
                        {/* Column 1: Collections */}
                        <div className="w-[200px] flex flex-col bg-muted/5">
                            <div className="p-3 border-b flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Collections</span>
                                <PlusCircle className="h-3 w-3 text-muted-foreground cursor-not-allowed opacity-20"/>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-1 space-y-1">
                                    <button 
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors",
                                            selectedCollection === 'assets' ? "bg-primary/10 text-primary" : "hover:bg-muted"
                                        )}
                                        onClick={() => { setSelectedCollection('assets'); setSelectedDocId(null); }}
                                    >
                                        <FileText className="mr-2 h-4 w-4 opacity-70"/> assets
                                        <ChevronRight className="ml-auto h-3 w-3 opacity-50"/>
                                    </button>
                                    <button 
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors",
                                            selectedCollection === 'config' ? "bg-primary/10 text-primary" : "hover:bg-muted"
                                        )}
                                        onClick={() => { setSelectedCollection('config'); setSelectedDocId(null); }}
                                    >
                                        <Settings className="mr-2 h-4 w-4 opacity-70"/> config
                                        <ChevronRight className="ml-auto h-3 w-3 opacity-50"/>
                                    </button>
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Column 2: Documents */}
                        <div className="w-[350px] flex flex-col bg-background">
                            <div className="p-3 border-b flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{selectedCollection}</span>
                                <div className="flex gap-2">
                                    <Badge variant="outline" className="text-[9px] font-bold">{filteredDocs.length}</Badge>
                                </div>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-1 space-y-0.5">
                                    {filteredDocs.map(doc => (
                                        <button 
                                            key={doc.id} 
                                            className={cn(
                                                "w-full text-left px-3 py-2.5 rounded-md text-[13px] font-mono flex items-center transition-colors group",
                                                selectedDocId === doc.id ? "bg-primary/10 text-primary border-l-4 border-primary rounded-l-none" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                            )}
                                            onClick={() => handleSelectDoc(doc.id)}
                                        >
                                            <span className="truncate">{doc.id}</span>
                                            <ChevronRight className="ml-auto h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity"/>
                                        </button>
                                    ))}
                                    {filteredDocs.length === 0 && (
                                        <div className="p-8 text-center text-xs text-muted-foreground italic">No documents found</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Column 3: Fields */}
                        <div className="flex-1 flex flex-col bg-muted/5">
                            <div className="p-3 border-b flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Document:</span>
                                    <span className="text-xs font-mono font-bold text-primary">{selectedDocId || 'none'}</span>
                                </div>
                                {selectedDocId && (
                                    <div className="flex items-center gap-2">
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setIsJsonMode(!isJsonMode)}>
                                            <FileJson className="h-4 w-4" />
                                        </Button>
                                        <Separator orientation="vertical" className="h-4"/>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteDoc(selectedDocId)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                            
                            <ScrollArea className="flex-1">
                                {selectedDocId ? (
                                    <div className="p-6">
                                        {isJsonMode ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Source JSON</Label>
                                                    <Button size="sm" className="h-8 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20" onClick={handleSaveDoc}>
                                                        <DatabaseZap className="mr-2 h-3 w-3"/> Commit to Cloud
                                                    </Button>
                                                </div>
                                                <div className="rounded-xl border border-border shadow-2xl overflow-hidden bg-background">
                                                    <Textarea 
                                                        className="min-h-[500px] font-mono text-xs p-4 resize-none border-none focus-visible:ring-0 leading-relaxed"
                                                        value={editingAssetJson}
                                                        onChange={(e) => setEditingAssetJson(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                {selectedDocData && Object.entries(selectedDocData).map(([key, value]) => (
                                                    <div key={key} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border transition-all group">
                                                        <div className="w-[180px] shrink-0">
                                                            <span className="text-xs font-bold text-muted-foreground truncate block">{key}:</span>
                                                        </div>
                                                        <div className="flex-1 flex flex-wrap items-center gap-2">
                                                            <span className="text-xs font-medium bg-muted/50 px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground">({typeof value})</span>
                                                            <span className="text-sm font-semibold break-all">
                                                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                            </span>
                                                        </div>
                                                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-background rounded" onClick={() => setIsJsonMode(true)}>
                                                            <Edit3 className="h-3 w-3 text-muted-foreground"/>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 opacity-50">
                                        <DatabaseZap className="h-20 w-20 mb-4" />
                                        <p className="text-lg font-black uppercase tracking-widest">No Document Selected</p>
                                        <p className="text-sm">Select a document ID from the list to view its fields</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </div>
                </TabsContent>

                <ScrollArea className="flex-1">
                    {/* BACKUP & EXPORT */}
                    <TabsContent value="backup" className="m-0 p-8 space-y-8 animate-in slide-in-from-left-2 duration-300">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black tracking-tight">Backup & Resource Export</h2>
                            <p className="text-muted-foreground text-sm">
                                Create offline (JSON) or online (RTDB Snapshot) backups. You can scope backups by Organization or Collection.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Organization</Label>
                                <Select value={targetProjectId} onValueChange={setTargetProjectId}>
                                    <SelectTrigger className="h-12 bg-background border-border">
                                        <SelectValue placeholder="All Organizations" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Organizations</SelectItem>
                                        {projects.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Collection</Label>
                                <Select value={targetCategory} onValueChange={setTargetCategory}>
                                    <SelectTrigger className="h-12 bg-background border-border">
                                        <SelectValue placeholder="All Collections" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Collections</SelectItem>
                                        {categories.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <Button variant="outline" className="h-14 font-bold text-lg rounded-xl border-2" onClick={handleExportJson}>
                                <Download className="mr-3 h-6 w-6" /> Export to JSON (Offline)
                            </Button>
                            <Button variant="default" className="h-14 font-bold text-lg rounded-xl shadow-lg shadow-primary/20" onClick={handleCreateCloudSnapshot} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : <PlusCircle className="mr-3 h-6 w-6" />}
                                Create Cloud Snapshot
                            </Button>
                        </div>
                    </TabsContent>

                    {/* RESTORE & IMPORT */}
                    <TabsContent value="restore" className="m-0 p-8 space-y-8 animate-in slide-in-from-left-2 duration-300">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black tracking-tight">System Restore & Recovery</h2>
                            <p className="text-muted-foreground text-sm">
                                Recover system state from online snapshots or external backup files.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="bg-muted/30 border-border">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2"><ArrowRightLeft className="text-primary h-5 w-5"/> Hybrid Sync</CardTitle>
                                    <CardDescription>Restore Firestore primary layer from RTDB redundancy.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button variant="outline" className="w-full h-12 bg-background font-bold" onClick={handlePullRtdbToFs} disabled={isProcessing}>
                                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />}
                                        Pull Snapshot to Firestore
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="bg-muted/30 border-border">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2"><FileUp className="text-primary h-5 w-5"/> Manual Import</CardTitle>
                                    <CardDescription>Upload an Assetain backup file to perform a bulk data merge.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="p-6 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors cursor-pointer bg-background">
                                        <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                        <div className="text-center">
                                            <p className="text-xs font-bold">Click to upload .json backup</p>
                                        </div>
                                        <Input type="file" className="hidden" accept=".json" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* DESTRUCTIVE ZONE */}
                    <TabsContent value="destructive" className="m-0 p-8 space-y-8 animate-in slide-in-from-left-2 duration-300">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black tracking-tight text-destructive">Danger Zone</h2>
                            <p className="text-muted-foreground text-sm">
                                These operations bypass standard workflows and affect cloud production databases immediately.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border-destructive/20 bg-destructive/5 shadow-none">
                                <CardHeader>
                                    <CardTitle className="text-lg text-destructive font-bold flex items-center gap-2">Wipe Firestore Assets</CardTitle>
                                    <CardDescription className="text-destructive/60">Permanently delete all asset records from the cloud primary layer.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button variant="outline" className="w-full h-12 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => openConfirmation('clear_firestore', 'Wipe Firestore?', 'This will permanently remove ALL assets from the primary cloud database.')}>
                                        Execute Primary Wipe
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="border-destructive bg-destructive/10 shadow-2xl shadow-destructive/10">
                                <CardHeader>
                                    <CardTitle className="text-xl text-destructive flex items-center gap-2 font-black uppercase tracking-tighter">Global System Reset</CardTitle>
                                    <CardDescription className="text-destructive/80 font-bold underline">Wipes Firestore, RTDB, and local IndexedDB cache.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button variant="destructive" className="w-full h-14 font-black text-lg" onClick={() => openConfirmation('nuke_all', 'GLOBAL DESTRUCTION?', 'WARNING: This will clear EVERYTHING across all cloud and local layers.')}>
                                        INITIATE GLOBAL WIPE
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </ScrollArea>
            </div>

            <DialogFooter className="px-8 py-4 bg-muted/30 border-t border-border">
                <DialogClose asChild><Button variant="ghost" className="font-bold">Close Manager</Button></DialogClose>
            </DialogFooter>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive text-2xl font-black uppercase tracking-tighter">{confirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription className="text-lg">
                      {confirmDescription}
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmAction} className="bg-destructive hover:bg-destructive/90 text-white font-bold">Confirm Destruction</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
