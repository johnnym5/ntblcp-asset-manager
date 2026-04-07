'use client';

/**
 * @fileOverview AssetGroupsWorkstation - Folder-Based Registry Hub.
 * Optimized with pagination for drill-down views to prevent browser freezing.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { 
  LayoutGrid, 
  Boxes, 
  ChevronRight, 
  Search, 
  Database,
  ArrowLeft,
  Activity,
  History,
  Tag,
  Zap,
  CheckCircle2,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Layers,
  ArrowRightLeft,
  ShieldCheck,
  ChevronDown,
  Bomb,
  Grid,
  List,
  Edit3,
  Trash2,
  X,
  Hammer,
  Bell,
  FolderOpen,
  ChevronLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClassificationEngine } from '@/lib/classification-engine';
import { cn } from '@/lib/utils';
import type { Asset, ConditionGroup } from '@/types/domain';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ConditionSummary } from '@/components/registry/ConditionSummary';
import { groupAssetsByCondition, CONDITION_GROUPS, GROUP_COLORS, GROUP_BG_COLORS } from '@/lib/condition-logic';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { RegistryTable } from '@/components/registry/RegistryTable';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import AssetForm from '@/components/asset-form';
import { AssetBatchEditForm } from '@/components/asset-batch-edit-form';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { storage } from '@/offline/storage';
import { enqueueMutation } from '@/offline/queue';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
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

const ITEMS_PER_PAGE = 50;

export function AssetGroupsWorkstation() {
  const { assets, searchTerm, headers, refreshRegistry, appSettings, setSearchTerm, setActiveView } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // UI State
  const [groupMode, setGroupMode] = useState<'category' | 'condition'>('category');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState<string | null>(null);
  const [groupSearch, setGroupSearch] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(isMobile ? 'grid' : 'table');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Selection & Form State
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCategoryWipeDialogOpen, setIsCategoryWipeDialogOpen] = useState(false);
  const [categoryToWipe, setCategoryToWipe] = useState<ConditionGroup | null>(null);

  // 1. Intelligence Calculation - Memoized for performance
  const filteredAssets = useMemo(() => {
    if (!searchTerm) return assets;
    const term = searchTerm.toLowerCase();
    return assets.filter(a => 
      (a.description || '').toLowerCase().includes(term) || 
      (a.assetIdCode || '').toLowerCase().includes(term)
    );
  }, [assets, searchTerm]);

  const classifiedAssets = useMemo(() => {
    return filteredAssets.map(a => ({
      ...a,
      classification: ClassificationEngine.classify(a)
    }));
  }, [filteredAssets]);

  const tree = useMemo(() => ClassificationEngine.getGroupTree(classifiedAssets), [classifiedAssets]);
  const conditionGroups = useMemo(() => groupAssetsByCondition(filteredAssets), [filteredAssets]);
  
  const conditionCounts = useMemo(() => {
    const counts: any = {};
    CONDITION_GROUPS.forEach(g => counts[g] = conditionGroups[g].length);
    return counts;
  }, [conditionGroups]);

  const sortedGroups = useMemo(() => {
    return Object.entries(tree)
      .map(([name, data]) => ({ name, ...data }))
      .filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()))
      .sort((a, b) => b.count - a.count);
  }, [tree, groupSearch]);

  const drillDownAssets = useMemo(() => {
    let list = classifiedAssets;
    if (selectedGroup) list = list.filter(a => a.classification?.group === selectedGroup);
    if (selectedSubgroup) list = list.filter(a => a.classification?.subgroup === selectedSubgroup);
    return list;
  }, [classifiedAssets, selectedGroup, selectedSubgroup]);

  const totalPages = Math.ceil(drillDownAssets.length / ITEMS_PER_PAGE);
  const paginatedDrillDown = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return drillDownAssets.slice(start, start + ITEMS_PER_PAGE);
  }, [drillDownAssets, currentPage]);

  // Contiguous Navigation Pulse Logic
  const currentIndex = useMemo(() => {
    if (!selectedAssetId) return -1;
    return drillDownAssets.findIndex(a => a.id === selectedAssetId);
  }, [selectedAssetId, drillDownAssets]);

  const handleNext = useCallback(() => {
    if (currentIndex < drillDownAssets.length - 1) {
      setSelectedAssetId(drillDownAssets[currentIndex + 1].id);
    }
  }, [currentIndex, drillDownAssets]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setSelectedAssetId(drillDownAssets[currentIndex - 1].id);
    }
  }, [currentIndex, drillDownAssets]);

  const selectedRecord = useMemo(() => {
    if (!selectedAssetId) return undefined;
    const asset = assets.find(a => a.id === selectedAssetId);
    return asset ? transformAssetToRecord(asset, headers, appSettings?.sourceBranding) : undefined;
  }, [selectedAssetId, assets, headers, appSettings?.sourceBranding]);

  // Handlers
  const handleInspect = (id: string) => {
    setSelectedAssetId(id);
    setIsDetailOpen(true);
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedAssetIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedAssetIds(next);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-40 h-full flex flex-col relative">
      
      {/* 1. Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1 shrink-0">
        <div className="flex items-center gap-4 self-start">
          {selectedGroup ? (
            <button 
              onClick={() => { setSelectedGroup(null); setSelectedSubgroup(null); setCurrentPage(1); }}
              className="h-12 w-12 flex items-center justify-center bg-white/5 rounded-2xl text-white/40 hover:text-white border border-white/5 transition-all shadow-xl"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          ) : (
            <div className="p-3 bg-primary/10 rounded-2xl shadow-inner border border-primary/5">
              <FolderOpen className="h-8 w-8 text-primary" />
            </div>
          )}
          <div className="space-y-0.5">
            <h2 className="text-3xl font-black uppercase text-white tracking-tight leading-none">
              {selectedGroup ? (selectedSubgroup || selectedGroup) : 'Inventory Folders'}
            </h2>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.25em] leading-none">
              {selectedGroup ? 'NAVIGATING CONTAINER PULSE' : 'STRUCTURAL CATEGORY HUB'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!selectedGroup && (
            <div className="bg-white/[0.03] p-1 rounded-2xl border border-white/5 shadow-inner backdrop-blur-xl flex">
              <button 
                onClick={() => { setGroupMode('category'); setGroupSearch(''); }}
                className={cn("px-6 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all", groupMode === 'category' ? "bg-primary text-black" : "text-white/40 hover:text-white")}
              >
                Categories
              </button>
              <button 
                onClick={() => { setGroupMode('condition'); setGroupSearch(''); }}
                className={cn("px-6 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all", groupMode === 'condition' ? "bg-primary text-black" : "text-white/40 hover:text-white")}
              >
                Conditions
              </button>
            </div>
          )}
          <div className="flex items-center bg-black/40 p-1.5 rounded-xl border border-white/5 shadow-inner">
            <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white/10 text-white" : "text-white/20")}><Grid className="h-3.5 w-3.5" /></button>
            <button onClick={() => setViewMode('table')} className={cn("p-2 rounded-lg transition-all", viewMode === 'table' ? "bg-white/10 text-white" : "text-white/20")}><List className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>

      {/* 2. Grouping Content */}
      <div className="flex-1 min-h-0 px-1">
        {selectedGroup ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 h-full">
            {/* Sidebar Subgroups */}
            <div className="lg:col-span-3 space-y-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 px-1">Subgroup pulse</h4>
                <div className="space-y-2">
                  {Object.entries(tree[selectedGroup].subgroups).map(([sg, count]) => (
                    <button 
                      key={sg} 
                      onClick={() => { setSelectedSubgroup(sg === selectedSubgroup ? null : sg); setCurrentPage(1); }}
                      className={cn(
                        "w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all",
                        selectedSubgroup === sg ? "bg-primary border-primary text-black" : "bg-[#0A0A0A] border-white/5 hover:border-white/20"
                      )}
                    >
                      <span className="text-xs font-black uppercase tracking-tight">{sg}</span>
                      <Badge variant="outline" className={cn("h-6 border-none font-mono", selectedSubgroup === sg ? "bg-black/20 text-black" : "bg-white/5 text-white/40")}>{count}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Drill-down Results with Pagination */}
            <div className="lg:col-span-9 h-full flex flex-col">
              <ScrollArea className="flex-1 border-2 border-white/5 rounded-[2.5rem] bg-[#050505] p-8 shadow-3xl">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-40">
                    {paginatedDrillDown.map(asset => (
                      <RegistryCard 
                        key={asset.id} 
                        record={transformAssetToRecord(asset, headers, appSettings?.sourceBranding)} 
                        onInspect={handleInspect}
                        selected={selectedAssetIds.has(asset.id)}
                        onToggleSelect={handleToggleSelect}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="pb-40">
                    <RegistryTable 
                      records={paginatedDrillDown.map(a => transformAssetToRecord(a, headers, appSettings?.sourceBranding))} 
                      onInspect={handleInspect} 
                      selectedIds={selectedAssetIds} 
                      onToggleSelect={handleToggleSelect} 
                      onSelectAll={(c) => {
                        const next = new Set(selectedAssetIds);
                        paginatedDrillDown.forEach(a => c ? next.add(a.id) : next.delete(a.id));
                        setSelectedAssetIds(next);
                      }}
                    />
                  </div>
                )}
              </ScrollArea>

              {/* Internal Pagination Pulse */}
              {totalPages > 1 && (
                <div className="mt-6 self-center bg-black/80 border border-white/10 rounded-full px-6 py-2 flex items-center gap-6 backdrop-blur-xl">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 text-white/40 hover:text-primary disabled:opacity-5"><ChevronLeft className="h-5 w-5" /></button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Page {currentPage} of {totalPages}</span>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 text-white/40 hover:text-primary disabled:opacity-5"><ChevronRight className="h-5 w-5" /></button>
                </div>
              )}
            </div>
          </div>
        ) : groupMode === 'category' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {sortedGroups.map(group => (
              <Card 
                key={group.name} 
                onClick={() => { setSelectedGroup(group.name); setCurrentPage(1); }}
                className="bg-[#080808] border-2 border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-primary/40 transition-all cursor-pointer relative shadow-3xl"
              >
                <CardHeader className="p-8 pb-4 border-b border-white/5 bg-white/[0.01]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-2xl shadow-inner border border-primary/5"><Boxes className="h-6 w-6 text-primary" /></div>
                      <h3 className="text-xl font-black uppercase text-white tracking-tight leading-none">{group.name}</h3>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/20 group-hover:text-primary transition-all group-hover:translate-x-1" />
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-1">
                    <p className="text-5xl font-black tracking-tighter text-white">{group.count}</p>
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.25em]">Records indexing</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            <ConditionSummary counts={conditionCounts} total={filteredAssets.length} />
            <ScrollArea className="h-[calc(100vh-25rem)] pr-4">
              <Accordion type="multiple" defaultValue={['Good', 'Discrepancy']} className="space-y-6">
                {CONDITION_GROUPS.map(group => {
                  const groupAssets = conditionGroups[group];
                  if (groupAssets.length === 0 && group !== 'Good') return null;

                  return (
                    <AccordionItem 
                      key={group} 
                      value={group} 
                      className={cn("border-2 rounded-[2.5rem] overflow-hidden bg-[#080808] transition-all", GROUP_BG_COLORS[group])}
                    >
                      <AccordionTrigger className="p-8 hover:no-underline group">
                        <div className="flex items-center justify-between w-full pr-6">
                          <div className="flex items-center gap-6">
                            <div className={cn("p-4 rounded-2xl shadow-inner border border-white/5", GROUP_BG_COLORS[group])}>
                              <Boxes className={cn("h-8 w-8", GROUP_COLORS[group])} />
                            </div>
                            <div className="text-left">
                              <h3 className={cn("text-2xl font-black uppercase tracking-tight", GROUP_COLORS[group])}>{group} Container</h3>
                              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{groupAssets.length} Records</p>
                            </div>
                          </div>
                          <ChevronDown className="h-6 w-6 text-white/20 transition-transform group-data-[state=open]:rotate-180" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-8 pt-0 border-t border-white/5 bg-black/20">
                        <div className="pt-8 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 pb-10">
                          {/* Note: Condition sub-view also paginated internally if massive */}
                          {groupAssets.slice(0, 100).map(asset => (
                            <RegistryCard 
                              key={asset.id} 
                              record={transformAssetToRecord(asset, headers, appSettings?.sourceBranding)} 
                              onInspect={handleInspect}
                              selected={selectedAssetIds.has(asset.id)}
                              onToggleSelect={handleToggleSelect}
                            />
                          ))}
                          {groupAssets.length > 100 && (
                            <div className="col-span-full py-10 text-center opacity-40 italic text-xs">
                              Showing first 100 records. Use the Registry workstation for full browsing.
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Global Modals & Floating Action Bar */}
      <AssetDetailSheet 
        isOpen={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        record={selectedRecord} 
        onEdit={(id) => { setSelectedAssetId(id); setIsFormOpen(true); setIsDetailOpen(false); }} 
        onNext={handleNext}
        onPrevious={handlePrevious}
      />
      
      <AnimatePresence>
        {selectedAssetIds.size > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-[#0A0A0A] border-2 border-primary/20 rounded-[2.5rem] p-4 flex items-center gap-8 shadow-3xl backdrop-blur-3xl min-w-[500px]">
            <div className="flex items-center gap-4 pl-4">
              <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center text-black font-black text-xs shadow-xl">{selectedAssetIds.size}</div>
              <span className="text-xs font-black uppercase text-white tracking-widest">Selected Records</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setIsBatchEditOpen(true)} className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 text-white/60 hover:text-white transition-all"><Edit3 className="h-4 w-4" /> Bulk Audit</Button>
              <Button variant="ghost" onClick={() => {}} className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 text-destructive/60 hover:text-destructive transition-all"><Trash2 className="h-4 w-4" /> Delete</Button>
            </div>
            <button onClick={() => setSelectedAssetIds(new Set())} className="ml-auto mr-4 text-white/20 hover:text-white transition-all"><X className="h-5 w-5" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
