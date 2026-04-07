'use client';

/**
 * @fileOverview RegistryWorkstation - Condition-Grouped Asset Inventory.
 * Organizes assets into canonical condition groups with administrative controls.
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
  Trash2,
  Loader2,
  X,
  ShieldCheck,
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
  Tag,
  Settings2,
  AlertTriangle
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import AssetForm from '@/components/asset-form';
import { AssetBatchEditForm } from '@/components/asset-batch-edit-form';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import { ConditionSummary } from '@/components/registry/ConditionSummary';
import { groupAssetsByCondition, CONDITION_GROUPS, GROUP_COLORS, GROUP_BG_COLORS } from '@/lib/condition-logic';
import type { Asset, ConditionGroup } from '@/types/domain';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export function RegistryWorkstation({ viewAll = false }: { viewAll?: boolean }) {
  const { 
    assets, 
    searchTerm,
    headers,
    refreshRegistry,
    appSettings,
    isOnline
  } = useAppState();
  
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCategoryWipeDialogOpen, setIsCategoryWipeDialogOpen] = useState(false);
  const [categoryToWipe, setCategoryToWipe] = useState<ConditionGroup | null>(null);

  const filteredAssets = useMemo(() => {
    let results = assets;
    if (selectedCategory && selectedCategory !== 'ALL') results = results.filter(a => a.category === selectedCategory);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(a => 
        (a.description || '').toLowerCase().includes(term) || 
        (a.assetIdCode || '').toLowerCase().includes(term) ||
        (a.serialNumber || '').toLowerCase().includes(term)
      );
    }
    return results;
  }, [assets, selectedCategory, searchTerm]);

  const assetsByCondition = useMemo(() => groupAssetsByCondition(filteredAssets), [filteredAssets]);
  
  const conditionCounts = useMemo(() => {
    const counts: any = {};
    CONDITION_GROUPS.forEach(g => counts[g] = assetsByCondition[g].length);
    return counts;
  }, [assetsByCondition]);

  const selectedRecord = useMemo(() => {
    if (!selectedAssetId) return undefined;
    const asset = assets.find(a => a.id === selectedAssetId);
    return asset ? transformAssetToRecord(asset, headers, appSettings?.sourceBranding) : undefined;
  }, [selectedAssetId, assets, headers, appSettings?.sourceBranding]);

  const handleInspect = (id: string) => {
    setSelectedAssetId(id);
    setIsDetailOpen(true);
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedAssetIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedAssetIds(next);
  };

  const handleDeleteSelectedAssets = async () => {
    if (selectedAssetIds.size === 0) return;
    setIsProcessing(true);
    try {
      const ids = Array.from(selectedAssetIds);
      for (const id of ids) {
        await enqueueMutation('DELETE', 'assets', { id });
      }
      
      const currentLocal = await storage.getAssets();
      await storage.saveAssets(currentLocal.filter(a => !selectedAssetIds.has(a.id)));
      
      await refreshRegistry();
      setSelectedAssetIds(new Set());
      toast({ title: "Records Removed", description: `Successfully deleted ${ids.length} assets.` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWipeCategory = async () => {
    if (!categoryToWipe) return;
    setIsProcessing(true);
    try {
      const assetsInGroup = assetsByCondition[categoryToWipe];
      for (const asset of assetsInGroup) {
        await enqueueMutation('DELETE', 'assets', { id: asset.id });
      }
      
      const currentLocal = await storage.getAssets();
      const idsToWipe = new Set(assetsInGroup.map(a => a.id));
      await storage.saveAssets(currentLocal.filter(a => !idsToWipe.has(a.id)));
      
      await refreshRegistry();
      setIsCategoryWipeDialogOpen(false);
      setCategoryToWipe(null);
      toast({ title: "Group Wiped", description: `All assets in ${categoryToWipe} group removed.` });
    } finally {
      setIsProcessing(false);
    }
  };

  const isAdmin = userProfile?.isAdmin || false;

  return (
    <div className="space-y-10 h-full flex flex-col">
      
      {/* 1. Global Header Control */}
      <div className="px-1 space-y-8 shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 self-start">
            {selectedCategory ? (
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setSelectedCategory(null)} 
                  className="h-12 w-12 flex items-center justify-center bg-white/5 rounded-2xl text-white/40 hover:text-white border border-white/5 transition-all shadow-xl"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="space-y-1">
                  <h2 className="text-2xl md:text-3xl font-black uppercase text-white tracking-tight leading-none">{selectedCategory}</h2>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">CATEGORY PULSE</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl shadow-inner">
                  <Database className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-xl md:text-3xl font-black uppercase text-white tracking-tight leading-none">Condition Registry</h2>
                  <p className="text-[10px] md:text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Canonical Grouping & Audit Control</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-black/40 p-1.5 rounded-[1.25rem] border border-white/5 shadow-inner backdrop-blur-xl">
              <button 
                onClick={() => setViewMode('grid')} 
                className={cn("p-2.5 rounded-xl transition-all", viewMode === 'grid' ? "bg-white/10 text-white shadow-lg" : "text-white/20 hover:text-white")}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setViewMode('table')} 
                className={cn("p-2.5 rounded-xl transition-all", viewMode === 'table' ? "bg-white/10 text-white shadow-lg" : "text-white/20 hover:text-white")}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. Condition Summary Bar */}
        <ConditionSummary 
          counts={conditionCounts} 
          total={filteredAssets.length} 
          className="animate-in fade-in slide-in-from-top-2 duration-700"
        />
      </div>

      {/* 3. Main Display Area - Grouped by Condition */}
      <div className="flex-1 min-h-0 px-1">
        <ScrollArea className="h-full pr-4 custom-scrollbar">
          <div className="pb-40">
            <Accordion type="multiple" defaultValue={['Good', 'Discrepancy']} className="space-y-6">
              {CONDITION_GROUPS.map(group => {
                const groupAssets = assetsByCondition[group];
                if (groupAssets.length === 0 && group !== 'Good') return null;

                return (
                  <AccordionItem 
                    key={group} 
                    value={group} 
                    className={cn(
                      "border-2 rounded-[2.5rem] overflow-hidden bg-[#080808] transition-all duration-500",
                      GROUP_BG_COLORS[group]
                    )}
                  >
                    <AccordionTrigger className="p-8 hover:no-underline group">
                      <div className="flex items-center justify-between w-full pr-6">
                        <div className="flex items-center gap-6">
                          <div className={cn("p-4 rounded-[1.5rem] shadow-inner transition-transform group-hover:scale-110", GROUP_BG_COLORS[group])}>
                            <Boxes className={cn("h-8 w-8", GROUP_COLORS[group])} />
                          </div>
                          <div className="text-left">
                            <h3 className={cn("text-2xl font-black uppercase tracking-tight", GROUP_COLORS[group])}>{group} Pulse</h3>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                              {groupAssets.length} Records classified
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className={cn("font-black h-8 px-4 rounded-full border-2", GROUP_BG_COLORS[group], GROUP_COLORS[group])}>
                            {Math.round((groupAssets.length / filteredAssets.length) * 100 || 0)}%
                          </Badge>
                          <ChevronDown className="h-6 w-6 text-white/20 transition-transform group-data-[state=open]:rotate-180" />
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="p-8 pt-0 border-t border-white/5 bg-black/20">
                      <div className="pt-8">
                        <div className="flex justify-end mb-6">
                          {isAdmin && groupAssets.length > 0 && (
                            <Button 
                              variant="ghost" 
                              onClick={() => { setCategoryToWipe(group); setIsCategoryWipeDialogOpen(true); }}
                              className="h-10 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                            >
                              <Bomb className="h-3.5 w-3.5" /> Wipe Group
                            </Button>
                          )}
                        </div>
                        {viewMode === 'grid' || isMobile ? (
                          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                            {groupAssets.map(asset => (
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
                            records={groupAssets.map(a => transformAssetToRecord(a, headers, appSettings?.sourceBranding))} 
                            onInspect={handleInspect} 
                            selectedIds={selectedAssetIds} 
                            onToggleSelect={handleToggleSelect} 
                            onSelectAll={(c) => {
                              const next = new Set(selectedAssetIds);
                              groupAssets.forEach(a => c ? next.add(a.id) : next.delete(a.id));
                              setSelectedAssetIds(next);
                            }}
                          />
                        )}
                        
                        {groupAssets.length === 0 && (
                          <div className="py-20 text-center opacity-20 border-2 border-dashed rounded-[2rem] border-white/10">
                            <ShieldCheck className="h-12 w-12 mx-auto mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest">Group Empty</p>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </ScrollArea>
      </div>

      {/* 4. Action Terminal Pulse */}
      <AnimatePresence>
        {selectedAssetIds.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-[#0A0A0A] border-2 border-primary/20 rounded-[2.5rem] p-4 flex items-center gap-8 shadow-[0_0_50px_rgba(var(--primary),0.1)] backdrop-blur-3xl min-w-[600px]"
          >
            <div className="flex items-center gap-4 pl-4">
              <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center text-black font-black text-xs shadow-xl shadow-primary/20">
                {selectedAssetIds.size}
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Records Selected</span>
            </div>

            <div className="h-8 w-px bg-white/10" />

            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setIsBatchEditOpen(true)} className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 text-white/60 hover:text-white hover:bg-white/5 transition-all">
                <Edit3 className="h-4 w-4" /> Bulk Condition
              </Button>
              <Button variant="ghost" onClick={handleDeleteSelectedAssets} className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-all">
                <Trash2 className="h-4 w-4" /> Delete Pulses
              </Button>
            </div>

            <button onClick={() => setSelectedAssetIds(new Set())} className="ml-auto mr-4 h-10 w-10 rounded-full flex items-center justify-center text-white/20 hover:text-white hover:bg-white/5 transition-all">
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AssetDetailSheet 
        isOpen={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        record={selectedRecord} 
        onEdit={(id) => { setSelectedAssetId(id); setIsFormOpen(true); setIsDetailOpen(false); }} 
      />
      
      <AssetForm 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        asset={assets.find(a => a.id === selectedAssetId)} 
        isReadOnly={false} 
        onSave={async (a) => { 
          await enqueueMutation('UPDATE', 'assets', a); 
          await refreshRegistry(); 
          setIsFormOpen(false); 
        }} 
      />
      
      <AssetBatchEditForm 
        isOpen={isBatchEditOpen} 
        onOpenChange={setIsBatchEditOpen} 
        selectedAssetCount={selectedAssetIds.size} 
        onSave={async (data) => { 
          const ids = Array.from(selectedAssetIds);
          for (const id of ids) {
            const asset = assets.find(a => a.id === id);
            if (asset) {
              await enqueueMutation('UPDATE', 'assets', { ...asset, ...data });
            }
          }
          await refreshRegistry();
          setSelectedAssetIds(new Set());
          toast({ title: "Bulk Update Pulse Committed" });
        }} 
      />

      <AlertDialog open={isCategoryWipeDialogOpen} onOpenChange={setIsCategoryWipeDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 p-10 shadow-3xl bg-black text-white">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit">
              <Bomb className="h-12 w-12 text-destructive" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase text-destructive tracking-tight">Execute Selective Wipe?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic text-white/60 leading-relaxed">
              You are about to perform a deterministic wipe of all records in this condition group. This action is immutable locally and will be broadcast to the cloud authority.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-14 px-10 rounded-2xl font-bold border-2 border-white/10 m-0 hover:bg-white/5 transition-all text-white">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={handleWipeCategory} disabled={isProcessing} className="h-14 px-12 rounded-2xl font-black uppercase bg-destructive text-white m-0 shadow-2xl shadow-destructive/20">
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Hammer className="h-5 w-5 mr-3" />} Commit Wipe Pulse
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
