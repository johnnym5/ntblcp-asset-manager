
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
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
    ArchiveRestore,
    ListFilter,
    ArrowUpCircle,
    ArrowDownCircle,
    Layers,
    ChevronLeft,
    FolderPlus,
    MinusCircle
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface DatabaseAdminDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type AdminView = 'explorer' | 'indexes';
type MobileViewStep = 'collections' | 'documents' | 'editor';

export function DatabaseAdminDialog({ isOpen, onOpenChange }: DatabaseAdminDialogProps) {
  const { userProfile } = useAuth();
  const { appSettings, setAssets, setOfflineAssets, setAppSettings } = useAppState();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [activeView, setActiveView] = useState<AdminView>('explorer');
  const [mobileStep, setMobileStep] = useState<MobileViewStep>('collections');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDescription, setConfirmDescription] = useState('');

  // Firestore Browser State
  const [searchQuery, setSearchQuery] = useState('');
  const [collections, setCollections] = useState<string[]>(['assets', 'config']);
  const [selectedCollection, setSelectedCollection] = useState<string>('assets');
  const [documents, setDocuments] = useState<{ id: string, data: any, title: string }[]>([]);
  const [isFsLoading, setIsFsLoading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [editingData, setEditingData] = useState<any>(null);

  // New Field State
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // New Collection State
  const [isNewCollectionDialogOpen, setIsNewCollectionDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFsData = useCallback(async () => {
    if (!db) return;
    setIsFsLoading(true);
    try {
        const colRef = collection(db, selectedCollection);
        const snapshot = await getDocs(colRef);
        const docs = snapshot.docs.map(doc => {
            const data = doc.data();
            let title = doc.id;
            if (selectedCollection === 'assets') title = data.description || doc.id;
            if (selectedCollection === 'config' && doc.id === 'settings') title = 'Application Settings';
            return { id: doc.id, data, title };
        });
        setDocuments(docs);
    } catch (e) {
        toast({ title: 'Error fetching Cloud data', variant: 'destructive' });
    } finally {
        setIsFsLoading(false);
    }
  }, [selectedCollection, toast]);

  useEffect(() => {
    if (isOpen) fetchFsData();
  }, [isOpen, fetchFsData]);

  const filteredDocs = useMemo(() => {
    if (!searchQuery) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter(d => 
        d.title.toLowerCase().includes(q) || 
        d.id.toLowerCase().includes(q) ||
        JSON.stringify(d.data).toLowerCase().includes(q)
    );
  }, [documents, searchQuery]);

  const handleSelectDoc = (id: string) => {
    setSelectedDocId(id);
    const docItem = documents.find(d => d.id === id);
    if (docItem) setEditingData({ ...docItem.data });
    if (isMobile) setMobileStep('editor');
  };

  const handleUpdateField = (key: string, value: any) => {
    setEditingData((prev: any) => ({
        ...prev,
        [key]: value
    }));
  };

  const handleAddField = () => {
    if (!newFieldKey.trim()) return;
    setEditingData((prev: any) => ({
        ...prev,
        [newFieldKey.trim()]: newFieldValue
    }));
    setNewFieldKey('');
    setNewFieldValue('');
  };

  const handleRemoveField = (key: string) => {
    const newData = { ...editingData };
    delete newData[key];
    setEditingData(newData);
  };

  const handleSaveDoc = async () => {
    if (!selectedDocId || !editingData || !db) return;
    setIsProcessing(true);
    try {
        const docRef = doc(db, selectedCollection, selectedDocId);
        await setDoc(docRef, editingData);
        toast({ title: 'Document updated successfully.' });
        fetchFsData();
    } catch (e) {
        toast({ title: 'Failed to commit changes to cloud.', variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleCreateNewDoc = async () => {
    if (!db) return;
    setIsProcessing(true);
    try {
        const newId = crypto.randomUUID();
        const docRef = doc(db, selectedCollection, newId);
        const initialData = selectedCollection === 'assets' ? {
            id: newId,
            description: 'New Cloud Asset',
            lastModified: new Date().toISOString(),
            verifiedStatus: 'Unverified'
        } : { id: newId, createdAt: new Date().toISOString() };
        
        await setDoc(docRef, initialData);
        toast({ title: 'Document created.' });
        fetchFsData();
    } catch (e) {
        toast({ title: 'Creation failed.', variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleCreateNewCollection = async () => {
    if (!newCollectionName.trim() || !db) return;
    setIsProcessing(true);
    try {
        const docRef = doc(db, newCollectionName.trim(), 'init_doc');
        await setDoc(docRef, { description: "Collection initialized via console", createdAt: new Date().toISOString() });
        setCollections(prev => [...new Set([...prev, newCollectionName.trim()])]);
        setSelectedCollection(newCollectionName.trim());
        setNewCollectionName('');
        setIsNewCollectionDialogOpen(false);
        toast({ title: 'Collection created.' });
        fetchFsData();
    } catch (e) {
        toast({ title: 'Failed to create collection.', variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!db) return;
    setIsFsLoading(true);
    try {
        await deleteDoc(doc(db, selectedCollection, id));
        toast({ title: 'Document removed.' });
        setSelectedDocId(null);
        if (isMobile) setMobileStep('documents');
        fetchFsData();
    } catch (e) {
        toast({ title: 'Operation failed.', variant: 'destructive' });
    } finally {
        setIsFsLoading(false);
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedDocIds.length === 0 || !db) return;
    setIsFsLoading(true);
    try {
        for (const id of selectedDocIds) {
            await deleteDoc(doc(db, selectedCollection, id));
        }
        toast({ title: `${selectedDocIds.length} documents removed.` });
        setSelectedDocIds([]);
        fetchFsData();
        setSelectedDocId(null);
        if (isMobile) setMobileStep('documents');
    } catch (e) {
        toast({ title: 'Bulk operation failed.', variant: 'destructive' });
    } finally {
        setIsFsLoading(false);
    }
  };

  const handleBulkExport = () => {
    if (selectedDocIds.length === 0) return;
    try {
        const dataToExport = documents.filter(d => selectedDocIds.includes(d.id)).map(d => d.data);
        exportAssetsToJson(dataToExport, `assetain-bulk-export-${new Date().getTime()}.json`);
        addNotification({ title: 'Bulk Export Success', description: `${dataToExport.length} records saved to JSON.` });
    } catch (e) {
        toast({ title: 'Export failed.', variant: 'destructive' });
    }
  };

  // --- INTEGRATED CLOUD ACTIONS ---
  const handleCreateCloudSnapshot = async () => {
    setIsProcessing(true);
    try {
        const data = documents.map(d => d.data);
        if (data.length > 0) {
            await batchSetAssetsRTDB(data);
            addNotification({ title: 'Cloud Snapshot Success', description: `${data.length} records pushed to Realtime Database backup.` });
        } else {
            toast({ title: 'No data found to backup.', variant: 'destructive' });
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
    const data = documents.map(d => d.data);
    if (data.length === 0) {
        toast({ title: 'No data to export.', variant: 'destructive' });
        return;
    }
    try {
        exportAssetsToJson(data, `assetain-${selectedCollection}-export.json`);
        addNotification({ title: 'Export Successful', description: `${data.length} records saved.` });
    } catch (e) {
        toast({ title: 'Export failed.', variant: 'destructive' });
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
            const assets = Array.isArray(data) ? data : (data.assets || []);
            if (assets.length > 0) {
                await batchSetAssetsFS(assets);
                addNotification({ title: 'Data Restored', description: `${assets.length} items merged.` });
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

  const handleNukeAll = async () => {
    setIsProcessing(true);
    try {
      await clearLocalAssets();
      await saveLockedOfflineAssets([]);
      setAssets([]);
      setOfflineAssets([]);
      await clearFirestoreAssets();
      await clearRtdbAssets();
      addNotification({ title: "GLOBAL SYSTEM PURGE COMPLETE", description: "All layers cleared.", variant: 'destructive' });
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
        case 'clear_firestore': clearFirestoreAssets().then(() => fetchFsData()); break;
        default: break;
    }
  };

  const allSelected = filteredDocs.length > 0 && selectedDocIds.length === filteredDocs.length;

  if (userProfile?.loginName !== 'admin') return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[1400px] w-full sm:w-[95vw] flex flex-col h-[100vh] sm:h-[95vh] p-0 overflow-hidden bg-background border-border shadow-2xl rounded-none sm:rounded-xl">
            <div className="px-4 sm:px-8 pt-4 sm:pt-8 bg-muted/30 border-b border-border">
                <div className="flex flex-col sm:flex-row items-start justify-between mb-4 sm:mb-6 gap-4">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                            <ShieldCheck className="text-primary h-8 w-8 sm:h-10 sm:w-10"/> Infrastructure
                        </DialogTitle>
                        <DialogDescription className="text-sm sm:text-base font-medium text-muted-foreground hidden sm:block">
                            Cloud Data Workstation & Schema Management
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex w-full sm:w-auto bg-background border rounded-xl p-1 shadow-sm">
                        <Button 
                            variant={activeView === 'explorer' ? 'secondary' : 'ghost'} 
                            className={cn("flex-1 sm:flex-none h-9 sm:h-10 px-3 sm:px-6 font-bold text-[10px] sm:text-xs rounded-lg transition-all", activeView === 'explorer' && "shadow-sm")}
                            onClick={() => setActiveView('explorer')}
                        >
                            <DatabaseIcon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4"/> Explorer
                        </Button>
                        <Button 
                            variant={activeView === 'indexes' ? 'secondary' : 'ghost'} 
                            className={cn("flex-1 sm:flex-none h-9 sm:h-10 px-3 sm:px-6 font-bold text-[10px] sm:text-xs rounded-lg transition-all", activeView === 'indexes' && "shadow-sm")}
                            onClick={() => setActiveView('indexes')}
                        >
                            <ListFilter className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4"/> Indexes
                        </Button>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 pb-4 sm:pb-6">
                    <div className="flex items-center gap-1 bg-background border rounded-xl p-1.5 shadow-sm overflow-x-auto no-scrollbar max-w-full">
                        <Button variant="ghost" size="sm" className="h-8 sm:h-9 font-bold text-[10px] sm:text-xs whitespace-nowrap" onClick={handleCreateCloudSnapshot} disabled={isProcessing}>
                            <Zap className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary fill-primary/20"/> Snapshot
                        </Button>
                        <Separator orientation="vertical" className="h-4 mx-1"/>
                        <Button variant="ghost" size="sm" className="h-8 sm:h-9 font-bold text-[10px] sm:text-xs whitespace-nowrap" onClick={handlePullRtdbToFs} disabled={isProcessing}>
                            <ArchiveRestore className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary"/> Restore
                        </Button>
                    </div>

                    <div className="flex items-center gap-1 bg-background border rounded-xl p-1.5 shadow-sm">
                        <Button variant="ghost" size="sm" className="h-8 sm:h-9 font-bold text-[10px] sm:text-xs whitespace-nowrap" onClick={handleExportJson}>
                            <Download className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500"/> Export
                        </Button>
                        <Separator orientation="vertical" className="h-4 mx-1"/>
                        <Button variant="ghost" size="sm" className="h-8 sm:h-9 font-bold text-[10px] sm:text-xs whitespace-nowrap" onClick={() => fileInputRef.current?.click()}>
                            <FileUp className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500"/> Import
                        </Button>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportJson} />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-10 sm:h-12 px-4 sm:px-6 font-black uppercase tracking-widest text-[9px] sm:text-[10px] border-destructive/20 text-destructive hover:bg-destructive/10">
                                <AlertOctagon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4"/> Danger <MoreVertical className="ml-1.5 sm:ml-2 h-3 w-3"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 p-2 shadow-2xl border-destructive/20">
                            <DropdownMenuItem onClick={() => openConfirmation('clear_firestore', 'Wipe Collection?', 'Permanently remove ALL documents from current collection.')} className="h-10 text-destructive font-bold focus:bg-destructive focus:text-white rounded-lg">
                                <Trash2 className="mr-2 h-4 w-4"/> Wipe Current Collection
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openConfirmation('nuke_all', 'GLOBAL PURGE?', 'Clear EVERY database layer.')} className="h-12 bg-destructive/10 text-destructive font-black uppercase tracking-widest text-[10px] focus:bg-destructive focus:text-white rounded-lg">
                                <AlertOctagon className="mr-2 h-4 w-4"/> Execute Total Destruction
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden bg-background">
                {activeView === 'explorer' ? (
                    <>
                        <div className="bg-muted/10 border-b px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-6">
                            <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                                {isMobile && mobileStep !== 'collections' && (
                                    <Button variant="outline" size="sm" className="h-9 px-2 font-bold" onClick={() => setMobileStep(prev => prev === 'editor' ? 'documents' : 'collections')}>
                                        <ChevronLeft className="mr-1 h-4 w-4"/> Back
                                    </Button>
                                )}
                                <div className="relative flex-1 sm:w-[400px]">
                                    <Search className="absolute left-3 sm:left-4 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Filter documents..." 
                                        className="pl-9 sm:pl-12 h-9 sm:h-10 bg-background border-border font-medium shadow-sm text-xs sm:text-sm" 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                {selectedDocIds.length > 0 && (
                                    <div className="flex items-center gap-2 animate-in slide-in-from-left-4">
                                        <Badge variant="default" className="h-8 sm:h-10 font-black uppercase text-[9px] sm:text-[11px] tracking-widest bg-primary px-2 sm:px-4">
                                            {selectedDocIds.length}
                                        </Badge>
                                        <Button size="icon" variant="outline" className="h-8 w-8 sm:h-10 sm:w-10" onClick={handleBulkExport}>
                                            <Download className="h-4 w-4 text-blue-500"/>
                                        </Button>
                                        <Button size="icon" variant="destructive" className="h-8 w-8 sm:h-10 sm:w-10" onClick={handleDeleteMultiple}>
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 sm:h-10 sm:w-10 hover:bg-muted" onClick={() => setSelectedDocIds([])}>
                                            <XCircle className="h-5 w-5"/>
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                <Button size="sm" variant="outline" className="h-9 sm:h-10 font-bold bg-background border-2 px-3 sm:px-6 text-[10px] sm:text-xs" onClick={fetchFsData} disabled={isFsLoading}>
                                    <RefreshCw className={cn("mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4", isFsLoading && "animate-spin")} /> Refresh
                                </Button>
                                <Button size="sm" className="h-9 sm:h-10 font-bold px-3 sm:px-6 shadow-lg shadow-primary/20 text-[10px] sm:text-xs" onClick={handleCreateNewDoc} disabled={isProcessing}>
                                    <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 h-4 w-4"/> New Doc
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden divide-x border-b relative">
                            {/* Column 1: Collections */}
                            <div className={cn(
                                "w-full sm:w-[280px] flex-col bg-muted/5",
                                isMobile ? (mobileStep === 'collections' ? "flex" : "hidden") : "flex"
                            )}>
                                <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/10">
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                        <LayoutGrid className="h-3 w-3"/> Collections
                                    </span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsNewCollectionDialogOpen(true)}>
                                        <FolderPlus className="h-4 w-4 text-primary" />
                                    </Button>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-2 space-y-1">
                                        {collections.map(col => (
                                            <button 
                                                key={col}
                                                className={cn(
                                                    "w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center transition-all",
                                                    selectedCollection === col ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-muted text-muted-foreground"
                                                )}
                                                onClick={() => { 
                                                    setSelectedCollection(col); 
                                                    setSelectedDocId(null); 
                                                    setSelectedDocIds([]);
                                                    if (isMobile) setMobileStep('documents');
                                                }}
                                            >
                                                <FileText className="mr-3 h-4 w-4"/> {col}
                                                <ChevronRight className={cn("ml-auto h-4 w-4 transition-transform", selectedCollection === col && "rotate-90")}/>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Column 2: Documents */}
                            <div className={cn(
                                "w-full sm:w-[450px] flex-col bg-background",
                                isMobile ? (mobileStep === 'documents' ? "flex" : "hidden") : "flex"
                            )}>
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
                            <div className={cn(
                                "flex-1 flex-col bg-muted/5",
                                isMobile ? (mobileStep === 'editor' ? "flex" : "hidden") : "flex"
                            )}>
                                <div className="px-4 sm:px-6 py-3 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/10">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Editor:</span>
                                        <span className="text-xs font-mono font-black text-primary truncate max-w-[200px] sm:max-w-[300px]">{selectedDocId || 'none'}</span>
                                    </div>
                                    {selectedDocId && (
                                        <div className="flex items-center gap-2">
                                            <Button 
                                                size="sm" 
                                                variant="ghost"
                                                className="flex-1 sm:flex-none h-9 sm:h-10 text-destructive hover:text-destructive hover:bg-destructive/10 font-bold uppercase text-[10px] sm:text-[11px] px-2 sm:px-4"
                                                onClick={() => handleDeleteSingle(selectedDocId)}
                                            >
                                                <Trash2 className="mr-1.5 sm:mr-2 h-3.5 w-3.5 h-4 w-4"/> Delete
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                className="flex-1 sm:flex-none h-9 sm:h-10 font-black uppercase text-[10px] sm:text-[11px] tracking-widest shadow-xl shadow-primary/20 px-3 sm:px-6" 
                                                onClick={handleSaveDoc}
                                                disabled={isProcessing}
                                            >
                                                {isProcessing ? <Loader2 className="mr-1.5 sm:mr-2 h-3.5 w-3.5 h-4 w-4 animate-spin"/> : <Save className="mr-1.5 sm:mr-2 h-3.5 w-3.5 h-4 w-4"/>}
                                                Save
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                
                                <ScrollArea className="flex-1">
                                    {selectedDocId ? (
                                        <div className="p-4 sm:p-8 space-y-8">
                                            <div className="space-y-4 sm:space-y-6">
                                                {editingData && Object.entries(editingData).map(([key, value]) => (
                                                    <div key={key} className="space-y-2 group">
                                                        <div className="flex items-center justify-between px-1">
                                                            <Label className="text-[10px] sm:text-[11px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/40"/> {key}
                                                            </Label>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="text-[8px] sm:text-[9px] font-mono opacity-50 px-1.5 h-4 uppercase">{typeof value}</Badge>
                                                                {key !== 'id' && (
                                                                    <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveField(key)}>
                                                                        <MinusCircle className="h-3.5 w-3.5"/>
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {typeof value === 'boolean' ? (
                                                            <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 bg-background shadow-sm group-focus-within:border-primary transition-all">
                                                                <Switch 
                                                                    checked={value} 
                                                                    onCheckedChange={(checked) => handleUpdateField(key, checked)}
                                                                />
                                                                <span className="text-xs sm:text-sm font-bold">{value ? 'ENABLED' : 'DISABLED'}</span>
                                                            </div>
                                                        ) : typeof value === 'object' && value !== null ? (
                                                            <div className="p-3 sm:p-4 rounded-xl border-2 bg-muted/30 font-mono text-[10px] sm:text-xs text-muted-foreground border-dashed">
                                                                {JSON.stringify(value, null, 2)}
                                                            </div>
                                                        ) : (
                                                            <Input 
                                                                value={String(value || '')}
                                                                onChange={(e) => handleUpdateField(key, e.target.value)}
                                                                className="h-10 sm:h-12 bg-background border-2 font-bold text-xs sm:text-sm focus-visible:ring-0 focus-visible:border-primary transition-all shadow-sm rounded-xl"
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add Field Section */}
                                            <div className="p-6 border-2 border-dashed rounded-2xl bg-muted/5 space-y-4">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Add Custom Field</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <Input 
                                                        placeholder="Field Name" 
                                                        value={newFieldKey} 
                                                        onChange={e => setNewFieldKey(e.target.value)}
                                                        className="h-10 bg-background rounded-xl"
                                                    />
                                                    <Input 
                                                        placeholder="Initial Value" 
                                                        value={newFieldValue} 
                                                        onChange={e => setNewFieldValue(e.target.value)}
                                                        className="h-10 bg-background rounded-xl"
                                                    />
                                                </div>
                                                <Button variant="outline" className="w-full h-10 font-bold rounded-xl" onClick={handleAddField} disabled={!newFieldKey}>
                                                    <Plus className="mr-2 h-4 w-4"/> Append to Schema
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 px-4 text-center">
                                            <DatabaseZap className="h-16 w-16 sm:h-24 sm:w-24 mb-4 sm:mb-6 opacity-20" />
                                            <p className="text-lg sm:text-2xl font-black uppercase tracking-[0.3em] opacity-20">No Document Selected</p>
                                            <p className="text-xs sm:text-sm font-medium mt-2">Select a record from the list to view its fields.</p>
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        </div>
                    </>
                ) : (
                    <IndexesView toast={toast} />
                )}
            </div>

            <DialogFooter className="px-4 sm:px-10 py-4 sm:py-6 bg-muted/30 border-t border-border">
                <DialogClose asChild><Button variant="ghost" className="w-full sm:w-auto font-black uppercase tracking-widest text-[10px] sm:text-xs h-10 sm:h-12 px-8">Exit Console</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New Collection Dialog */}
      <Dialog open={isNewCollectionDialogOpen} onOpenChange={setIsNewCollectionDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6">
              <DialogHeader>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight">Create Collection</DialogTitle>
                  <DialogDescription>Firestore collections are initialized by adding a document.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <Label htmlFor="col-name" className="text-xs font-bold uppercase text-muted-foreground mb-2 block">Collection Path</Label>
                  <Input 
                    id="col-name" 
                    placeholder="e.g. users_audit" 
                    value={newCollectionName} 
                    onChange={e => setNewCollectionName(e.target.value)}
                    className="h-12 font-bold rounded-xl"
                  />
              </div>
              <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setIsNewCollectionDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                  <Button onClick={handleCreateNewCollection} disabled={!newCollectionName || isProcessing} className="rounded-xl font-bold">Create Collection</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent className="w-[90vw] sm:max-w-lg rounded-[1.5rem] sm:rounded-[2rem] border-destructive/20 shadow-2xl p-6 sm:p-8 bg-background">
              <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive text-xl sm:text-3xl font-black uppercase tracking-tighter">{confirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm sm:text-lg font-bold leading-relaxed pt-2">
                      {confirmDescription}
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6 sm:mt-8 gap-3 sm:gap-4">
                  <AlertDialogCancel className="rounded-xl font-black h-12 sm:h-14 px-6 sm:px-8 uppercase tracking-widest text-[10px] sm:text-xs">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmAction} className="bg-destructive hover:bg-destructive/90 text-white font-black rounded-xl uppercase tracking-widest px-6 sm:px-10 h-12 sm:h-14 text-[10px] sm:text-xs">Confirm</AlertDialogAction>
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

function IndexesView({ toast }: { toast: any }) {
    const [indexes, setIndexes] = useState([
        { 
            id: 'CICAgOjxH4EJ', 
            collection: 'assets', 
            fields: [
                { path: 'grantId', order: 'ASCENDING' },
                { path: 'lastModified', order: 'DESCENDING' }
            ], 
            scope: 'Collection', 
            status: 'Enabled' 
        },
        { 
            id: 'CICAgOjxH4EK', 
            collection: 'assets', 
            fields: [
                { path: 'grantId', order: 'ASCENDING' },
                { path: 'category', order: 'ASCENDING' },
                { path: 'verifiedStatus', order: 'ASCENDING' }
            ], 
            scope: 'Collection', 
            status: 'Enabled' 
        },
        { 
            id: 'CICAgJiUpoMK', 
            collection: 'assets', 
            fields: [
                { path: 'location', order: 'ASCENDING' },
                { path: 'lastModified', order: 'DESCENDING' }
            ], 
            scope: 'Collection', 
            status: 'Enabled' 
        }
    ]);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newIdxCol, setNewIdxCol] = useState('assets');
    const [newIdxFields, setNewIdxFields] = useState('');
    const [newIdxScope, setNewIdxScope] = useState<'Collection' | 'Collection Group'>('Collection');

    const handleAddIndex = () => {
        if (!newIdxFields.trim()) return;
        
        const fieldPaths = newIdxFields.split(',').map(f => f.trim()).filter(Boolean);
        if (fieldPaths.length === 0) return;

        const newIndex = {
            id: `IDX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            collection: newIdxCol,
            fields: fieldPaths.map(p => ({ path: f, order: 'ASCENDING' as const })),
            scope: newIdxScope,
            status: 'Building'
        };

        setIndexes(prev => [...prev, newIndex]);
        setIsAddDialogOpen(false);
        setNewIdxFields('');
        
        toast({
            title: "Index Definition Staged",
            description: "To apply this to your real database, define it in 'firestore.indexes.json' and deploy via Firebase CLI.",
        });
    };

    const handleDeleteIndex = (id: string) => {
        setIndexes(prev => prev.filter(i => i.id !== id));
        toast({ title: "Index definition removed from console." });
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-muted/10 border-b px-4 sm:px-8 py-4 sm:py-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary"/> Composite Indexes
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">Manage optimized server-side query definitions.</p>
                </div>
                <Button 
                    className="font-bold shadow-lg shadow-primary/20 h-9 sm:h-10 text-[10px] sm:text-xs"
                    onClick={() => setIsAddDialogOpen(true)}
                >
                    <Plus className="mr-2 h-4 w-4"/> Add Index
                </Button>
            </div>
            
            <ScrollArea className="flex-1">
                <div className="p-4 sm:p-8">
                    <div className="rounded-2xl border bg-card/50 overflow-hidden shadow-sm overflow-x-auto">
                        <Table className="min-w-[800px]">
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-b-2">
                                    <TableHead className="h-12 sm:h-14 font-black uppercase text-[9px] sm:text-[10px] tracking-widest text-muted-foreground px-4 sm:px-6">Collection</TableHead>
                                    <TableHead className="h-12 sm:h-14 font-black uppercase text-[9px] sm:text-[10px] tracking-widest text-muted-foreground px-4 sm:px-6">Fields Indexed</TableHead>
                                    <TableHead className="h-12 sm:h-14 font-black uppercase text-[9px] sm:text-[10px] tracking-widest text-muted-foreground px-4 sm:px-6">Scope</TableHead>
                                    <TableHead className="h-12 sm:h-14 font-black uppercase text-[9px] sm:text-[10px] tracking-widest text-muted-foreground px-4 sm:px-6">Index ID</TableHead>
                                    <TableHead className="h-12 sm:h-14 font-black uppercase text-[9px] sm:text-[10px] tracking-widest text-muted-foreground px-4 sm:px-6">Status</TableHead>
                                    <TableHead className="h-12 sm:h-14 w-14"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {indexes.map((idx) => (
                                    <TableRow key={idx.id} className="group hover:bg-muted/20 transition-colors">
                                        <TableCell className="px-4 sm:px-6 py-4 sm:py-5 font-bold text-xs sm:text-sm">{idx.collection}</TableCell>
                                        <TableCell className="px-4 sm:px-6 py-4 sm:py-5">
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                                {idx.fields.map((f, i) => (
                                                    <div key={i} className="flex items-center gap-1 sm:gap-1.5 bg-background border rounded-lg px-2 py-0.5 sm:py-1 shadow-sm">
                                                        {f.order === 'ASCENDING' ? (
                                                            <ArrowUpCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500 fill-green-500/10"/>
                                                        ) : (
                                                            <ArrowDownCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500 fill-blue-500/10"/>
                                                        )}
                                                        <span className="text-[9px] sm:text-xs font-mono font-bold text-foreground/80">{f.path}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 sm:px-6 py-4 sm:py-5 font-medium text-[10px] sm:text-xs text-muted-foreground">{idx.scope}</TableCell>
                                        <TableCell className="px-4 sm:px-6 py-4 sm:py-5 font-mono text-[10px] sm:text-xs opacity-60">{idx.id}</TableCell>
                                        <TableCell className="px-4 sm:px-6 py-4 sm:py-5">
                                            <Badge variant="outline" className={cn(
                                                "font-bold uppercase text-[8px] sm:text-[9px] tracking-widest px-2 h-5 sm:h-6",
                                                idx.status === 'Enabled' ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                                            )}>
                                                {idx.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-4 sm:px-6 py-4 sm:py-5">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreVertical className="h-4 w-4"/>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem className="text-destructive font-bold" onClick={() => handleDeleteIndex(idx.id)}>
                                                        <Trash2 className="mr-2 h-4 w-4"/> Remove Definition
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </ScrollArea>

            {/* Add Index Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">Define Index</DialogTitle>
                        <DialogDescription>Composite indexes are required for complex Firestore queries.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Target Collection</Label>
                            <Input value={newIdxCol} onChange={e => setNewIdxCol(e.target.value)} className="h-10 rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Indexed Fields (Comma separated)</Label>
                            <Input 
                                placeholder="e.g. grantId, category, lastModified" 
                                value={newIdxFields} 
                                onChange={e => setNewIdxFields(e.target.value)}
                                className="h-10 rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Query Scope</Label>
                            <Select value={newIdxScope} onValueChange={(v: any) => setNewIdxScope(v)}>
                                <SelectTrigger className="h-10 rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Collection">Collection</SelectItem>
                                    <SelectItem value="Collection Group">Collection Group</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                        <Button onClick={handleAddIndex} disabled={!newIdxFields} className="rounded-xl font-bold">Stage Index</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
