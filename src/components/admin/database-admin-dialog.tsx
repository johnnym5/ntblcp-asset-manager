
"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/app-state-context';
import { 
    getAssets as getAssetsFS, 
    batchSetAssets as batchSetAssetsFS, 
    clearAssets as clearFirestoreAssets, 
    setAsset as setAssetFS,
    deleteAsset as deleteAssetFS,
    batchDeleteAssets as batchDeleteAssetsFS,
    getSettings as getSettingsFS,
    updateSettings as updateSettingsFS
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
    ShieldCheck, 
    PlusCircle, 
    Database, 
    UploadCloud,
    ChevronRight,
    FileText,
    Settings,
    Edit3,
    CheckSquare,
    Square,
    FilePlus,
    XCircle,
    LayoutGrid,
    DatabaseIcon,
    History,
    Save,
    Settings2,
    HardDriveDownload,
    AlertOctagon,
    Plus,
    ArrowRightLeft,
    MoreVertical,
    Zap,
    ArchiveRestore
} from 'lucide-react';
import type { Asset, AppSettings } from '@/lib/types';
import { clearLocalAssets, saveLockedOfflineAssets, saveLocalSettings } from '@/lib/idb';
import { exportFullBackupToJson, exportAssetsToJson, exportSettingsToJson } from '@/lib/json-export';
import { addNotification } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { Switch } from '../ui/switch';

interface DatabaseAdminDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type CollectionType = 'assets' | 'config';

