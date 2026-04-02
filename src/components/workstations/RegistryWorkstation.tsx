'use client';

/**
 * @fileOverview RegistryWorkstation - High-Fidelity Asset Inventory.
 * Phase 280: Implemented Batch Deletion Pulse & Administrative Confirmation.
 * Phase 281: Hardened search filters against undefined data pulses.
 * Phase 282: Fixed ReferenceError for Hammer icon.
 * Phase 283: Implemented Natural Numeric Sorting for S/N pulse.
 * Phase 284: ACHIEVED 100% VISUAL PARITY with the Categories & Inventories reference.
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
  Trash,
  Hammer,
  ChevronDown
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { RegistryTable } from '@/components/registry/RegistryTable';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import { Progress } from '@/components/ui/progress';
import AssetForm from '@/components/asset-form';
import { AssetBatchEditForm } from '@/components/asset-batch-edit-form';
import { TagPrintDialog } from '@/components/registry/TagPrintDialog';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { ExcelService } from '@/services/excel-service';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { isWithinScope } from '@/core/auth/rbac';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import type { Asset } from '@/types/domain';
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

interface RegistryWorkstationProps {
  viewAll?: boolean;
}

export function RegistryWorkstation({ viewAll = false }: RegistryWorkstationProps) {
  const { 
    assets, 
    searchTerm,
    headers,
    selectedLocations,
    selectedAssignees,
    selectedStatuses,
    selectedConditions,
    missingFieldFilter,
    sortKey,
    sortDir,
    refreshRegistry
  } = useAppState();
  
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // --- UI State ---
  const [selectedCategory, setSelectedCategory] = useState<string | null>(viewAll ? 'ALL' : null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<Set<string>>(new Set());
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Derived State ---
  const totalVerified = useMemo(() => assets.filter(a => a.status === 'VERIFIED').length, [assets]);
  
  const selectedAsset = useMemo(() => 
    assets.find(a => a.id === selectedAssetId), 
    [assets, selectedAssetId]
  );

  const selectedRecordsForPrint = useMemo(() => {
    return assets
      .filter(a => selectedIds.has(a.id))
      .map(a => transformAssetToRecord(a, headers));
  }, [assets, selectedIds, headers]);

  const filteredAssets = useMemo(() => {
    let results = assets;

    // RBAC: Enforce regional authorized scope pulse
    if (!userProfile?.isAdmin) {
      results = results.filter(a => isWithinScope(userProfile as any, a));
    }

    // Tab Filtering
    if (selectedCategory && selectedCategory !== 'ALL') {
      results = results.filter(a => a.category === selectedCategory);
    }

    // Search Logic
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(a => 
        (a.description || '').toLowerCase().includes(term) || 
        (a.assetIdCode || '').toLowerCase().includes(term) ||
        (a.serialNumber || '').toLowerCase().includes(term)
      );
    }

    // Secondary Filter State
    if (selectedLocations.length > 0) results = results.filter(a => selectedLocations.includes(a.location));
    if (selectedAssignees.length > 0) results = results.filter(a => selectedAssignees.includes(a.custodian));
    if (selectedStatuses.length > 0) results = results.filter(a => selectedStatuses.includes(a.status));
    if (selectedConditions.length > 0) results = results.filter(a => selectedConditions.includes(a.condition));
    if (missingFieldFilter) results = results.filter(a => !(a as any)[missingFieldFilter]);
    
    // Sort Sequence - NATURAL NUMERIC SORT
    results = [...results].sort((a, b) => {
      const valA = String((a as any)[sortKey] ?? '');
      const valB = String((b as any)[sortKey] ?? '');
      
      const comparison = valA.localeCompare(valB, undefined, { 
        numeric: true, 
        sensitivity: 'base' 
      });
      
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return results;
  }, [assets, selectedCategory, searchTerm, selectedLocations, selectedAssignees, selectedStatuses, selectedConditions, missingFieldFilter, sortKey, sortDir, userProfile]);

  const categoryStats = useMemo(() => {
    const scopedAssets = !userProfile?.isAdmin
      ? assets.filter(a => isWithinScope(userProfile as any, a))
      : assets;

    const groups = scopedAssets.reduce((acc, a) => {
      const cat = a.category || 'General Register';
      if (!acc[cat]) acc[cat] = { total: 0, verified: 0 };
      acc[cat].total++;
      if (a.status === 'VERIFIED') acc[cat].verified++;
      return acc;
    }, {} as Record<string, { total: number, verified: number }>);

    return Object.entries(groups).map(([name, stats]) => ({ name, ...stats })).sort((a, b) => a.name.localeCompare(b.name));
  }, [assets, userProfile]);

  // --- Handlers ---
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(filteredAssets.map(a => a.id)));
    else setSelectedIds(new Set());
  };

  const handleToggleAllCategories = () => {
    if (selectedCategoryNames.size === categoryStats.length) {
      setSelectedCategoryNames(new Set());
    } else {
      setSelectedCategoryNames(new Set(categoryStats.map(c => c.name)));
    }
  };

  const handleInspect = (id: string) => {
    setSelectedAssetId(id);
    setIsDetailOpen(true);
  };

  const handleExcelExport = async () => {
    setIsProcessing(true);
    try {
      await ExcelService.exportRegistry(filteredAssets, headers);
      toast({ title: "Excel Pulse Complete" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Export Failed", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSelected = () => {
    if (!userProfile?.isAdmin) {
      toast({ 
        variant: "destructive", 
        title: "Delete Pulse Inhibited", 
        description: "Wipe operation requires administrative clearance." 
      });
      return;
    }
    setIsBatchDeleteDialogOpen(true);
  };

  const confirmDeleteSelected = async () => {
    setIsBatchDeleteDialogOpen(false);
    setIsProcessing(true);
    
    try {
      const idsArray = Array.from(selectedIds);
      for (const id of idsArray) {
        await enqueueMutation('DELETE', 'assets', { id });
      }
      
      const currentLocal = await storage.getAssets();
      const nextLocal = currentLocal.filter(a => !selectedIds.has(a.id));
      await storage.saveAssets(nextLocal);
      
      await refreshRegistry();
      setSelectedIds(new Set());
      
      toast({ 
        title: "Purge Complete", 
        description: `Successfully removed ${idsArray.length} records from the local register.` 
      });
    } catch (e) {
      toast({ 
        variant: "destructive", 
        title: "Purge Failure", 
        description: "Operational heartbeat interruption during deletion." 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isListView = selectedCategory || viewAll;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* 1. Header Protocol: Synchronized with Reference Image */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3 self-start">
          {isListView && !viewAll ? (
            <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-2 p-2 bg-white/5 rounded-xl text-primary tactile-pulse transition-all">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Back to Categories</span>
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-xl">
                <LayoutGrid className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white leading-none">
                Categories & Inventories
              </h2>
            </div>
          )}
        </div>

        {!isListView ? (
          <div className="flex items-center gap-6">
            <Button variant="outline" className="h-11 px-6 rounded-2xl border-white/10 bg-black/40 text-white font-black uppercase text-[10px] tracking-widest gap-3 shadow-sm group">
              Overall Project Scope <span className="text-primary">{totalVerified}/{assets.length}</span>
              <ChevronDown className="h-3 w-3 text-white/20 group-hover:text-primary transition-colors" />
            </Button>
            
            <div className="flex items-center gap-3 group cursor-pointer" onClick={handleToggleAllCategories}>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">Select All</span>
              <button className={cn(
                "h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center",
                selectedCategoryNames.size === categoryStats.length ? "bg-primary border-primary" : "border-white/20"
              )}>
                {selectedCategoryNames.size === categoryStats.length && <div className="h-2 w-2 rounded-full bg-black" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExcelExport}
              disabled={isProcessing || filteredAssets.length === 0}
              className="h-9 md:h-10 px-3 md:px-4 rounded-xl font-black uppercase text-[8px] md:text-[9px] tracking-widest gap-2 bg-white/5 border-white/10"
            >
              {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-3 w-3" />}
              Export Register
            </Button>

            {!isMobile && (
              <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5">
                <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white/10 text-white" : "text-white/20 hover:text-white")}><Grid className="h-4 w-4" /></button>
                <button onClick={() => setViewMode('table')} className={cn("p-2 rounded-lg transition-all", viewMode === 'table' ? "bg-white/10 text-white" : "text-white/20 hover:text-white")}><List className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Unified Content Surface */}
      <div className="px-1 min-h-[400px]">
        <AnimatePresence mode="wait">
          {!isListView ? (
            <motion.div 
              key="categories" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6"
            >
              {categoryStats.map(cat => {
                const isSelected = selectedCategoryNames.has(cat.name);
                const verificationPercent = cat.total > 0 ? (cat.verified / cat.total) * 100 : 0;

                return (
                  <Card 
                    key={cat.name} 
                    className={cn(
                      "bg-[#080808] border-2 rounded-3xl transition-all duration-500 shadow-3xl flex flex-col p-8 group relative",
                      isSelected ? "border-primary/40 ring-1 ring-primary/20" : "border-white/5"
                    )}
                  >
                    <CardHeader className="p-0 pb-10 flex flex-row items-start justify-between space-y-0">
                      <h3 className="text-white font-black uppercase text-[13px] tracking-widest pr-4 leading-tight line-clamp-2">
                        {cat.name}
                      </h3>
                      <button className="h-8 w-8 flex items-center justify-center text-white/20 hover:text-white transition-colors">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </CardHeader>
                    
                    <CardContent className="p-0 flex-1 flex flex-col gap-8">
                      {/* Count Slot */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-5xl font-black text-white tracking-tighter leading-none">
                            {cat.total}
                          </div>
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                            Asset Records
                          </p>
                        </div>
                        <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 opacity-10 group-hover:opacity-30 transition-opacity">
                          <LayoutGrid className="h-10 w-10 text-white" />
                        </div>
                      </div>

                      {/* Verification Pulse Slot */}
                      <div className="space-y-4 pt-8 border-t border-dashed border-white/10">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em]">
                          <span className="text-white/40">Verification</span>
                          <span className="text-white/60">{cat.verified} / {cat.total}</span>
                        </div>
                        <Progress value={verificationPercent} className="h-1.5 bg-white/5" />
                      </div>

                      {/* Action Pulse */}
                      <Button 
                        onClick={() => setSelectedCategory(cat.name)}
                        variant="outline" 
                        className="w-full h-14 rounded-2xl border-white/10 bg-transparent hover:bg-primary hover:text-black hover:border-primary font-black uppercase text-[11px] tracking-[0.25em] transition-all group/btn shadow-sm"
                      >
                        View Records <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                      </Button>
                    </CardContent>

                    {/* Selection Indicator Overlay */}
                    {isSelected && (
                      <div className="absolute top-4 right-14 h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </Card>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key="assets" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {viewMode === 'grid' || isMobile ? (
                <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 pb-20">
                  {filteredAssets.map(asset => (
                    <RegistryCard key={asset.id} record={transformAssetToRecord(asset, headers)} onInspect={handleInspect} selected={selectedIds.has(asset.id)} onToggleSelect={handleToggleSelect} />
                  ))}
                </div>
              ) : (
                <RegistryTable records={filteredAssets.map(a => transformAssetToRecord(a, headers))} onInspect={handleInspect} selectedIds={selectedIds} onToggleSelect={handleToggleSelect} onSelectAll={handleSelectAll} />
              )}
              {filteredAssets.length === 0 && (
                <div className="py-40 text-center opacity-20 flex flex-col items-center gap-6">
                  <Boxes className="h-16 w-16 md:h-20 md:w-20" />
                  <p className="text-lg font-black uppercase tracking-widest">Registry Silent</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Batch Control Terminal */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 100, opacity: 0 }} 
            className={cn(
              "fixed left-1/2 -translate-x-1/2 z-50 bg-[#080808]/95 backdrop-blur-3xl border-2 border-primary/20 shadow-3xl flex items-center transition-all",
              isMobile ? "bottom-0 w-full rounded-t-3xl px-4 py-6 justify-between" : "bottom-10 min-w-[600px] rounded-[2.5rem] px-8 py-4 gap-8"
            )}
          >
            <div className={cn("flex flex-col", !isMobile && "pr-8 border-r border-white/5")}>
              <span className="text-primary font-black text-lg md:text-xl leading-none">{selectedIds.size}</span>
              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">Staged</span>
            </div>

            <div className={cn("flex items-center gap-2", isMobile ? "flex-1 justify-center px-4" : "gap-3")}>
              <Button variant="ghost" onClick={() => setIsBatchEditOpen(true)} className="h-10 md:h-12 px-3 md:px-6 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest gap-2 text-white/60 hover:text-primary transition-all"><Edit3 className="h-4 w-4" /> {isMobile ? '' : 'Edit'}</Button>
              <Button variant="ghost" onClick={() => setIsPrintOpen(true)} className="h-10 md:h-12 px-3 md:px-6 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest gap-2 text-white/60 hover:text-blue-500 transition-all"><Printer className="h-4 w-4" /> {isMobile ? '' : 'Print'}</Button>
              <Button variant="ghost" onClick={handleDeleteSelected} className="h-10 md:h-12 px-3 md:px-6 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest gap-2 text-white/60 hover:text-red-500 transition-all"><Trash2 className="h-4 w-4" /> {isMobile ? '' : 'Delete'}</Button>
            </div>

            <button onClick={() => setSelectedIds(new Set())} className={cn("p-2 text-white/20 hover:text-white transition-colors", isMobile && "bg-white/5 rounded-full")}>
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AssetDetailSheet 
        isOpen={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        record={filteredAssets.find(a => a.id === selectedAssetId) ? transformAssetToRecord(filteredAssets.find(a => a.id === selectedAssetId)!, headers) : undefined}
        onEdit={() => { setIsDetailOpen(false); setIsFormOpen(true); }}
      />

      <AssetForm 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        asset={selectedAsset} 
        isReadOnly={false} 
        onSave={async (a) => { 
          await enqueueMutation('UPDATE', 'assets', a); 
          const currentLocal = await storage.getAssets();
          await storage.saveAssets(currentLocal.map(x => x.id === a.id ? a : x));
          await refreshRegistry(); 
          setIsFormOpen(false); 
          toast({ title: "Modification Pulse Complete" });
        }} 
      />

      <AssetBatchEditForm isOpen={isBatchEditOpen} onOpenChange={setIsBatchEditOpen} selectedAssetCount={selectedIds.size} onSave={async () => { setSelectedIds(new Set()); await refreshRegistry(); }} />
      <TagPrintDialog isOpen={isPrintOpen} onOpenChange={setIsPrintOpen} records={selectedRecordsForPrint} />

      {/* Batch Deletion Confirmation */}
      <AlertDialog open={isBatchDeleteDialogOpen} onOpenChange={setIsBatchDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 bg-background shadow-3xl">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit">
              <Bomb className="h-10 w-10 text-destructive" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase text-destructive tracking-tight">Execute Purge Pulse?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-muted-foreground">
              You are about to permanently remove <strong>{selectedIds.size} selected records</strong> from the active register. This action is deterministic and will be broadcast to the cloud.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 m-0 hover:bg-white/5 transition-all">Abort Action</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteSelected}
              className="h-12 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-destructive/30 bg-destructive text-white m-0"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Hammer className="h-4 w-4 mr-2" />}
              Commit Wipe Pulse
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
