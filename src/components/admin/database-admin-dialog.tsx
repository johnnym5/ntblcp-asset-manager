
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
    AlertOctagon
} from 'lucide-react';
import type { Asset, AppSettings } from '@/lib/types';
import { clearLocalAssets, saveLockedOfflineAssets, saveLocalSettings } from '@/lib/idb';
import { exportFullBackupToJson, exportAssetsToJson, exportSettingsToJson } from '@/lib/json-export';
import { addNotification } from '@/hooks/use-notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
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

  const projects = useMemo(() => appSettings?.grants || [], [appSettings]);
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
    const data = filteredDocs.find(d => d.id === id)?.data;
    if (data) setEditingData({ ...data });
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

  const handleCreateCloudSnapshot = async () => {
    setIsProcessing(true);
    try {
        let assetsToBackup = allFsAssets;
        if (targetProjectId !== 'all') assetsToBackup = assetsToBackup.filter(a => a.grantId === targetProjectId);
        if (targetCategory !== 'all') assetsToBackup = assetsToBackup.filter(a => a.category === targetCategory);

        if (assetsToBackup.length > 0) {
            await batchSetAssetsRTDB(assetsToBackup);
            addNotification({ title: 'Cloud Snapshot Created', description: `${assetsToBackup.length} records pushed to Realtime Database.` });
        } else {
            toast({ title: 'No data matches the selected scope.', variant: 'destructive' });
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
        toast({ title: 'No data to export.', variant: 'destructive' });
        return;
    }

    try {
        if (targetProjectId === 'all' && targetCategory === 'all' && appSettings) {
            exportFullBackupToJson(assetsToExport, appSettings);
        } else {
            exportAssetsToJson(assetsToExport, `assetain-export-${targetProjectId}-${targetCategory}.json`);
        }
        addNotification({ title: 'Offline Backup Successful', description: `${assetsToExport.length} records saved.` });
    } catch (e) {
        toast({ title: 'Export process failed.', variant: 'destructive' });
    }
  };

  const handleExportSettings = () => {
    if (!fsSettings) {
        toast({ title: 'No settings data loaded.', variant: 'destructive' });
        return;
    }
    try {
        exportSettingsToJson(fsSettings, 'assetain-settings-backup.json');
        toast({ title: 'Settings Exported' });
    } catch (e) {
        toast({ title: 'Export Failed', variant: 'destructive' });
    }
  }

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
                addNotification({ title: 'Settings Restored' });
            }
            
            if (data.assets && Array.isArray(data.assets)) {
                await batchSetAssetsFS(data.assets);
                addNotification({ title: 'Assets Restored', description: `${data.assets.length} items merged.` });
            }
            
            fetchFsData();
        } catch (err) {
            toast({ title: 'Invalid JSON file', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };

  const handlePullRtdbToFs = async () => {
    setIsProcessing(true);
    try {
        const rtdbAssets = await getAssetsRTDB();
        if (rtdbAssets.length > 0) {
            await batchSetAssetsFS(rtdbAssets);
            addNotification({ title: 'Cloud Restore Complete', description: `${rtdbAssets.length} records recovered from Snapshot.` });
            fetchFsData();
        }
    } catch (e) {
        addNotification({ title: 'Restore Layer Failed', variant: 'destructive'});
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
            // Logic to wipe settings specifically if needed
            toast({ title: "Settings wipe requires system restart.", variant: "destructive" });
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
          <Tabs defaultValue="explorer" className="flex flex-col h-full">
            <div className="px-8 pt-8 bg-muted/30 border-b border-border">
                <DialogHeader className="mb-8">
                    <DialogTitle className="flex items-center gap-3 text-3xl font-black tracking-tight text-foreground">
                        <ShieldCheck className="text-primary h-10 w-10"/> Assetain Infrastructure Console
                    </DialogTitle>
                    <DialogDescription className="text-base font-medium text-muted-foreground">
                        Cloud Database Management, Recovery & Governance Tool
                    </DialogDescription>
                </DialogHeader>
                
                <TabsList className="bg-transparent h-auto p-0 gap-10 justify-start border-b-0">
                    <TabsTrigger value="explorer" className="rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground font-bold px-0 pb-4 h-auto transition-all uppercase text-xs tracking-[0.2em]">
                        <LayoutGrid className="mr-2 h-4 w-4"/> Explorer
                    </TabsTrigger>
                    <TabsTrigger value="backup" className="rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground font-bold px-0 pb-4 h-auto transition-all uppercase text-xs tracking-[0.2em]">
                        <Download className="mr-2 h-4 w-4"/> Backup & Export
                    </TabsTrigger>
                    <TabsTrigger value="restore" className="rounded-none border-b-4 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground font-bold px-0 pb-4 h-auto transition-all uppercase text-xs tracking-[0.2em]">
                        <RefreshCw className="mr-2 h-4 w-4"/> Restore Layer
                    </TabsTrigger>
                    <TabsTrigger value="destructive" className="rounded-none border-b-4 border-transparent data-[state=active]:border-destructive data-[state=active]:bg-transparent data-[state=active]:text-destructive text-muted-foreground font-bold px-0 pb-4 h-auto transition-all uppercase text-xs tracking-[0.2em]">
                        <AlertOctagon className="mr-2 h-4 w-4"/> Danger Zone
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="flex-1 overflow-hidden bg-background">
                {/* DATABASE EXPLORER */}
                <TabsContent value="explorer" className="m-0 h-full flex flex-col animate-in fade-in duration-500">
                    <div className="bg-muted/10 border-b px-6 py-4 flex items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <Badge variant="outline" className="h-10 px-4 font-black uppercase tracking-widest text-[11px] bg-background border-2">
                                <DatabaseIcon className="mr-2 h-4 w-4 text-primary"/> (default)
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
                        <Button size="sm" variant="outline" className="h-10 font-bold bg-background border-2 px-6" onClick={fetchFsData} disabled={isFsLoading}>
                            <RefreshCw className={cn("mr-2 h-4 w-4", isFsLoading && "animate-spin")} /> Refresh
                        </Button>
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
                                    <Button 
                                        size="sm" 
                                        className="h-10 font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 px-6" 
                                        onClick={handleSaveDoc}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                        Commit Changes
                                    </Button>
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
                                                            Nested objects/arrays must be managed via application forms.
                                                        </div>
                                                    ) : (
                                                        <Input 
                                                            value={String(value)}
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
                </TabsContent>

                <ScrollArea className="flex-1 h-full">
                    {/* BACKUP & EXPORT */}
                    <TabsContent value="backup" className="m-0 p-10 space-y-10 animate-in slide-in-from-left-4 duration-500">
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black tracking-tight">System Data Export</h2>
                            <p className="text-muted-foreground font-medium text-base">
                                Export your asset records and application settings to JSON format for offline storage.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <Card className="rounded-[2rem] border-2 shadow-sm">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle className="text-xl font-black flex items-center gap-3"><FileText className="text-primary h-6 w-6"/> Asset Inventory Export</CardTitle>
                                    <CardDescription>Target specific projects or categories for export.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 pt-4 space-y-6">
                                    <div className="space-y-4">
                                        <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Target Project</Label>
                                        <Select value={targetProjectId} onValueChange={setTargetProjectId}>
                                            <SelectTrigger className="h-12 bg-background border-2 rounded-xl font-bold">
                                                <SelectValue placeholder="All Available Projects" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="all" className="font-bold">Global Scope</SelectItem>
                                                {projects.map(p => (
                                                    <SelectItem key={p.id} value={p.id} className="font-bold">{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button variant="default" className="w-full h-14 font-black rounded-xl shadow-xl shadow-primary/20" onClick={handleExportJson}>
                                        <Download className="mr-3 h-5 w-5" /> Export Selection (JSON)
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="rounded-[2rem] border-2 shadow-sm">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle className="text-xl font-black flex items-center gap-3"><Settings2 className="text-primary h-6 w-6"/> System Configuration Export</CardTitle>
                                    <CardDescription>Export user accounts, roles, and sheet definitions.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 pt-4 flex flex-col justify-center h-[180px]">
                                    <Button variant="outline" className="w-full h-14 font-black rounded-xl border-2" onClick={handleExportSettings}>
                                        <Settings className="mr-3 h-5 w-5" /> Export Settings Backup
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* RESTORE & IMPORT */}
                    <TabsContent value="restore" className="m-0 p-10 space-y-10 animate-in slide-in-from-left-4 duration-500">
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black tracking-tight">System Recovery & Layer Sync</h2>
                            <p className="text-muted-foreground font-medium text-base">
                                Recover Firestore state from Realtime Database snapshots or external JSON backups.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <Card className="bg-muted/10 border-2 rounded-[2rem] overflow-hidden">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle className="text-xl font-black flex items-center gap-3"><RefreshCw className="text-primary h-6 w-6"/> Snapshot Recovery</CardTitle>
                                    <CardDescription className="text-sm font-medium">Overwrite Firestore primary layer with RTDB redundancy data.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 pt-4">
                                    <Button variant="outline" className="w-full h-14 bg-background font-black rounded-xl border-2 text-base" onClick={handlePullRtdbToFs} disabled={isProcessing}>
                                        {isProcessing ? <Loader2 className="mr-3 h-5 w-5 animate-spin"/> : <RefreshCw className="mr-3 h-5 w-5" />}
                                        Execute Recovery Sync
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="bg-muted/10 border-2 rounded-[2rem] overflow-hidden">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle className="text-xl font-black flex items-center gap-3"><FileUp className="text-primary h-6 w-6"/> JSON Backup Import</CardTitle>
                                    <CardDescription className="text-sm font-medium">Upload an Assetain backup file to perform a cloud merge.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 pt-4">
                                    <div 
                                        className="p-10 border-4 border-dashed border-border rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-all cursor-pointer bg-background group"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <UploadCloud className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-all group-hover:scale-110 duration-300" />
                                        <div className="text-center">
                                            <p className="text-sm font-black uppercase tracking-widest">Select .json file</p>
                                        </div>
                                        <Input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportJson} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* DESTRUCTIVE ZONE */}
                    <TabsContent value="destructive" className="m-0 p-10 space-y-10 animate-in slide-in-from-left-4 duration-500">
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black tracking-tight text-destructive">Maintenance Danger Zone</h2>
                            <p className="text-muted-foreground font-medium text-base">
                                High-impact operations that affect cloud production databases immediately. Use with extreme caution.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Card className="border-destructive/30 bg-destructive/5 shadow-none rounded-[2rem] border-2">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle className="text-xl text-destructive font-black flex items-center gap-3">Wipe Primary Assets</CardTitle>
                                    <CardDescription className="text-destructive/70 font-bold">Permanently remove ALL asset records from Firestore.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 pt-4">
                                    <Button variant="outline" className="w-full h-14 border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-all rounded-xl font-black uppercase tracking-widest text-xs" onClick={() => openConfirmation('clear_firestore', 'Wipe Cloud Data?', 'This will permanently remove ALL assets from Firestore. This cannot be undone.')}>
                                        Execute Asset Wipe
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="border-destructive/30 bg-destructive/5 shadow-none rounded-[2rem] border-2">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle className="text-xl text-destructive font-black flex items-center gap-3">Wipe Configuration</CardTitle>
                                    <CardDescription className="text-destructive/70 font-bold">Clear all system settings, users, and sheet layouts.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 pt-4">
                                    <Button variant="outline" className="w-full h-14 border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-all rounded-xl font-black uppercase tracking-widest text-xs" onClick={() => openConfirmation('clear_settings', 'Reset All Settings?', 'This will wipe your system configuration. You will need to restore from a backup or re-initialize.')}>
                                        Reset System Config
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="col-span-full border-destructive bg-destructive/10 shadow-2xl shadow-destructive/20 rounded-[2rem] border-2">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle className="text-2xl text-destructive flex items-center gap-3 font-black uppercase tracking-tighter">Global System Purge</CardTitle>
                                    <CardDescription className="text-destructive/80 font-black underline">Clears Firestore, RTDB, and all local caches across the platform.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 pt-4">
                                    <Button variant="destructive" className="w-full h-16 font-black text-xl rounded-xl shadow-2xl shadow-destructive/30 uppercase tracking-widest" onClick={() => openConfirmation('nuke_all', 'INITIATE GLOBAL WIPE?', 'WARNING: This will clear EVERYTHING across all cloud and local layers. The system will reset to factory state.')}>
                                        Execute Total Destruction
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </ScrollArea>
            </div>

            <DialogFooter className="px-10 py-6 bg-muted/30 border-t border-border">
                <DialogClose asChild><Button variant="ghost" className="font-black uppercase tracking-widest text-xs h-12 px-8">Exit Infrastructure Console</Button></DialogClose>
            </DialogFooter>
          </Tabs>
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
