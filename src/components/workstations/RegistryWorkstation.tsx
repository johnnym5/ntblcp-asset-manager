'use client';

/**
 * @fileOverview RegistryWorkstation - High-Fidelity Asset Hub.
 * Phase 600: Implemented Folder-First navigation and persistent view state.
 * Phase 601: Synchronized multi-select action bar for Grid and List views.
 * Phase 602: Integrated Batch Verify and high-fidelity folder transitions.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid,
  MoreHorizontal,
  ChevronRight,
  Boxes,
  ArrowLeft,
  Grid,
  List,
  Edit3,
  Trash2,
  Loader2,
  X,
  FileSpreadsheet,
  ShieldAlert,
  Bomb,
  Hammer,
  ChevronDown,
  CheckCircle2,
  FolderKanban,
  Check,
  EyeOff,
  Wrench,
  Table as TableIcon,
  RefreshCw,
  Layers,
  Database,
  Search,
  CloudUpload,
  ClipboardEdit,
  Zap,
  Tag
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { RegistryTable } from '@/components/registry/RegistryTable';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import { Progress } from '@/components/ui/progress';
import AssetForm from '@/components/asset-form';
import { AssetBatchEditForm } from '@/components/asset-batch-edit-form';
import { CategoryBatchEditForm } from '@/components/category-batch-edit-form';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { isWithinScope } from '@/core/auth/rbac';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import { ColumnCustomizationSheet } from '@/components/column-customization-sheet';
import { FirestoreService } from '@/services/firebase/firestore';
import type { Asset, SheetDefinition, Grant } from '@/types/domain';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function RegistryWorkstation({ viewAll = false }: { viewAll?: boolean }) {
  const { 
    assets, 
    searchTerm,
    headers,
    sortKey,
    sortDir,
    refreshRegistry,
    appSettings,
    setAppSettings,
    isOnline
  } = useAppState();
  
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // --- Persistent View State ---
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [groupViewMode, setGroupViewMode] = useState<'grid' | 'table'>('grid');
  const [isHydrated, setIsHydrated] = useState(false);

  // --- Selection & Adjudication ---
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<Set<string>>(new Set());

  // --- Modals ---
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isCategoryBatchEditOpen, setIsCategoryBatchEditOpen] = useState(false);
  const [isCategoryWipeDialogOpen, setIsCategoryWipeDialogOpen] = useState(false);
  const [categoryToWipe, setCategoryToWipe] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [customizingCategory, setCustomizingCategory] = useState<string | null>(null);

  // Hydrate State
  useEffect(() => {
    const savedCat = localStorage.getItem('registry-active-category');
    const savedAssetView = localStorage.getItem('registry-asset-view-mode') as any;
    const savedGroupView = localStorage.getItem('registry-group-view-mode') as any;

    if (savedCat && savedCat !== 'HUB') setSelectedCategory(savedCat);
    if (savedAssetView) setViewMode(savedAssetView);
    if (savedGroupView) setGroupViewMode(savedGroupView);
    setIsHydrated(true);
  }, []);

  // Persist State
  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem('registry-active-category', selectedCategory || 'HUB');
    localStorage.setItem('registry-asset-view-mode', viewMode);
    localStorage.setItem('registry-group-view-mode', groupViewMode);
  }, [selectedCategory, viewMode, groupViewMode, isHydrated]);

  // --- Computed Data ---
  const activeGrant = useMemo(() => appSettings?.grants.find(g => g.id === appSettings.activeGrantId), [appSettings]);
  const enabledSheets = useMemo(() => new Set(activeGrant?.enabledSheets || []), [activeGrant]);

  const categoryStats = useMemo(() => {
    const groups = assets.reduce((acc, a) => {
      const cat = a.category || 'General';
      if (!enabledSheets.has(cat)) return acc;
      
      if (!acc[cat]) acc[cat] = { total: 0, verified: 0 };
      acc[cat].total++;
      if (a.status === 'VERIFIED') acc[cat].verified++;
      return acc;
    }, {} as Record<string, { total: number, verified: number }>);

    return Object.entries(groups).map(([name, stats]) => ({ name, ...stats })).sort((a, b) => a.name.localeCompare(b.name));
  }, [assets, enabledSheets]);

  const filteredAssets = useMemo(() => {
    let results = assets;
    if (!userProfile?.isAdmin) results = results.filter(a => isWithinScope(userProfile as any, a));
    if (selectedCategory && selectedCategory !== 'ALL') results = results.filter(a => a.category === selectedCategory);
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(a => 
        (a.description || '').toLowerCase().includes(term) || 
        (a.assetIdCode || '').toLowerCase().includes(term)
      );
    }
    return results.sort((a, b) => {
      const valA = String((a as any)[sortKey] ?? '');
      const valB = String((b as any)[sortKey] ?? '');
      return valA.localeCompare(valB, undefined, { numeric: true }) * (sortDir === 'asc' ? 1 : -1);
    });
  }, [assets, selectedCategory, searchTerm, sortKey, sortDir, userProfile]);

  const selectedRecord = useMemo(() => {
    if (!selectedAssetId) return undefined;
    const asset = assets.find(a => a.id === selectedAssetId);
    return asset ? transformAssetToRecord(asset, headers, appSettings?.sourceBranding) : undefined;
  }, [selectedAssetId, assets, headers, appSettings?.sourceBranding]);

  // --- Pulse Handlers ---
  const handleInspect = (id: string) => {
    setSelectedAssetId(id);
    setIsDetailOpen(true);
  };

  const handleNext = () => {
    if (!selectedAssetId) return;
    const idx = filteredAssets.findIndex(a => a.id === selectedAssetId);
    if (idx < filteredAssets.length - 1) setSelectedAssetId(filteredAssets[idx+1].id);
  };

  const handlePrevious = () => {
    if (!selectedAssetId) return;
    const idx = filteredAssets.findIndex(a => a.id === selectedAssetId);
    if (idx > 0) setSelectedAssetId(filteredAssets[idx-1].id);
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedAssetIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedAssetIds(next);
  };

  const updateActiveGrant = async (updates: Partial<Grant>) => {
    if (!appSettings || !activeGrant) return;
    const nextGrants = appSettings.grants.map(g => g.id === activeGrant.id ? { ...g, ...updates } : g);
    const nextSettings = { ...appSettings, grants: nextGrants };
    try {
      if (isOnline) await FirestoreService.updateSettings({ grants: nextGrants });
      await storage.saveSettings(nextSettings);
      setAppSettings(nextSettings);
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failure" });
    }
  };

  const handleHideCategory = async (name: string) => {
    if (!activeGrant) return;
    const nextEnabled = activeGrant.enabledSheets.filter(s => s !== name);
    await updateActiveGrant({ enabledSheets: nextEnabled });
    toast({ title: "Group Hidden", description: "The register block is now sequestered." });
  };

  const handleWipeCategory = async () => {
    if (!categoryToWipe || !activeGrant) return;
    setIsProcessing(true);
    try {
      // 1. Wipe local data
      const current = await storage.getAssets();
      await storage.saveAssets(current.filter(a => a.category !== categoryToWipe));
      
      // 2. Remove group from settings
      const nextEnabled = activeGrant.enabledSheets.filter(s => s !== categoryToWipe);
      const nextDefs = { ...activeGrant.sheetDefinitions };
      delete nextDefs[categoryToWipe];
      
      await updateActiveGrant({ 
        enabledSheets: nextEnabled,
        sheetDefinitions: nextDefs
      });

      await refreshRegistry();
      toast({ title: "Local Pulse Purged", description: "All records in category cleared." });
      setIsCategoryWipeDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchVerify = async () => {
    if (selectedAssetIds.size === 0) return;
    setIsProcessing(true);
    try {
      for (const id of Array.from(selectedAssetIds)) {
        const asset = assets.find(a => a.id === id);
        if (asset) {
          await enqueueMutation('UPDATE', 'assets', { ...asset, status: 'VERIFIED' });
        }
      }
      await refreshRegistry();
      setSelectedAssetIds(new Set());
      toast({ title: "Batch Verification Complete", description: "All selected records marked as verified." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSelectedAssets = async () => {
    if (selectedAssetIds.size === 0) return;
    setIsProcessing(true);
    try {
      for (const id of Array.from(selectedAssetIds)) {
        await enqueueMutation('DELETE', 'assets', { id });
      }
      await refreshRegistry();
      setSelectedAssetIds(new Set());
      toast({ title: "Records Purged" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isHydrated) return null;

  return (
    <div className="space-y-8 min-h-[60vh] pb-40">
      
      {/* 1. Dynamic Workstation Header */}
      <div className="px-1 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 self-start">
            {selectedCategory ? (
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => { setSelectedCategory(null); setSelectedAssetIds(new Set()); }} 
                  className="h-12 w-12 flex items-center justify-center bg-white/5 rounded-2xl text-white/40 hover:text-white border border-white/5 transition-all shadow-xl"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="space-y-1">
                  <h2 className="text-3xl font-black uppercase text-white tracking-tight leading-none">{selectedCategory}</h2>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[9px] h-5 px-2">
                      {filteredAssets.length} RECORDS
                    </Badge>
                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.25em]">| VIEWING ALL</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl shadow-inner">
                  <FolderKanban className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-2xl font-black uppercase text-white tracking-tight leading-none">Categories & Inventories</h2>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Global Registry Hub</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner backdrop-blur-xl">
            <button 
              onClick={() => selectedCategory ? setViewMode('grid') : setGroupViewMode('grid')} 
              className={cn("p-2.5 rounded-xl transition-all", (selectedCategory ? viewMode === 'grid' : groupViewMode === 'grid') ? "bg-white/10 text-white shadow-lg" : "text-white/20 hover:text-white")}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button 
              onClick={() => selectedCategory ? setViewMode('table') : setGroupViewMode('table')} 
              className={cn("p-2.5 rounded-xl transition-all", (selectedCategory ? viewMode === 'table' : groupViewMode === 'table') ? "bg-white/10 text-white shadow-lg" : "text-white/20 hover:text-white")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 2. Top Action Command Bar */}
        <AnimatePresence>
          {(selectedAssetIds.size > 0 && selectedCategory) && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="bg-[#0A0A0A] border-2 border-white/5 rounded-[1.5rem] p-2 flex items-center gap-6 shadow-3xl overflow-x-auto no-scrollbar"
            >
              <div className="bg-primary px-5 py-2.5 rounded-xl flex items-center gap-3 shrink-0 shadow-xl shadow-primary/20">
                <span className="text-black font-black text-xs uppercase tracking-widest">{selectedAssetIds.size} Selected</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Button onClick={handleBatchVerify} variant="ghost" className="h-11 text-[10px] font-black uppercase tracking-widest gap-2.5 text-white/60 hover:text-white hover:bg-white/5 transition-all">
                  <CheckCircle2 className="h-4 w-4" /> Verify
                </Button>
                <Button onClick={() => setIsBatchEditOpen(true)} variant="ghost" className="h-11 text-[10px] font-black uppercase tracking-widest gap-2.5 text-white/60 hover:text-white hover:bg-white/5 transition-all">
                  <ClipboardEdit className="h-4 w-4" /> Edit
                </Button>
                <Button variant="ghost" className="h-11 text-[10px] font-black uppercase tracking-widest gap-2.5 text-white/60 hover:text-white hover:bg-white/5 transition-all">
                  <RefreshCw className="h-4 w-4" /> Sync
                </Button>
                <div className="w-px h-6 bg-white/5 mx-2" />
                <Button onClick={handleDeleteSelectedAssets} variant="ghost" className="h-11 text-[10px] font-black uppercase tracking-widest gap-2.5 text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-all">
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
              
              <button onClick={() => setSelectedAssetIds(new Set())} className="ml-auto mr-4 p-2.5 rounded-xl text-white/20 hover:text-white hover:bg-white/5 transition-all">
                <X className="h-5 w-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Main Operational Surface */}
      <div className="px-1">
        <AnimatePresence mode="wait">
          {!selectedCategory ? (
            groupViewMode === 'grid' ? (
              <motion.div key="grid-hub" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categoryStats.map(cat => (
                  <Card key={cat.name} className="bg-[#080808] border-2 border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-primary/20 transition-all shadow-3xl">
                    <CardHeader className="p-8 pb-4 border-b border-white/5 bg-white/[0.01]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-primary/10 rounded-lg"><TableIcon className="h-4 w-4 text-primary" /></div>
                          <h3 className="text-sm font-black uppercase text-white tracking-tight leading-none truncate pr-4">{cat.name}</h3>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-8 w-8 flex items-center justify-center bg-white/5 rounded-xl text-white/40 hover:text-white transition-all"><MoreHorizontal className="h-4 w-4" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-black border-white/10 rounded-2xl p-2 shadow-3xl">
                            <DropdownMenuItem onClick={() => setSelectedCategory(cat.name)} className="p-3 rounded-xl focus:bg-primary/10 gap-3">
                              <LayoutGrid className="h-4 w-4 text-white/40" />
                              <span className="text-[11px] font-black uppercase">Open Register</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setCustomizingCategory(cat.name); setIsColumnSheetOpen(true); }} className="p-3 rounded-xl focus:bg-primary/10 gap-3">
                              <Wrench className="h-4 w-4 text-white/40" />
                              <span className="text-[11px] font-black uppercase">Field Setup</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleHideCategory(cat.name)} className="p-3 rounded-xl focus:bg-primary/10 gap-3">
                              <EyeOff className="h-4 w-4 text-white/40" />
                              <span className="text-[11px] font-black uppercase">Hide Group</span>
                            </DropdownMenuItem>
                            <div className="h-px bg-white/5 my-2" />
                            <DropdownMenuItem onClick={() => { setCategoryToWipe(cat.name); setIsCategoryWipeDialogOpen(true); }} className="p-3 rounded-xl focus:bg-red-600/10 text-red-500 gap-3">
                              <Bomb className="h-4 w-4" />
                              <span className="text-[11px] font-black uppercase">Wipe Local Pulse</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-6 space-y-8">
                      <div className="flex items-end justify-between">
                        <div className="space-y-1">
                          <p className="text-4xl font-black tracking-tighter text-white">{cat.total}</p>
                          <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.25em]">ASSET RECORDS</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl shadow-inner"><Boxes className="h-8 w-8 text-white/10" /></div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em]">
                          <span className="text-white/40">VERIFICATION</span>
                          <span className="text-primary">{cat.verified} / {cat.total}</span>
                        </div>
                        <Progress value={(cat.verified / cat.total) * 100} className="h-1 bg-white/5" />
                      </div>
                    </CardContent>
                    <CardFooter className="px-8 pb-8 pt-0">
                      <Button 
                        onClick={() => setSelectedCategory(cat.name)} 
                        variant="outline" 
                        className="w-full h-12 rounded-xl border-white/10 font-black uppercase text-[10px] tracking-widest gap-2 bg-transparent hover:bg-white/5 text-white/60 hover:text-white transition-all"
                      >
                        View Records <ChevronRight className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </motion.div>
            ) : (
              <motion.div key="list-hub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[2.5rem] border-2 border-border/40 overflow-hidden bg-card/50 shadow-2xl">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-5 px-8 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Register Block Identity</TableHead>
                      <TableHead className="py-5 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Volume Pulse</TableHead>
                      <TableHead className="py-5 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Verification state</TableHead>
                      <TableHead className="py-5 px-8 text-right text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryStats.map(cat => (
                      <TableRow key={cat.name} className="group hover:bg-primary/[0.02] border-b last:border-0 cursor-pointer" onClick={() => setSelectedCategory(cat.name)}>
                        <TableCell className="py-6 px-8">
                          <div className="flex items-center gap-5">
                            <div className="p-3 bg-white/5 rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-all"><TableIcon className="h-5 w-5 opacity-40" /></div>
                            <span className="font-black text-sm uppercase tracking-tight text-white">{cat.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-6 px-4">
                          <span className="font-black text-lg text-white">{cat.total}</span>
                        </TableCell>
                        <TableCell className="py-6 px-4 w-[350px]">
                          <div className="space-y-2">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-[0.2em]">
                              <span className="text-white/40">{cat.verified} PULSES VERIFIED</span>
                              <span className="text-primary">{Math.round((cat.verified/cat.total)*100)}%</span>
                            </div>
                            <Progress value={(cat.verified/cat.total)*100} className="h-1 bg-white/5" />
                          </div>
                        </TableCell>
                        <TableCell className="py-6 px-8 text-right">
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/5 opacity-40 group-hover:opacity-100 group-hover:bg-primary/10 group-hover:text-primary transition-all"><ChevronRight className="h-5 w-5" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            )
          ) : (
            <motion.div key="asset-register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              {viewMode === 'grid' || isMobile ? (
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {filteredAssets.map(asset => (
                    <RegistryCard 
                      key={asset.id} 
                      record={transformAssetToRecord(asset, headers, appSettings?.sourceBranding)} 
                      onInspect={() => handleInspect(asset.id)} 
                      selected={selectedAssetIds.has(asset.id)} 
                      onToggleSelect={handleToggleSelect} 
                    />
                  ))}
                </div>
              ) : (
                <RegistryTable 
                  records={filteredAssets.map(a => transformAssetToRecord(a, headers, appSettings?.sourceBranding))} 
                  onInspect={handleInspect} 
                  selectedIds={selectedAssetIds} 
                  onToggleSelect={handleToggleSelect} 
                  onSelectAll={(c) => setSelectedAssetIds(c ? new Set(filteredAssets.map(a => a.id)) : new Set())} 
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dialogs & Sheets */}
      <AssetDetailSheet 
        isOpen={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        record={selectedRecord} 
        onEdit={(id) => { setSelectedAssetId(id); setIsFormOpen(true); setIsDetailOpen(false); }} 
        onNext={handleNext}
        onPrevious={handlePrevious}
      />
      
      <AssetForm 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        asset={assets.find(a => a.id === selectedAssetId)} 
        isReadOnly={false} 
        onSave={async (a) => { await enqueueMutation('UPDATE', 'assets', a); await refreshRegistry(); setIsFormOpen(false); }} 
      />
      
      <AssetBatchEditForm 
        isOpen={isBatchEditOpen} 
        onOpenChange={setIsBatchEditOpen} 
        selectedAssetCount={selectedAssetIds.size} 
        onSave={async () => { setSelectedAssetIds(new Set()); await refreshRegistry(); }} 
      />

      <AlertDialog open={isCategoryWipeDialogOpen} onOpenChange={setIsCategoryWipeDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 shadow-3xl bg-black text-white">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit">
              <Bomb className="h-12 w-12 text-destructive" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase text-destructive tracking-tight">Wipe Local Pulse?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic text-white/60">
              This will permanently delete all local records for <strong>{categoryToWipe}</strong> and remove its technical definition from your workstation. Cloud authority remains intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-14 px-10 rounded-2xl font-bold border-2 border-white/10 m-0">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={handleWipeCategory} disabled={isProcessing} className="h-14 px-12 rounded-2xl font-black uppercase bg-destructive text-white m-0">
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Hammer className="h-5 w-5 mr-3" />} Execute Wipe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isColumnSheetOpen && customizingCategory && activeGrant && (
        <ColumnCustomizationSheet 
          isOpen={isColumnSheetOpen}
          onOpenChange={setIsColumnSheetOpen}
          sheetDefinition={activeGrant.sheetDefinitions[customizingCategory]}
          originalSheetName={customizingCategory}
          onSave={async (orig, newDef, applyToAll) => {
            const nextDefs = { ...activeGrant.sheetDefinitions };
            if (applyToAll) {
              Object.keys(nextDefs).forEach(k => { nextDefs[k] = { ...newDef, name: k }; });
            } else {
              nextDefs[newDef.name] = newDef;
              if (orig && orig !== newDef.name) delete nextDefs[orig];
            }
            await updateActiveGrant({ sheetDefinitions: nextDefs });
            toast({ title: "Schema Layout Updated" });
          }}
        />
      )}
    </div>
  );
}