export function DatabaseAdminDialog({ isOpen, onOpenChange }: DatabaseAdminDialogProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAssets, setOfflineAssets, setAppSettings } = useAppState();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDescription, setConfirmDescription] = useState('');

  // Firestore Browser State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<CollectionType>('assets');
  const [allFsAssets, setAllFsAssets] = useState<Asset[]>([]);
  const [fsSettings, setFsSettings] = useState<any>(null);
  const [isFsLoading, setIsFsLoading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [editingData, setEditingData] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        toast({ title: 'Error fetching Cloud data', variant: 'destructive' });
    } finally {
        setIsFsLoading(false);
    }
  }, [selectedCollection, toast]);

  useEffect(() => {
    if (isOpen) fetchFsData();
  }, [isOpen, fetchFsData]);

  const categories = useMemo(() => {
    const uniqueCats = new Set<string>();
    allFsAssets.forEach(a => { if(a.category) uniqueCats.add(a.category) });
    return Array.from(uniqueCats).sort();
  }, [allFsAssets]);

  const filteredDocs = useMemo(() => {
    if (selectedCollection === 'config') {
        return fsSettings ? [{ id: 'settings', data: fsSettings, title: 'Application Settings' }] : [];
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
    return base.map(a => ({ id: a.id, data: a, title: a.description || a.id }));
  }, [allFsAssets, fsSettings, searchQuery, selectedCollection]);

  const handleSelectDoc = (id: string) => {
    setSelectedDocId(id);
    const docItem = filteredDocs.find(d => d.id === id);
    if (docItem) setEditingData({ ...docItem.data });
  };

  const handleUpdateField = (key: string, value: any) => {
    setEditingData((prev: any) => ({
        ...prev,
        [key]: value
    }));
  };

  const handleSaveDoc = async () => {
    if (!selectedDocId || !editingData) return;
    setIsProcessing(true);
    try {
        if (selectedCollection === 'assets') {
            await setAssetFS(editingData);
            toast({ title: 'Asset record updated successfully.' });
        } else {
            await updateSettingsFS(editingData);
            toast({ title: 'System configuration saved.' });
        }
        fetchFsData();
    } catch (e) {
        toast({ title: 'Failed to commit changes to cloud.', variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleCreateNewDoc = async () => {
    setIsProcessing(true);
    try {
        if (selectedCollection === 'assets') {
            const newAsset: Asset = {
                id: crypto.randomUUID(),
                category: categories[0] || 'Uncategorized',
                description: 'New Cloud Asset',
                lastModified: new Date().toISOString(),
                verifiedStatus: 'Unverified'
            };
            await setAssetFS(newAsset);
            toast({ title: 'Blank asset created.' });
        } else {
            toast({ title: 'New config records cannot be created manually.', variant: 'destructive' });
        }
        fetchFsData();
    } catch (e) {
        toast({ title: 'Creation failed.', variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    setIsFsLoading(true);
    try {
        if (selectedCollection === 'assets') {
            await deleteAssetFS(id);
            toast({ title: 'Document removed.' });
        } else {
            toast({ title: 'Config records cannot be individualy deleted.', variant: 'destructive' });
        }
        setSelectedDocId(null);
        fetchFsData();
    } catch (e) {
        toast({ title: 'Operation failed.', variant: 'destructive' });
    } finally {
        setIsFsLoading(false);
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedDocIds.length === 0) return;
    setIsFsLoading(true);
    try {
        if (selectedCollection === 'assets') {
            await batchDeleteAssetsFS(selectedDocIds);
            toast({ title: `${selectedDocIds.length} assets removed.` });
        } else {
            toast({ title: 'Config records cannot be bulk deleted.', variant: 'destructive' });
        }
        setSelectedDocIds([]);
        fetchFsData();
        setSelectedDocId(null);
    } catch (e) {
        toast({ title: 'Bulk operation failed.', variant: 'destructive' });
    } finally {
        setIsFsLoading(false);
    }
  };

  // --- INTEGRATED CLOUD ACTIONS ---
  const handleCreateCloudSnapshot = async () => {
    setIsProcessing(true);
    try {
        if (allFsAssets.length > 0) {
            await batchSetAssetsRTDB(allFsAssets);
            addNotification({ title: 'Cloud Snapshot Success', description: `${allFsAssets.length} records pushed to Realtime Database backup.` });
        } else {
            toast({ title: 'No Firestore data found to backup.', variant: 'destructive' });
        }
    } catch (e) {
        addNotification({ title: 'Snapshot Failed', variant: 'destructive'});
    }
    setIsProcessing(false);
  };

  const handlePullRtdbToFs = async () => {
    setIsProcessing(true);
    try {
        const rtdbAssets = await getAssetsRTDB();
        if (rtdbAssets.length > 0) {
            await batchSetAssetsFS(rtdbAssets);
            addNotification({ title: 'Cloud Restore Complete', description: `${rtdbAssets.length} records recovered from RTDB Snapshot.` });
            fetchFsData();
        } else {
            toast({ title: 'No snapshot data found in RTDB layer.', variant: 'destructive' });
        }
    } catch (e) {
        addNotification({ title: 'Restore Layer Failed', variant: 'destructive'});
    }
    setIsProcessing(false);
  };

  const handleExportJson = () => {
    if (allFsAssets.length === 0) {
        toast({ title: 'No asset data to export.', variant: 'destructive' });
        return;
    }
    try {
        if (appSettings) {
            exportFullBackupToJson(allFsAssets, appSettings, 'assetain-full-backup.json');
        } else {
            exportAssetsToJson(allFsAssets, `assetain-assets-export.json`);
        }
        addNotification({ title: 'Offline Backup Successful', description: `${allFsAssets.length} records saved to file.` });
    } catch (e) {
        toast({ title: 'Export process failed.', variant: 'destructive' });
    }
  };

  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target?.result as string);
            setIsProcessing(true);
            
            if (data.settings) {
                await updateSettingsFS(data.settings);
                await saveLocalSettings(data.settings);
                setAppSettings(data.settings);
                addNotification({ title: 'System Settings Restored' });
            }
            
            if (data.assets && Array.isArray(data.assets)) {
                await batchSetAssetsFS(data.assets);
                addNotification({ title: 'Assets Restored', description: `${data.assets.length} items merged into Firestore.` });
            }
            
            fetchFsData();
        } catch (err) {
            toast({ title: 'Invalid JSON structure.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };

  // --- DESTRUCTIVE ---
  const handleNukeAll = async () => {
    setIsProcessing(true);
    try {
      await clearLocalAssets();
      await saveLockedOfflineAssets([]);
      setAssets([]);
      setOfflineAssets([]);
      await clearFirestoreAssets();
      await clearRtdbAssets();
      addNotification({ title: "GLOBAL SYSTEM PURGE COMPLETE", description: "All database layers cleared.", variant: 'destructive' });
      fetchFsData();
    } catch (e) {
      addNotification({ title: 'Wipe Failure', variant: 'destructive'});
    }
    setIsProcessing(false);
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    const action = confirmAction;
    setConfirmAction(null);
    switch(action) {
        case 'nuke_all': handleNukeAll(); break;
        case 'clear_firestore': 
            clearFirestoreAssets().then(() => fetchFsData()); 
            break;
        case 'clear_settings':
            toast({ title: "Configuration reset requires system re-initialization.", variant: "destructive" });
            break;
        default: break;
    }
  }

  const allSelected = filteredDocs.length > 0 && selectedDocIds.length === filteredDocs.length;

  if (userProfile?.loginName !== 'admin') return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[1400px] flex flex-col h-[95vh] p-0 overflow-hidden bg-background border-border shadow-2xl">
            <div className="px-8 pt-8 bg-muted/30 border-b border-border">
                <DialogHeader className="mb-6">
                    <DialogTitle className="flex items-center gap-3 text-3xl font-black tracking-tight text-foreground">
                        <ShieldCheck className="text-primary h-10 w-10"/> Infrastructure Console
                    </DialogTitle>
                    <DialogDescription className="text-base font-medium text-muted-foreground">
                        Unified Firestore Management & Multi-Layer Data Operations
                    </DialogDescription>
                </DialogHeader>
                
                {/* UNIFIED COMMAND TOOLBAR */}
                <div className="flex flex-wrap items-center gap-2 pb-6">
                    <div className="flex items-center gap-1 bg-background border rounded-xl p-1.5 shadow-sm">
                        <Button variant="ghost" size="sm" className="h-9 font-bold text-xs" onClick={handleCreateCloudSnapshot} disabled={isProcessing}>
                            <Zap className="mr-2 h-4 w-4 text-primary fill-primary/20"/> Cloud Snapshot (FS &rarr; RTDB)
                        </Button>
                        <Separator orientation="vertical" className="h-4 mx-1"/>
                        <Button variant="ghost" size="sm" className="h-9 font-bold text-xs" onClick={handlePullRtdbToFs} disabled={isProcessing}>
                            <ArchiveRestore className="mr-2 h-4 w-4 text-primary"/> Cloud Restore (RTDB &rarr; FS)
                        </Button>
                    </div>

                    <div className="flex items-center gap-1 bg-background border rounded-xl p-1.5 shadow-sm">
                        <Button variant="ghost" size="sm" className="h-9 font-bold text-xs" onClick={handleExportJson}>
                            <Download className="mr-2 h-4 w-4 text-blue-500"/> Export to JSON
                        </Button>
                        <Separator orientation="vertical" className="h-4 mx-1"/>
                        <Button variant="ghost" size="sm" className="h-9 font-bold text-xs" onClick={() => fileInputRef.current?.click()}>
                            <FileUp className="mr-2 h-4 w-4 text-blue-500"/> Import JSON Merge
                        </Button>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportJson} />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-12 px-6 font-black uppercase tracking-widest text-[10px] border-destructive/20 text-destructive hover:bg-destructive/10">
                                <AlertOctagon className="mr-2 h-4 w-4"/> Danger Zone <MoreVertical className="ml-2 h-3 w-3"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64 p-2 shadow-2xl border-destructive/20">
                            <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest text-destructive/60 mb-1">Destructive Operations</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openConfirmation('clear_firestore', 'Wipe Assets?', 'Permanently remove ALL assets from Firestore.')} className="h-10 text-destructive font-bold focus:bg-destructive focus:text-white rounded-lg">
                                <Trash2 className="mr-2 h-4 w-4"/> Wipe Primary Assets
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openConfirmation('clear_settings', 'Reset Config?', 'Wipe all settings and user permissions.')} className="h-10 text-destructive font-bold focus:bg-destructive focus:text-white rounded-lg">
                                <Settings2 className="mr-2 h-4 w-4"/> Wipe System Config
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openConfirmation('nuke_all', 'GLOBAL PURGE?', 'Clear EVERY database layer (Local, FS, RTDB).')} className="h-12 bg-destructive/10 text-destructive font-black uppercase tracking-widest text-[10px] focus:bg-destructive focus:text-white rounded-lg">
                                <AlertOctagon className="mr-2 h-4 w-4"/> Execute Total Destruction
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden bg-background">
                {/* EXPLORER SUB-HEADER */}
                <div className="bg-muted/10 border-b px-6 py-4 flex items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <Badge variant="outline" className="h-10 px-4 font-black uppercase tracking-widest text-[11px] bg-background border-2">
                            <DatabaseIcon className="mr-2 h-4 w-4 text-primary"/> Firestore (default)
                        </Badge>
                        <div className="h-6 w-px bg-border"/>
                        <div className="relative w-[400px]">
                            <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Filter documents by ID or description..." 
                                className="pl-12 h-10 bg-background border-border font-medium shadow-sm" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {selectedDocIds.length > 0 && (
                            <div className="flex items-center gap-3 animate-in slide-in-from-left-4">
                                <Badge variant="default" className="h-10 font-black uppercase text-[11px] tracking-widest bg-primary px-4">
                                    {selectedDocIds.length} Selected
                                </Badge>
                                <Button size="sm" variant="destructive" className="h-10 font-black uppercase text-[11px] tracking-[0.1em] shadow-xl shadow-destructive/20 px-6" onClick={handleDeleteMultiple}>
                                    <Trash2 className="mr-2 h-4 w-4"/> Bulk Delete
                                </Button>
                                <Button size="icon" variant="ghost" className="h-10 w-10 hover:bg-muted" onClick={() => setSelectedDocIds([])}>
                                    <XCircle className="h-5 w-5"/>
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button size="sm" variant="outline" className="h-10 font-bold bg-background border-2 px-6" onClick={fetchFsData} disabled={isFsLoading}>
                            <RefreshCw className={cn("mr-2 h-4 w-4", isFsLoading && "animate-spin")} /> Refresh
                        </Button>
                        <Button size="sm" className="h-10 font-bold px-6 shadow-lg shadow-primary/20" onClick={handleCreateNewDoc} disabled={selectedCollection !== 'assets' || isProcessing}>
                            <Plus className="mr-2 h-4 w-4"/> Add Document
                        </Button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden divide-x border-b">
                    {/* Column 1: Collections */}
                    <div className="w-[280px] flex flex-col bg-muted/5">
                        <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/10">
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <LayoutGrid className="h-3 w-3"/> Collections
                            </span>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-2 space-y-1">
                                <button 
                                    className={cn(
                                        "w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center transition-all",
                                        selectedCollection === 'assets' ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-muted text-muted-foreground"
                                    )}
                                    onClick={() => { setSelectedCollection('assets'); setSelectedDocId(null); setSelectedDocIds([]); }}
                                >
                                    <FileText className="mr-3 h-4 w-4"/> assets
                                    <ChevronRight className={cn("ml-auto h-4 w-4 transition-transform", selectedCollection === 'assets' && "rotate-90")}/>
                                </button>
                                <button 
                                    className={cn(
                                        "w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center transition-all",
                                        selectedCollection === 'config' ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-muted text-muted-foreground"
                                    )}
                                    onClick={() => { setSelectedCollection('config'); setSelectedDocId(null); setSelectedDocIds([]); }}
                                >
                                    <Settings className="mr-3 h-4 w-4"/> config
                                    <ChevronRight className={cn("ml-auto h-4 w-4 transition-transform", selectedCollection === 'config' && "rotate-90")}/>
                                </button>
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Column 2: Documents */}
                    <div className="w-[450px] flex flex-col bg-background">
                        <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/10">
                            <div className="flex items-center gap-4">
                                <Checkbox 
                                    checked={allSelected} 
                                    onCheckedChange={(c) => {
                                        if (c) setSelectedDocIds(filteredDocs.map(d => d.id));
                                        else setSelectedDocIds([]);
                                    }}
                                    disabled={filteredDocs.length === 0}
                                />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Documents ({filteredDocs.length})</span>
                            </div>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-2 space-y-1">
                                {filteredDocs.map(doc => (
                                    <div 
                                        key={doc.id}
                                        className={cn(
                                            "w-full flex items-center group transition-all rounded-lg overflow-hidden border border-transparent",
                                            selectedDocId === doc.id ? "bg-primary/10 border-primary/20" : "hover:bg-muted/50"
                                        )}
                                    >
                                        <div className="px-4">
                                            <Checkbox 
                                                checked={selectedDocIds.includes(doc.id)}
                                                onCheckedChange={(c) => {
                                                    setSelectedDocIds(prev => c ? [...prev, doc.id] : prev.filter(i => i !== doc.id));
                                                }}
                                            />
                                        </div>
                                        <button 
                                            className={cn(
                                                "flex-1 text-left py-4 pr-4 flex flex-col min-w-0",
                                                selectedDocId === doc.id ? "text-primary font-bold" : "text-foreground"
                                            )}
                                            onClick={() => handleSelectDoc(doc.id)}
                                        >
                                            <span className="text-sm truncate font-bold">{doc.title}</span>
                                            <span className="text-[10px] font-mono text-muted-foreground truncate uppercase tracking-tighter opacity-70">{doc.id}</span>
                                        </button>
                                    </div>
                                ))}
                                {filteredDocs.length === 0 && (
                                    <div className="p-12 text-center text-sm text-muted-foreground italic font-medium">No records matching query</div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Column 3: Data Editor */}
                    <div className="flex-1 flex flex-col bg-muted/5">
                        <div className="px-6 py-3 border-b flex items-center justify-between bg-muted/10">
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Data Editor:</span>
                                <span className="text-xs font-mono font-black text-primary truncate max-w-[300px]">{selectedDocId || 'none'}</span>
                            </div>
                            {selectedDocId && (
                                <div className="flex items-center gap-2">
                                    <Button 
                                        size="sm" 
                                        variant="ghost"
                                        className="h-10 text-destructive hover:text-destructive hover:bg-destructive/10 font-bold uppercase text-[11px] px-4"
                                        onClick={() => handleDeleteSingle(selectedDocId)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4"/> Delete Doc
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        className="h-10 font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 px-6" 
                                        onClick={handleSaveDoc}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                        Commit Changes
                                    </Button>
                                </div>
                            )}
                        </div>
                        
                        <ScrollArea className="flex-1">
                            {selectedDocId ? (
                                <div className="p-8">
                                    <div className="space-y-6">
                                        {editingData && Object.entries(editingData).map(([key, value]) => (
                                            <div key={key} className="space-y-2 group">
                                                <div className="flex items-center justify-between px-1">
                                                    <Label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40"/> {key}
                                                    </Label>
                                                    <Badge variant="outline" className="text-[9px] font-mono opacity-50 px-1.5 h-4 uppercase">{typeof value}</Badge>
                                                </div>
                                                
                                                {typeof value === 'boolean' ? (
                                                    <div className="flex items-center gap-3 p-4 rounded-xl border-2 bg-background shadow-sm group-focus-within:border-primary transition-all">
                                                        <Switch 
                                                            checked={value} 
                                                            onCheckedChange={(checked) => handleUpdateField(key, checked)}
                                                        />
                                                        <span className="text-sm font-bold">{value ? 'ENABLED' : 'DISABLED'}</span>
                                                    </div>
                                                ) : typeof value === 'object' ? (
                                                    <div className="p-4 rounded-xl border-2 bg-muted/30 font-mono text-xs text-muted-foreground border-dashed">
                                                        Nested objects/arrays must be managed via specific application forms.
                                                    </div>
                                                ) : (
                                                    <Input 
                                                        value={String(value || '')}
                                                        onChange={(e) => handleUpdateField(key, e.target.value)}
                                                        className="h-12 bg-background border-2 font-bold text-sm focus-visible:ring-0 focus-visible:border-primary transition-all shadow-sm rounded-xl"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30">
                                    <DatabaseZap className="h-24 w-24 mb-6 opacity-20" />
                                    <p className="text-2xl font-black uppercase tracking-[0.3em] opacity-20">No Document Selected</p>
                                    <p className="text-sm font-medium mt-2">Select a record from the center column to view and edit its fields.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </div>

            <DialogFooter className="px-10 py-6 bg-muted/30 border-t border-border">
                <DialogClose asChild><Button variant="ghost" className="font-black uppercase tracking-widest text-xs h-12 px-8">Exit Infrastructure Console</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent className="rounded-[2rem] border-destructive/20 shadow-2xl p-8 bg-background">
              <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive text-3xl font-black uppercase tracking-tighter">{confirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription className="text-lg font-bold leading-relaxed pt-2">
                      {confirmDescription}
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-8 gap-4">
                  <AlertDialogCancel className="rounded-xl font-black h-14 px-8 uppercase tracking-widest text-xs">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmAction} className="bg-destructive hover:bg-destructive/90 text-white font-black rounded-xl uppercase tracking-widest px-10 h-14 text-xs">Confirm Operation</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );

  function openConfirmation(action: string, title: string, description: string) {
    setConfirmAction(action);
    setConfirmTitle(title);
    setConfirmDescription(description);
  }
}
