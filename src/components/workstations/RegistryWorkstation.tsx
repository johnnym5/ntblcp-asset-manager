'use client';

/**
 * @fileOverview RegistryWorkstation - High-Fidelity Asset Inventory.
 * Phase 355: Fixed handleInspect ReferenceError and implemented browse navigation.
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
  Check
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
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Handlers ---
  const handleInspect = (id: string) => {
    setSelectedAssetId(id);
    setIsDetailOpen(true);
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(filteredAssets.map(a => a.id)));
    else setSelectedIds(new Set());
  };

  // --- Derived State ---
  const filteredAssets = useMemo(() => {
    let results = assets;

    // RBAC Scope
    if (!userProfile?.isAdmin && userProfile?.role !== 'SUPERADMIN') {
      results = results.filter(a => isWithinScope(userProfile as any, a));
    }

    // Group Folder Filtering
    if (selectedCategory && selectedCategory !== 'ALL') {
      results = results.filter(a => a.category === selectedCategory);
    }

    // Global Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(a => 
        (a.description || '').toLowerCase().includes(term) || 
        (a.assetIdCode || '').toLowerCase().includes(term) ||
        (a.serialNumber || '').toLowerCase().includes(term)
      );
    }

    // Natural Numeric Sorting
    results = [...results].sort((a, b) => {
      const valA = String((a as any)[sortKey] ?? '');
      const valB = String((b as any)[sortKey] ?? '');
      return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' }) * (sortDir === 'asc' ? 1 : -1);
    });

    return results;
  }, [assets, selectedCategory, searchTerm, sortKey, sortDir, userProfile]);

  const selectedRecord = useMemo(() => {
    if (!selectedAssetId) return undefined;
    const asset = assets.find(a => a.id === selectedAssetId);
    return asset ? transformAssetToRecord(asset, headers) : undefined;
  }, [selectedAssetId, assets, headers]);

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

  const handleNext = () => {
    const currentIndex = filteredAssets.findIndex(a => a.id === selectedAssetId);
    if (currentIndex < filteredAssets.length - 1) {
      setSelectedAssetId(filteredAssets[currentIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    const currentIndex = filteredAssets.findIndex(a => a.id === selectedAssetId);
    if (currentIndex > 0) {
      setSelectedAssetId(filteredAssets[currentIndex - 1].id);
    }
  };

  const handleBatchVerify = async () => {
    setIsProcessing(true);
    try {
      for (const id of Array.from(selectedIds)) {
        const asset = assets.find(a => a.id === id);
        if (asset) {
          const updated = { ...asset, status: 'VERIFIED' as const, lastModified: new Date().toISOString() };
          await enqueueMutation('UPDATE', 'assets', updated);
        }
      }
      await refreshRegistry();
      setSelectedIds(new Set());
      toast({ title: "Batch Verification Complete" });
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDeleteSelected = async () => {
    setIsBatchDeleteDialogOpen(false);
    setIsProcessing(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await enqueueMutation('DELETE', 'assets', { id });
      }
      await refreshRegistry();
      setSelectedIds(new Set());
      toast({ title: "Purge Complete" });
    } finally {
      setIsProcessing(false);
    }
  };

  const isListView = !!selectedCategory;

  return (
    <div className="space-y-8 min-h-[60vh]">
      {/* 1. Header Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4 self-start">
          {isListView ? (
            <button onClick={() => { setSelectedCategory(null); setSelectedIds(new Set()); }} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl text-primary hover:bg-white/10 transition-all tactile-pulse">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">Back to Groups</span>
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl shadow-inner">
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-2xl font-black uppercase text-white tracking-tight leading-none">Inventories</h2>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] leading-none">Group Navigation</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
          <div className="flex items-center bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner">
            <button onClick={() => setViewMode('grid')} className={cn("p-2.5 rounded-xl transition-all", viewMode === 'grid' ? "bg-white/10 text-white shadow-lg" : "text-white/20 hover:text-white")}><Grid className="h-4 w-4" /></button>
            <button onClick={() => setViewMode('table')} className={cn("p-2.5 rounded-xl transition-all", viewMode === 'table' ? "bg-white/10 text-white shadow-lg" : "text-white/20 hover:text-white")}><List className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* 2. Content Area */}
      <div className="px-1">
        <AnimatePresence mode="wait">
          {!isListView ? (
            <motion.div key="folders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categoryStats.map(cat => {
                const percent = Math.round((cat.verified / cat.total) * 100);
                return (
                  <Card key={cat.name} className="bg-[#080808] border-white/5 rounded-[2.5rem] overflow-hidden group cursor-pointer hover:border-primary/20 transition-all shadow-3xl" onClick={() => setSelectedCategory(cat.name)}>
                    <CardHeader className="p-8 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-primary/10 transition-colors"><Boxes className="h-6 w-6 text-white/40 group-hover:text-primary" /></div>
                        <ChevronRight className="h-5 w-5 text-white/10 group-hover:text-primary transition-all group-hover:translate-x-1" />
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-8">
                      <div className="space-y-1">
                        <h3 className="text-xl font-black uppercase text-white tracking-tight line-clamp-2">{cat.name}</h3>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{cat.total} Records Pulse</p>
                      </div>
                      <div className="space-y-3 pt-6 border-t border-dashed border-white/10">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                          <span className="text-white/40">Verified</span>
                          <span className="text-primary">{cat.verified} / {cat.total}</span>
                        </div>
                        <Progress value={percent} className="h-1.5 bg-white/5" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key="inventory" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                  <Badge className="bg-primary text-black font-black uppercase text-[10px] h-8 px-4 rounded-xl shadow-lg">
                    {selectedCategory}
                  </Badge>
                  <span className="text-[10px] font-black uppercase text-white/20 tracking-widest">{filteredAssets.length} Records Found</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase text-white/40">Select All</span>
                  <button onClick={() => handleSelectAll(selectedIds.size !== filteredAssets.length)} className={cn("h-6 w-6 rounded-lg border-2 transition-all flex items-center justify-center", selectedIds.size === filteredAssets.length ? "bg-primary border-primary" : "border-white/10")}>
                    {selectedIds.size === filteredAssets.length && <Check className="h-4 w-4 text-black stroke-[3]" />}
                  </button>
                </div>
              </div>

              {viewMode === 'grid' || isMobile ? (
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 pb-40">
                  {filteredAssets.map(asset => (
                    <RegistryCard key={asset.id} record={transformAssetToRecord(asset, headers)} onInspect={handleInspect} selected={selectedIds.has(asset.id)} onToggleSelect={handleToggleSelect} />
                  ))}
                </div>
              ) : (
                <div className="pb-40">
                  <RegistryTable records={filteredAssets.map(a => transformAssetToRecord(a, headers))} onInspect={handleInspect} selectedIds={selectedIds} onToggleSelect={handleToggleSelect} onSelectAll={handleSelectAll} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Batch Command Terminal */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-black/90 backdrop-blur-3xl border-2 border-primary/20 rounded-[2.5rem] px-8 py-4 flex items-center gap-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col border-r border-white/5 pr-8">
              <span className="text-primary font-black text-2xl leading-none">{selectedIds.size}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">Staged Pulses</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setIsBatchEditOpen(true)} className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2.5 text-white/60 hover:text-primary transition-all"><Edit3 className="h-4 w-4" /> Edit</Button>
              <Button variant="ghost" onClick={handleBatchVerify} className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2.5 text-white/60 hover:text-green-500 transition-all"><CheckCircle2 className="h-4 w-4" /> Verify</Button>
              <Button variant="ghost" onClick={() => setIsBatchDeleteDialogOpen(true)} className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2.5 text-white/60 hover:text-red-500 transition-all"><Trash2 className="h-4 w-4" /> Delete</Button>
            </div>
            <div className="w-px h-8 bg-white/5 mx-2" />
            <button onClick={() => setSelectedIds(new Set())} className="p-2.5 bg-white/5 rounded-xl text-white/20 hover:text-white transition-all"><X className="h-5 w-5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <AssetDetailSheet 
        isOpen={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        record={selectedRecord}
        onEdit={(id) => {
          setSelectedAssetId(id);
          setIsFormOpen(true);
          setIsDetailOpen(false);
        }}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />

      <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={assets.find(a => a.id === selectedAssetId)} isReadOnly={false} onSave={async (a) => { await enqueueMutation('UPDATE', 'assets', a); await refreshRegistry(); setIsFormOpen(false); }} />
      <AssetBatchEditForm isOpen={isBatchEditOpen} onOpenChange={setIsBatchEditOpen} selectedAssetCount={selectedIds.size} onSave={async () => { setSelectedIds(new Set()); await refreshRegistry(); }} />
      
      <AlertDialog open={isBatchDeleteDialogOpen} onOpenChange={setIsBatchDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 bg-black shadow-3xl text-white">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit"><Bomb className="h-10 w-10 text-destructive" /></div>
            <AlertDialogTitle className="text-2xl font-black uppercase text-destructive tracking-tight">Execute Batch Purge?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic text-white/60">You are about to permanently remove {selectedIds.size} records from the register. This action is deterministic.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-14 px-10 rounded-2xl font-bold border-2 m-0 hover:bg-white/5 transition-all text-white">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSelected} className="h-14 px-12 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-destructive/30 bg-destructive text-white m-0">{isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Hammer className="h-4 w-4 mr-2" />}Commit Purge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}