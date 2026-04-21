'use client';

/**
 * @fileOverview AssetGroupsWorkstation - Folder-Based Registry Hub.
 * Optimized for High-Density Grid Pulse.
 * Phase 1107: Removed redundant group re-calculation to fix rendering error.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { 
  Boxes, 
  ChevronRight, 
  ArrowLeft,
  Activity,
  History,
  Tag,
  Zap,
  CheckCircle2,
  ShieldAlert,
  ArrowUpRight,
  Layers,
  ArrowRightLeft,
  ShieldCheck,
  ChevronDown,
  Bomb,
  Grid,
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
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import AssetForm from '@/components/asset-form';
import { AssetBatchEditForm } from '@/components/asset-batch-edit-form';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { storage } from '@/offline/storage';
import { enqueueMutation } from '@/offline/queue';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { SelectItem } from '@/components/ui/select';

const ITEMS_PER_PAGE = 24;

export function AssetGroupsWorkstation({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { assets, searchTerm, headers, refreshRegistry, appSettings, groupsViewMode, setGroupsViewMode } = useAppState();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // UI State - initialized from context view mode preference
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Selection & Form State
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);

  // Data Calculations
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
  
  // Use the memoized result to avoid passing complex object calculations directly to JSX
  const conditionGroups = useMemo(() => groupAssetsByCondition(filteredAssets), [filteredAssets]);
  
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

  const handleInspect = (id: string) => {
    setSelectedAssetId(id);
    setIsDetailOpen(true);
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedAssetIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedAssetIds(next);
  };

  const selectedRecord = useMemo(() => {
    if (!selectedAssetId) return undefined;
    const asset = assets.find(a => a.id === selectedAssetId);
    return asset ? transformAssetToRecord(asset, headers, appSettings?.sourceBranding) : undefined;
  }, [selectedAssetId, assets, headers, appSettings?.sourceBranding]);

  return (
    <div className={cn("space-y-6 md:space-y-10 animate-in fade-in duration-700", !isEmbedded && "pb-40 h-full flex flex-col relative")}>
      
      {/* 1. Header & Navigation (Hidden if Embedded) */}
      {!isEmbedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 shrink-0">
          <div className="flex items-center gap-3 self-start">
            {selectedGroup ? (
              <button 
                onClick={() => { setSelectedGroup(null); setSelectedSubgroup(null); setCurrentPage(1); }}
                className="h-10 w-10 flex items-center justify-center bg-muted/50 rounded-xl text-muted-foreground hover:text-foreground border border-border transition-all shadow-xl"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <div className="p-2 bg-primary/10 rounded-xl shadow-inner border border-primary/5">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="space-y-0.5">
              <h2 className="text-xl font-black uppercase text-foreground tracking-tight leading-none">
                {selectedGroup ? (selectedSubgroup || selectedGroup) : groupsViewMode === 'condition' ? 'Asset Conditions' : 'Browse Folders'}
              </h2>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                {selectedGroup ? 'NAVIGATING CONTAINER' : 'STRUCTURAL HUB'}
              </p>
            </div>
          </div>

          {!selectedGroup && (
            <div className="bg-muted/30 p-1 rounded-xl border border-border shadow-inner backdrop-blur-xl flex">
              <button 
                onClick={() => setGroupsViewMode('category')}
                className={cn("px-5 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest transition-all", groupsViewMode === 'category' ? "bg-primary text-black shadow-lg" : "text-muted-foreground hover:text-foreground")}
              >
                Folders
              </button>
              <button 
                onClick={() => setGroupsViewMode('condition')}
                className={cn("px-5 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest transition-all", groupsViewMode === 'condition' ? "bg-primary text-black shadow-lg" : "text-muted-foreground hover:text-foreground")}
              >
                Conditions
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Content Surface */}
      <div className={cn("min-h-0 px-1", !isEmbedded && "flex-1")}>
        {selectedGroup ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            {/* Sidebar Subgroups */}
            <div className="lg:col-span-3 space-y-4">
              <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Sub-Containers</h4>
              <div className="space-y-1.5">
                {Object.entries(tree[selectedGroup].subgroups).map(([sg, count]) => (
                  <button 
                    key={sg} 
                    onClick={() => { setSelectedSubgroup(sg === selectedSubgroup ? null : sg); setCurrentPage(1); }}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                      selectedSubgroup === sg ? "bg-primary border-primary text-black shadow-xl" : "bg-card border-border hover:border-primary/20"
                    )}
                  >
                    <span className="text-[10px] font-black uppercase tracking-tight truncate pr-2">{sg}</span>
                    <Badge variant="outline" className={cn("h-5 border-none font-mono text-[8px]", selectedSubgroup === sg ? "bg-black/20 text-black" : "bg-muted text-muted-foreground")}>{count}</Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Optimized Grid Drill-down */}
            <div className="lg:col-span-9 h-full flex flex-col">
              <ScrollArea className={cn("flex-1 border-2 border-border/40 rounded-[2rem] bg-card/30 p-4 md:p-6 shadow-3xl", isEmbedded ? "h-[500px]" : "")}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-40">
                  <AnimatePresence mode="popLayout">
                    {paginatedDrillDown.map(asset => (
                      <RegistryCard 
                        key={asset.id} 
                        record={transformAssetToRecord(asset, headers, appSettings?.sourceBranding)} 
                        onInspect={handleInspect}
                        selected={selectedAssetIds.has(asset.id)}
                        onToggleSelect={handleToggleSelect}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>

              {totalPages > 1 && (
                <div className="mt-4 self-center bg-background/80 border border-border rounded-full px-4 py-1.5 flex items-center gap-4 backdrop-blur-xl">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1 text-muted-foreground hover:text-primary disabled:opacity-5 transition-all"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Page {currentPage} of {totalPages}</span>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1 text-muted-foreground hover:text-primary disabled:opacity-5 transition-all"><ChevronRight className="h-4 w-4" /></button>
                </div>
              )}
            </div>
          </div>
        ) : groupsViewMode === 'category' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Object.entries(tree).map(([name, data]) => (
              <Card 
                key={name} 
                onClick={() => { setSelectedGroup(name); setCurrentPage(1); }}
                className="bg-card border-2 border-border/40 rounded-2xl overflow-hidden group hover:border-primary/40 transition-all cursor-pointer relative shadow-3xl"
              >
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl"><Boxes className="h-5 w-5 text-primary" /></div>
                    <h3 className="text-sm font-black uppercase text-foreground tracking-tight truncate max-w-[120px]">{name}</h3>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="px-5 pb-5">
                  <p className="text-3xl font-black tracking-tighter text-foreground">{data.count}</p>
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Indexed Records</p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <ConditionSummary counts={conditionGroups} total={filteredAssets.length} />
            <ScrollArea className={cn("pr-4", isEmbedded ? "h-[500px]" : "h-[calc(100vh-20rem)]")}>
              <Accordion type="multiple" className="space-y-4">
                {CONDITION_GROUPS.map(group => {
                  const groupAssets = conditionGroups[group];
                  if (groupAssets.length === 0 && group !== 'Good') return null;

                  return (
                    <AccordionItem key={group} value={group} className={cn("border-2 rounded-[2rem] overflow-hidden bg-card/30 transition-all", GROUP_BG_COLORS[group])}>
                      <AccordionTrigger className="px-6 py-4 hover:no-underline">
                        <div className="flex items-center gap-4">
                          <div className={cn("p-2 rounded-lg", GROUP_BG_COLORS[group])}><Boxes className={cn("h-5 w-5", GROUP_COLORS[group])} /></div>
                          <span className={cn("text-lg font-black uppercase", GROUP_COLORS[group])}>{group} Pulse</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6 pt-2">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                          {groupAssets.slice(0, 60).map(asset => (
                            <RegistryCard key={asset.id} record={transformAssetToRecord(asset, headers)} onInspect={handleInspect} selected={selectedAssetIds.has(asset.id)} onToggleSelect={handleToggleSelect} />
                          ))}
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

      {/* Detail Overlay */}
      <AssetDetailSheet isOpen={isDetailOpen} onOpenChange={setIsDetailOpen} record={selectedRecord} onEdit={() => {}} />
      
      {selectedAssetIds.size > 0 && !isEmbedded && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/95 border-2 border-primary/20 rounded-2xl p-2.5 flex items-center gap-6 shadow-3xl backdrop-blur-3xl">
          <div className="flex items-center gap-3 pl-3">
            <div className="h-7 w-7 bg-primary rounded-full flex items-center justify-center text-black font-black text-[9px]">{selectedAssetIds.size}</div>
            <span className="text-[9px] font-black uppercase text-foreground tracking-widest">Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setIsBatchEditOpen(true)} className="h-9 px-4 rounded-lg font-black uppercase text-[9px] gap-2 text-muted-foreground hover:text-foreground"><Edit3 className="h-3.5 w-3.5" /> Edit</Button>
            <button onClick={() => setSelectedAssetIds(new Set())} className="p-1.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
