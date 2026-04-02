'use client';

/**
 * @fileOverview RegistryWorkstation - High-Fidelity Asset Inventory.
 * Phase 400: Implemented Group List View & Batch Orchestration for Categories.
 * Phase 401: Fixed ReferenceErrors for selectedRecord and selection pulses.
 */

import React, { useMemo, useState } from 'react';
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
  Printer,
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
  Table as TableIcon
} from 'lucide-react';
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
import { TagPrintDialog } from '@/components/registry/TagPrintDialog';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { isWithinScope } from '@/core/auth/rbac';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import { ColumnCustomizationSheet } from '@/components/column-customization-sheet';
import type { Asset, SheetDefinition } from '@/types/domain';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RegistryWorkstationProps {
  viewAll?: boolean;
}

export function RegistryWorkstation({ viewAll = false }: RegistryWorkstationProps) {
  const { 
    assets, 
    searchTerm,
    headers,
    sortKey,
    sortDir,
    refreshRegistry,
    appSettings,
    setAppSettings
  } = useAppState();
  
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // --- Navigation & View State ---
  const [selectedCategory, setSelectedCategory] = useState<string | null>(viewAll ? 'ALL' : null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [groupViewMode, setGroupViewMode] = useState<'grid' | 'table'>('grid');
  
  // --- Selection State ---
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<Set<string>>(new Set());

  // --- Detail & Form States ---
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  
  // --- Batch & Maintenance States ---
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isCategoryBatchEditOpen, setIsCategoryBatchEditOpen] = useState(false);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);
  const [isCategoryWipeDialogOpen, setIsCategoryWipeDialogOpen] = useState(false);
  const [categoryToWipe, setCategoryToWipe] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Customization State ---
  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [customizingCategory, setCustomizingCategory] = useState<string | null>(null);

  // --- Logic Pulse ---
  const categoryStats = useMemo(() => {
    const groups = assets.reduce((acc, a) => {
      const cat = a.category || 'General';
      if (!acc[cat]) acc[cat] = { total: 0, verified: 0 };
      acc[cat].total++;
      if (a.status === 'VERIFIED') acc[cat].verified++;
      return acc;
    }, {} as Record<string, { total: number, verified: number }>);

    return Object.entries(groups).map(([name, stats]) => ({ name, ...stats })).sort((a, b) => a.name.localeCompare(b.name));
  }, [assets]);

  const filteredAssets = useMemo(() => {
    let results = assets;
    if (!userProfile?.isAdmin) results = results.filter(a => isWithinScope(userProfile as any, a));
    if (selectedCategory && selectedCategory !== 'ALL') results = results.filter(a => a.category === selectedCategory);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(a => 
        (a.description || '').toLowerCase().includes(term) || 
        (a.assetIdCode || '').toLowerCase().includes(term) ||
        (a.serialNumber || '').toLowerCase().includes(term)
      );
    }
    return results.sort((a, b) => String((a as any)[sortKey] ?? '').localeCompare(String((b as any)[sortKey] ?? ''), undefined, { numeric: true }) * (sortDir === 'asc' ? 1 : -1));
  }, [assets, selectedCategory, searchTerm, sortKey, sortDir, userProfile]);

  const selectedRecord = useMemo(() => {
    if (!selectedAssetId) return undefined;
    const asset = assets.find(a => a.id === selectedAssetId);
    return asset ? transformAssetToRecord(asset, headers, appSettings?.sourceBranding) : undefined;
  }, [selectedAssetId, assets, headers, appSettings?.sourceBranding]);

  // --- Handlers ---
  const handleInspect = (id: string) => {
    setSelectedAssetId(id);
    setIsDetailOpen(true);
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedAssetIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAssetIds(next);
  };

  const toggleCategorySelection = (name: string) => {
    const next = new Set(selectedCategoryNames);
    if (next.has(name)) next.delete(name); else next.add(name);
    setSelectedCategoryNames(next);
  };

  const handleSelectAllCategories = (checked: boolean) => {
    if (checked) setSelectedCategoryNames(new Set(categoryStats.map(c => c.name)));
    else setSelectedCategoryNames(new Set());
  };

  const handleHideCategory = async (name: string) => {
    if (!appSettings) return;
    const nextEnabled = appSettings.enabledSheets.filter(s => s !== name);
    const nextSettings = { ...appSettings, enabledSheets: nextEnabled };
    setAppSettings(nextSettings);
    await storage.saveSettings(nextSettings);
    toast({ title: "Group Hidden", description: "Node removed from active workstation view." });
  };

  const handleWipeCategory = async () => {
    if (!categoryToWipe) return;
    setIsProcessing(true);
    try {
      const idsToPurge = assets.filter(a => a.category === categoryToWipe).map(a => a.id);
      for (const id of idsToPurge) await enqueueMutation('DELETE', 'assets', { id });
      await refreshRegistry();
      toast({ title: "Group Register Purged" });
      setIsCategoryWipeDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNext = () => {
    const idx = filteredAssets.findIndex(a => a.id === selectedAssetId);
    if (idx < filteredAssets.length - 1) setSelectedAssetId(filteredAssets[idx + 1].id);
  };

  const handlePrevious = () => {
    const idx = filteredAssets.findIndex(a => a.id === selectedAssetId);
    if (idx > 0) setSelectedAssetId(filteredAssets[idx - 1].id);
  };

  const isListView = !!selectedCategory;

  return (
    <div className="space-y-8 min-h-[60vh] pb-40">
      {/* 1. Header Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4 self-start">
          {isListView ? (
            <button onClick={() => { setSelectedCategory(null); setSelectedAssetIds(new Set()); }} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl text-primary hover:bg-white/10 transition-all tactile-pulse">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">Back to Groups</span>
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl shadow-inner">
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-2xl font-black uppercase text-white tracking-tight leading-none">Categories & Inventories</h2>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] leading-none">Group Orchestration Hub</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
          {!isListView && (
            <div className="flex items-center gap-3 mr-4">
              <span className="text-[10px] font-black uppercase text-white/40">Select All</span>
              <button 
                onClick={() => handleSelectAllCategories(selectedCategoryNames.size !== categoryStats.length)} 
                className={cn("h-6 w-6 rounded-lg border-2 transition-all flex items-center justify-center", selectedCategoryNames.size === categoryStats.length && categoryStats.length > 0 ? "bg-primary border-primary" : "border-white/10")}
              >
                {selectedCategoryNames.size === categoryStats.length && categoryStats.length > 0 && <Check className="h-4 w-4 text-black stroke-[3]" />}
              </button>
            </div>
          )}
          <div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner">
            <button onClick={() => isListView ? setViewMode('grid') : setGroupViewMode('grid')} className={cn("p-2.5 rounded-xl transition-all", (isListView ? viewMode === 'grid' : groupViewMode === 'grid') ? "bg-white/10 text-white shadow-lg" : "text-white/20 hover:text-white")}><Grid className="h-4 w-4" /></button>
            <button onClick={() => isListView ? setViewMode('table') : setGroupViewMode('table')} className={cn("p-2.5 rounded-xl transition-all", (isListView ? viewMode === 'table' : groupViewMode === 'table') ? "bg-white/10 text-white shadow-lg" : "text-white/20 hover:text-white")}><List className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* 2. Content Surface */}
      <div className="px-1">
        <AnimatePresence mode="wait">
          {!isListView ? (
            groupViewMode === 'grid' ? (
              <motion.div key="grid-groups" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categoryStats.map(cat => (
                  <Card key={cat.name} className={cn("bg-[#080808] border-2 rounded-[2.5rem] overflow-hidden group hover:border-primary/20 transition-all shadow-3xl", selectedCategoryNames.has(cat.name) ? "border-primary/40" : "border-white/5")}>
                    <CardHeader className="p-8 pb-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase text-white tracking-tight leading-none truncate pr-4">{cat.name}</h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-8 w-8 flex items-center justify-center bg-white/5 rounded-xl text-white/40 hover:text-white transition-all"><MoreHorizontal className="h-4 w-4" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-black border-white/10 rounded-2xl p-2 shadow-3xl">
                            <DropdownMenuItem onClick={() => toggleCategorySelection(cat.name)} className="p-3 rounded-xl focus:bg-primary/10 gap-3">
                              <div className={cn("h-4 w-4 rounded border-2 flex items-center justify-center", selectedCategoryNames.has(cat.name) ? "bg-primary border-primary" : "border-white/20")}>
                                {selectedCategoryNames.has(cat.name) && <Check className="h-3 w-3 text-black stroke-[3]" />}
                              </div>
                              <span className="text-[11px] font-black uppercase tracking-tight">Select Category</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setCustomizingCategory(cat.name); setIsColumnSheetOpen(true); }} className="p-3 rounded-xl focus:bg-primary/10 gap-3">
                              <Wrench className="h-4 w-4 text-white/40" />
                              <span className="text-[11px] font-black uppercase tracking-tight">Customize Columns</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleHideCategory(cat.name)} className="p-3 rounded-xl focus:bg-primary/10 gap-3">
                              <EyeOff className="h-4 w-4 text-white/40" />
                              <span className="text-[11px] font-black uppercase tracking-tight">Hide from List</span>
                            </DropdownMenuItem>
                            <div className="h-px bg-white/5 my-2" />
                            <DropdownMenuItem onClick={() => { setCategoryToWipe(cat.name); setIsCategoryWipeDialogOpen(true); }} className="p-3 rounded-xl focus:bg-red-600/10 text-red-500 gap-3">
                              <Trash2 className="h-4 w-4" />
                              <span className="text-[11px] font-black uppercase tracking-tight">Wipe Local Data</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-8">
                      <div className="flex items-end justify-between">
                        <div className="space-y-1">
                          <p className="text-4xl font-black tracking-tighter text-white">{cat.total}</p>
                          <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Asset Records</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-[1.5rem]"><Boxes className="h-8 w-8 text-white/10" /></div>
                      </div>
                      <div className="h-px w-full border-t border-dashed border-white/10" />
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                          <span className="text-white/40">Verification Pulse</span>
                          <span className="text-primary">{cat.verified} / {cat.total}</span>
                        </div>
                        <Progress value={(cat.verified / cat.total) * 100} className="h-1.5 bg-white/5" />
                      </div>
                    </CardContent>
                    <CardFooter className="px-8 pb-8 pt-0">
                      <Button onClick={() => setSelectedCategory(cat.name)} variant="outline" className="w-full h-12 rounded-xl border-white/10 font-black uppercase text-[10px] tracking-widest gap-2 bg-transparent hover:bg-white/5 text-white/60 hover:text-white transition-all">
                        View Records <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </motion.div>
            ) : (
              <motion.div key="list-groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[2.5rem] border-2 border-border/40 overflow-hidden bg-card/50 shadow-xl">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 px-6"><CheckCircle2 className="h-4 w-4 opacity-20" /></TableHead>
                      <TableHead className="py-4 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Register Block Identity</TableHead>
                      <TableHead className="py-4 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Volume Pulse</TableHead>
                      <TableHead className="py-4 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Verification Progress</TableHead>
                      <TableHead className="py-4 px-6 text-right text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryStats.map(cat => (
                      <TableRow key={cat.name} className="group hover:bg-primary/[0.02] border-b last:border-0 cursor-pointer" onClick={() => setSelectedCategory(cat.name)}>
                        <TableCell className="px-6" onClick={(e) => { e.stopPropagation(); toggleCategorySelection(cat.name); }}>
                          <Checkbox checked={selectedCategoryNames.has(cat.name)} onCheckedChange={() => toggleCategorySelection(cat.name)} className="h-5 w-5 rounded-lg border-2" />
                        </TableCell>
                        <TableCell className="py-6 px-4">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/5 rounded-xl"><TableIcon className="h-5 w-5 text-white/20" /></div>
                            <span className="font-black text-sm uppercase tracking-tight text-white">{cat.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-6 px-4">
                          <div className="flex flex-col">
                            <span className="font-black text-lg text-white">{cat.total}</span>
                            <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">RECORDS</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-6 px-4 w-[300px]">
                          <div className="space-y-2">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                              <span className="text-white/40">{cat.verified} VERIFIED</span>
                              <span className="text-primary">{Math.round((cat.verified/cat.total)*100)}%</span>
                            </div>
                            <Progress value={(cat.verified/cat.total)*100} className="h-1 bg-white/5" />
                          </div>
                        </TableCell>
                        <TableCell className="py-6 px-6 text-right">
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/5 opacity-40 group-hover:opacity-100 transition-all"><ChevronRight className="h-5 w-5" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            )
          ) : (
            <motion.div key="assets" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                  <Badge className="bg-primary text-black font-black uppercase text-[10px] h-8 px-4 rounded-xl shadow-lg">{selectedCategory}</Badge>
                  <span className="text-[10px] font-black uppercase text-white/20 tracking-widest">{filteredAssets.length} Records In Scope</span>
                </div>
              </div>
              {viewMode === 'grid' || isMobile ? (
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 pb-40">
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
                <div className="pb-40">
                  <RegistryTable 
                    records={filteredAssets.map(a => transformAssetToRecord(a, headers, appSettings?.sourceBranding))} 
                    onInspect={(id) => handleInspect(id)} 
                    selectedIds={selectedAssetIds} 
                    onToggleSelect={handleToggleSelect} 
                    onSelectAll={(c) => setSelectedAssetIds(c ? new Set(filteredAssets.map(a => a.id)) : new Set())} 
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Floating Group Command Pulse */}
      <AnimatePresence>
        {(selectedCategoryNames.size > 0 && !isListView) || (selectedAssetIds.size > 0 && isListView) ? (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-black/90 backdrop-blur-3xl border-2 border-primary/20 rounded-[2.5rem] px-8 py-4 flex items-center gap-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col border-r border-white/5 pr-8">
              <span className="text-primary font-black text-2xl leading-none">{isListView ? selectedAssetIds.size : selectedCategoryNames.size}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">Staged {isListView ? 'Records' : 'Groups'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => isListView ? setIsBatchEditOpen(true) : setIsCategoryBatchEditOpen(true)} className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2.5 text-white/60 hover:text-primary transition-all"><Edit3 className="h-4 w-4" /> Batch Audit</Button>
              <Button variant="ghost" onClick={() => isListView ? setSelectedAssetIds(new Set()) : setSelectedCategoryNames(new Set())} className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2.5 text-destructive/60 hover:text-destructive transition-all"><Trash2 className="h-4 w-4" /> Purge Selection</Button>
            </div>
            <div className="w-px h-8 bg-white/5 mx-2" />
            <button onClick={() => isListView ? setSelectedAssetIds(new Set()) : setSelectedCategoryNames(new Set())} className="p-2.5 bg-white/5 rounded-xl text-white/20 hover:text-white transition-all"><X className="h-5 w-5" /></button>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
      
      <CategoryBatchEditForm 
        isOpen={isCategoryBatchEditOpen} 
        onOpenChange={setIsCategoryBatchEditOpen} 
        selectedCategoryCount={selectedCategoryNames.size} 
        onSave={async () => { setSelectedCategoryNames(new Set()); await refreshRegistry(); }} 
      />
      
      {customizingCategory && appSettings?.sheetDefinitions[customizingCategory] && (
        <ColumnCustomizationSheet 
          isOpen={isColumnSheetOpen} 
          onOpenChange={setIsColumnSheetOpen} 
          sheetDefinition={appSettings.sheetDefinitions[customizingCategory]} 
          originalSheetName={customizingCategory} 
          onSave={async (orig, newDef, applyToAll) => {
            if (!appSettings) return;
            const nextDefs = { ...appSettings.sheetDefinitions, [newDef.name]: newDef };
            const nextSettings = { ...appSettings, sheetDefinitions: nextDefs };
            setAppSettings(nextSettings);
            await storage.saveSettings(nextSettings);
            toast({ title: "Template Arrangement Synchronized" });
          }} 
        />
      )}

      <AlertDialog open={isCategoryWipeDialogOpen} onOpenChange={setIsCategoryWipeDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 bg-black shadow-3xl text-white">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit"><Bomb className="h-10 w-10 text-destructive" /></div>
            <AlertDialogTitle className="text-2xl font-black uppercase text-destructive tracking-tight">Wipe Group Data Pulse?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic text-white/60">This will permanently remove all asset records within the <strong>{categoryToWipe}</strong> group from your local registry. This action is deterministic.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-14 px-10 rounded-2xl font-bold border-2 m-0 hover:bg-white/5 transition-all text-white">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={handleWipeCategory} className="h-14 px-12 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-destructive/30 bg-destructive text-white m-0">Execute Wipe</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}