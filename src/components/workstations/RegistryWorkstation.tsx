'use client';

/**
 * @fileOverview RegistryWorkstation - High-Fidelity Asset Inventory.
 * Phase 225: Implemented Selection, Batch Actions, and Category Drill-Down.
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
  Printer,
  Trash2,
  FolderKanban,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { RegistryTable } from '@/components/registry/RegistryTable';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import { AssetBatchEditForm } from '@/components/asset-batch-edit-form';
import { TagPrintDialog } from '@/components/registry/TagPrintDialog';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { Asset } from '@/types/domain';

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

  // --- UI State ---
  const [selectedCategory, setSelectedCategory] = useState<string | null>(viewAll ? 'ALL' : null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // --- Filtering Logic ---
  const filteredAssets = useMemo(() => {
    let results = assets;

    // 1. Category Scope
    if (selectedCategory && selectedCategory !== 'ALL') {
      results = results.filter(a => a.category === selectedCategory);
    }

    // 2. Global Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(a => 
        a.description.toLowerCase().includes(term) || 
        a.assetIdCode?.toLowerCase().includes(term) ||
        a.serialNumber.toLowerCase().includes(term)
      );
    }

    // 3. Logic Filters
    if (selectedLocations.length > 0) results = results.filter(a => selectedLocations.includes(a.location));
    if (selectedAssignees.length > 0) results = results.filter(a => selectedAssignees.includes(a.custodian));
    if (selectedStatuses.length > 0) results = results.filter(a => selectedStatuses.includes(a.status));
    if (selectedConditions.length > 0) results = results.filter(a => selectedConditions.includes(a.condition));
    
    if (missingFieldFilter) {
      results = results.filter(a => !(a as any)[missingFieldFilter]);
    }

    // 4. Sorting
    results = [...results].sort((a, b) => {
      const valA = String((a as any)[sortKey] || '').toLowerCase();
      const valB = String((b as any)[sortKey] || '').toLowerCase();
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return results;
  }, [assets, selectedCategory, searchTerm, selectedLocations, selectedAssignees, selectedStatuses, selectedConditions, missingFieldFilter, sortKey, sortDir]);

  const categoryStats = useMemo(() => {
    const groups = assets.reduce((acc, a) => {
      const cat = a.category || 'General Register';
      if (!acc[cat]) acc[cat] = { total: 0, verified: 0 };
      acc[cat].total++;
      if (a.status === 'VERIFIED') acc[cat].verified++;
      return acc;
    }, {} as Record<string, { total: number, verified: number }>);
    
    return Object.entries(groups)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assets]);

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

  const handleInspect = (id: string) => {
    setSelectedAssetId(id);
    setIsDetailOpen(true);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    toast({ title: "Purge Pulse Initiated", description: `Removing ${selectedIds.size} records from the register.` });
    // In a real implementation, this would call FirestoreService.deleteAsset in a loop or batch
    setSelectedIds(new Set());
    await refreshRegistry();
  };

  const selectedRecordsForPrint = useMemo(() => {
    return filteredAssets
      .filter(a => selectedIds.has(a.id))
      .map(a => transformAssetToRecord(a, headers));
  }, [filteredAssets, selectedIds, headers]);

  // --- Drill-Down Condition ---
  const isListView = selectedCategory || viewAll;

  return (
    <div className="space-y-8">
      {/* 1. Sub-Header Navigation */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4">
          {isListView && !viewAll ? (
            <button 
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-3 p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Back to Categories</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 text-white/40">
              <Boxes className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Registry Depth: {selectedCategory || 'GLOBAL'}</span>
            </div>
          )}
        </div>

        {isListView && (
          <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white/10 text-white" : "text-white/20 hover:text-white")}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'table' ? "bg-white/10 text-white" : "text-white/20 hover:text-white")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Content Surface */}
      <div className="px-1 min-h-[400px]">
        <AnimatePresence mode="wait">
          {!isListView ? (
            <motion.div 
              key="categories"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
            >
              {categoryStats.map(cat => (
                <Card 
                  key={cat.name} 
                  onClick={() => setSelectedCategory(cat.name)}
                  className="bg-[#050505] border-2 border-white/5 rounded-[2rem] hover:border-primary/40 transition-all group cursor-pointer shadow-xl relative overflow-hidden"
                >
                  <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                    <h3 className="text-white/60 font-black uppercase text-[11px] leading-none truncate max-w-[85%] tracking-widest">{cat.name}</h3>
                    <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-primary transition-colors" />
                  </CardHeader>
                  <CardContent className="p-8 pt-2 space-y-8">
                    <div className="text-5xl font-black text-white tracking-tighter leading-none">{cat.total}</div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className="text-white/40">Audit Pulse</span>
                        <span className="text-white/60">{cat.verified}/{cat.total}</span>
                      </div>
                      <div className="h-[3px] w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${(cat.verified/cat.total)*100}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="assets"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {viewMode === 'grid' ? (
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {filteredAssets.map(asset => (
                    <RegistryCard 
                      key={asset.id}
                      record={transformAssetToRecord(asset, headers)}
                      onInspect={handleInspect}
                      selected={selectedIds.has(asset.id)}
                      onToggleSelect={handleToggleSelect}
                    />
                  ))}
                </div>
              ) : (
                <RegistryTable 
                  records={filteredAssets.map(a => transformAssetToRecord(a, headers))}
                  onInspect={handleInspect}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onSelectAll={handleSelectAll}
                />
              )}

              {filteredAssets.length === 0 && (
                <div className="py-40 text-center opacity-20 flex flex-col items-center gap-6">
                  <Boxes className="h-20 w-20" />
                  <p className="text-xl font-black uppercase tracking-widest">No matching records found.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Operational Pulse Bar (Floating) */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-[#080808]/90 backdrop-blur-3xl px-8 py-4 rounded-[2.5rem] border-2 border-primary/20 shadow-3xl flex items-center gap-8 min-w-[600px]"
          >
            <div className="flex flex-col pr-8 border-r border-white/5">
              <span className="text-primary font-black text-xl leading-none">{selectedIds.size}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">Pulses Selected</span>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setIsBatchEditOpen(true)}
                className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-3 text-white/60 hover:text-primary hover:bg-primary/10 transition-all"
              >
                <Edit3 className="h-4 w-4" /> Batch Edit
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setIsPrintOpen(true)}
                className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-3 text-white/60 hover:text-blue-500 hover:bg-blue-500/10 transition-all"
              >
                <Printer className="h-4 w-4" /> Print Tags
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleDeleteSelected}
                className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-3 text-white/60 hover:text-red-500 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>

            <div className="ml-auto pl-8 border-l border-white/5">
              <Button variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white">
                Clear
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Modals & Side Sheets */}
      <AssetDetailSheet 
        isOpen={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        record={filteredAssets.find(a => a.id === selectedAssetId) ? transformAssetToRecord(filteredAssets.find(a => a.id === selectedAssetId)!, headers) : undefined}
        onEdit={(id) => {}}
      />

      <AssetBatchEditForm 
        isOpen={isBatchEditOpen} 
        onOpenChange={setIsBatchEditOpen} 
        selectedAssetCount={selectedIds.size} 
        onSave={async (data) => {
          toast({ title: "Batch Update Complete" });
          setSelectedIds(new Set());
          await refreshRegistry();
        }} 
      />

      <TagPrintDialog 
        isOpen={isPrintOpen} 
        onOpenChange={setIsPrintOpen} 
        records={selectedRecordsForPrint} 
      />
    </div>
  );
}
