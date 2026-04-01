'use client';

/**
 * @fileOverview RegistryWorkstation - Overhauled to match requested High-Fidelity Design.
 * Phase 127: Removed hardcoded bg-black for perfect contrast.
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Boxes, 
  Loader2, 
  ChevronRight,
  Zap,
  Edit3,
  Trash2,
  ArrowLeft,
  LayoutGrid,
  CheckCircle2,
  ArrowRightLeft,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import AssetForm from '@/components/asset-form';
import { AssetBatchEditForm } from '@/components/asset-batch-edit-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ExcelService } from '@/services/excel-service';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { cn } from '@/lib/utils';
import type { AssetRecord } from '@/types/registry';
import type { Asset } from '@/types/domain';
import { Separator } from '@/components/ui/separator';

const ITEMS_PER_PAGE = 24;

export function RegistryWorkstation() {
  const { 
    assets, 
    sandboxAssets, 
    dataSource, 
    refreshRegistry, 
    appSettings,
    searchTerm,
    headers,
    sortKey,
    sortDir,
    selectedLocations,
    selectedAssignees,
    selectedStatuses,
    selectedConditions,
    missingFieldFilter
  } = useAppState();
  
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  // Interaction State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AssetRecord | undefined>();

  const handleExcelExport = async () => {
    const sourceAssets = dataSource === 'PRODUCTION' ? assets : sandboxAssets;
    if (sourceAssets.length === 0) {
      toast({ variant: "destructive", title: "Export Failed" });
      return;
    }

    setIsExportingExcel(true);
    try {
      const targetAssets = selectedIds.size > 0 
        ? sourceAssets.filter(a => selectedIds.has(a.id)) 
        : sourceAssets;
      
      await ExcelService.exportRegistry(targetAssets, headers);
      toast({ title: "Excel Pulse Complete" });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const categoryStats = useMemo(() => {
    const source = dataSource === 'PRODUCTION' ? assets : sandboxAssets;
    const groups = source.reduce((acc, a) => {
      const cat = a.category || 'General Registry';
      if (!acc[cat]) acc[cat] = { total: 0, verified: 0 };
      acc[cat].total++;
      if (a.status === 'VERIFIED') acc[cat].verified++;
      return acc;
    }, {} as Record<string, { total: number, verified: number }>);
    
    return Object.entries(groups)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assets, sandboxAssets, dataSource]);

  const processedRecords = useMemo(() => {
    let results = (dataSource === 'PRODUCTION' ? assets : sandboxAssets)
      .map(a => transformAssetToRecord(a, headers, appSettings?.sourceBranding));

    if (selectedCategory) {
      results = results.filter(r => r.rawRow.category === selectedCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(r => 
        String(r.rawRow.description || '').toLowerCase().includes(term) || 
        String(r.rawRow.serialNumber || '').toLowerCase().includes(term) ||
        String(r.rawRow.assetIdCode || '').toLowerCase().includes(term)
      );
    }

    if (selectedLocations.length > 0) results = results.filter(r => selectedLocations.includes(String(r.rawRow.location)));
    if (selectedAssignees.length > 0) results = results.filter(r => selectedAssignees.includes(String(r.rawRow.custodian)));
    if (selectedStatuses.length > 0) results = results.filter(r => selectedStatuses.includes(String(r.rawRow.status)));
    if (selectedConditions.length > 0) results = results.filter(r => selectedConditions.includes(String(r.rawRow.condition)));
    
    if (missingFieldFilter) {
      results = results.filter(r => !(r.rawRow as any)[missingFieldFilter]);
    }

    results.sort((a, b) => {
      const fieldA = a.fields.find(f => f.headerId === sortKey)?.rawValue || '';
      const fieldB = b.fields.find(f => f.headerId === sortKey)?.rawValue || '';
      const comparison = String(fieldA).localeCompare(String(fieldB), undefined, { numeric: true });
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return results;
  }, [
    assets, sandboxAssets, dataSource, searchTerm, selectedCategory, headers, 
    selectedLocations, selectedAssignees, selectedStatuses, selectedConditions, missingFieldFilter,
    sortKey, sortDir, appSettings?.sourceBranding
  ]);

  const paginatedRecords = useMemo(() => {
    return processedRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [processedRecords, currentPage]);

  const toggleCategorySelection = (name: string) => {
    const next = new Set(selectedCategories);
    if (next.has(name)) next.delete(name); else next.add(name);
    setSelectedCategories(next);
  };

  const handleSelectAll = () => {
    if (selectedCategory) {
      const allIds = new Set(processedRecords.map(r => r.id));
      if (selectedIds.size === allIds.size) setSelectedIds(new Set()); else setSelectedIds(allIds);
    } else {
      const allCats = new Set(categoryStats.map(c => c.name));
      if (selectedCategories.size === allCats.size) setSelectedCategories(new Set()); else setSelectedCategories(allCats);
    }
  };

  const isAnySelected = selectedIds.size > 0 || selectedCategories.size > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      
      {/* Registry Title Context */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2 px-1">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl"><LayoutGrid className="h-6 w-6 text-primary" /></div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-foreground tracking-tighter truncate max-w-[200px] sm:max-w-none">{selectedCategory || 'Registry Pulse'}</h2>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
          <Badge variant="outline" className="h-8 px-4 font-black uppercase text-[10px] border-border text-muted-foreground">{processedRecords.length} RECORDS IN VIEW</Badge>
          <button onClick={handleSelectAll} className="flex items-center gap-3 group px-4 py-2 hover:bg-muted/50 rounded-xl transition-all">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-foreground">SELECT ALL</span>
            <div className={cn("h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all", isAnySelected ? "bg-primary border-primary text-primary-foreground" : "border-border")}><CheckCircle2 className="h-4 w-4" /></div>
          </button>
        </div>
      </div>

      {/* Adaptive Grid Surface */}
      <AnimatePresence mode="wait">
        {!selectedCategory ? (
          <motion.div key="category-grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {categoryStats.map(cat => (
              <Card key={cat.name} className="bg-card border-2 border-border/40 rounded-[2rem] hover:border-primary/40 transition-all group cursor-pointer shadow-xl" onClick={() => setSelectedCategory(cat.name)}>
                <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                  <h3 className="text-foreground font-black uppercase text-sm leading-none truncate max-w-[80%]">{cat.name}</h3>
                  <div onClick={(e) => { e.stopPropagation(); toggleCategorySelection(cat.name); }} className={cn("h-5 w-5 rounded-full border-2 transition-all", selectedCategories.has(cat.name) ? "bg-primary border-primary text-primary-foreground" : "border-border")}><CheckCircle2 className="h-3.5 w-3.5" /></div>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-6">
                  <div className="flex items-end justify-between">
                    <div className="text-5xl font-black text-foreground tracking-tighter leading-none">{cat.total}</div>
                    <Badge variant="outline" className="h-6 border-primary/20 text-primary text-[8px] font-black">{cat.total > 0 ? Math.round((cat.verified/cat.total)*100) : 0}% VERIFIED</Badge>
                  </div>
                  <Button variant="outline" className="w-full h-12 rounded-xl bg-transparent border-border text-foreground font-black text-[10px] uppercase group-hover:bg-primary group-hover:text-primary-foreground">View Category <ChevronRight className="ml-2 h-4 w-4" /></Button>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        ) : (
          <motion.div key="record-grid" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <Button variant="ghost" onClick={() => setSelectedCategory(null)} className="h-12 px-6 rounded-xl border-2 border-border/40 text-foreground font-black uppercase text-[10px] tracking-widest"><ArrowLeft className="mr-3 h-4 w-4" /> Back to pulse</Button>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {paginatedRecords.map(record => (
                <RegistryCard key={record.id} record={record} onInspect={() => { setSelectedRecord(record); setIsDetailOpen(true); }} selected={selectedIds.has(record.id)} onToggleSelect={(id) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); }} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gold Action Bar */}
      <AnimatePresence>
        {isAnySelected && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-50 w-[95vw] lg:w-auto">
            <div className="bg-primary shadow-3xl shadow-primary/30 rounded-[2rem] h-16 sm:h-20 flex items-center px-6 sm:px-10 gap-6 sm:gap-10 overflow-hidden">
              <span className="text-xs sm:text-sm font-black uppercase text-primary-foreground shrink-0">{selectedCategory ? selectedIds.size : selectedCategories.size} Pulses</span>
              <Separator orientation="vertical" className="h-8 bg-black/10 hidden md:block" />
              <div className="flex-1 overflow-x-auto custom-scrollbar flex items-center gap-6 sm:gap-10 py-2">
                <button className="flex items-center gap-2 text-primary-foreground font-black uppercase text-[10px] tracking-widest shrink-0"><ArrowRightLeft className="h-4 w-4" /> Merge</button>
                <button onClick={() => setIsBatchEditOpen(true)} className="flex items-center gap-2 text-primary-foreground font-black uppercase text-[10px] tracking-widest shrink-0"><Edit3 className="h-4 w-4" /> Edit</button>
                <button onClick={handleExcelExport} className="flex items-center gap-2 text-primary-foreground font-black uppercase text-[10px] tracking-widest shrink-0"><FileSpreadsheet className="h-4 w-4" /> Excel</button>
                <button className="flex items-center gap-2 text-primary-foreground font-black uppercase text-[10px] tracking-widest shrink-0"><Trash2 className="h-4 w-4" /> Wipe</button>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setSelectedIds(new Set()); setSelectedCategories(new Set()); }} className="h-10 w-10 text-primary-foreground shrink-0"><X className="h-5 w-5" /></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AssetDetailSheet isOpen={isDetailOpen} onOpenChange={setIsDetailOpen} record={selectedRecord} onEdit={() => setIsFormOpen(true)} />
      <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={selectedRecord?.rawRow as Asset} onSave={async (a) => { await refreshRegistry(); setIsFormOpen(false); }} onQuickSave={async () => {}} isReadOnly={false} />
      <AssetBatchEditForm isOpen={isBatchEditOpen} onOpenChange={setIsBatchEditOpen} selectedAssetCount={selectedIds.size} onSave={async (d) => { await refreshRegistry(); setSelectedIds(new Set()); }} />
    </div>
  );
}
