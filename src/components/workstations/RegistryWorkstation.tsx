'use client';

/**
 * @fileOverview RegistryWorkstation - Categories & Inventories Workstation.
 * Phase 140: Achieved 100% Screenshot Parity with Gold Selection Bar & Scope Telemetry.
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
  X,
  Package,
  ClipboardList,
  ChevronDown,
  CloudUpload,
  Layers,
  Database,
  Download
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
import { storage } from '@/offline/storage';

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
    missingFieldFilter,
    manualUpload
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AssetRecord | undefined>();

  const currentSourceAssets = dataSource === 'PRODUCTION' ? assets : sandboxAssets;

  const handleExcelExport = async () => {
    if (currentSourceAssets.length === 0) return;
    setIsExportingExcel(true);
    try {
      const targetAssets = selectedIds.size > 0 
        ? currentSourceAssets.filter(a => selectedIds.has(a.id)) 
        : currentSourceAssets;
      await ExcelService.exportRegistry(targetAssets, headers);
      toast({ title: "Excel Pulse Complete" });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleCopyToSandbox = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      const assetsToCopy = assets.filter(a => selectedIds.has(a.id));
      await storage.saveToSandbox([...sandboxAssets, ...assetsToCopy]);
      toast({ title: "Sandbox Cloned", description: `Replicated ${selectedIds.size} records to the sandbox tier.` });
      await refreshRegistry();
      setSelectedIds(new Set());
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWipeSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      const remaining = currentSourceAssets.filter(a => !selectedIds.has(a.id));
      if (dataSource === 'PRODUCTION') {
        await storage.saveAssets(remaining);
      } else {
        await storage.saveToSandbox(remaining);
      }
      toast({ title: "Selection Wiped", description: `Deterministic removal of ${selectedIds.size} records complete.` });
      await refreshRegistry();
      setSelectedIds(new Set());
    } finally {
      setIsProcessing(false);
    }
  };

  const categoryStats = useMemo(() => {
    const groups = currentSourceAssets.reduce((acc, a) => {
      const cat = a.category || 'General Register';
      if (!acc[cat]) acc[cat] = { total: 0, verified: 0 };
      acc[cat].total++;
      if (a.status === 'VERIFIED') acc[cat].verified++;
      return acc;
    }, {} as Record<string, { total: number, verified: number }>);
    
    return Object.entries(groups)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [currentSourceAssets]);

  const totalVerified = useMemo(() => assets.filter(a => a.status === 'VERIFIED').length, [assets]);
  const totalAssets = assets.length;
  const verificationPercent = totalAssets > 0 ? (totalVerified / totalAssets) * 100 : 0;

  const processedRecords = useMemo(() => {
    let results = currentSourceAssets.map(a => transformAssetToRecord(a, headers, appSettings?.sourceBranding));

    if (selectedCategory) results = results.filter(r => r.rawRow.category === selectedCategory);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(r => 
        String(r.rawRow.description || '').toLowerCase().includes(term) || 
        String(r.rawRow.serialNumber || '').toLowerCase().includes(term)
      );
    }

    results.sort((a, b) => {
      const fieldA = a.fields.find(f => f.headerId === sortKey)?.rawValue || '';
      const fieldB = b.fields.find(f => f.headerId === sortKey)?.rawValue || '';
      return sortDir === 'asc' ? String(fieldA).localeCompare(String(fieldB)) : String(fieldB).localeCompare(String(fieldA));
    });

    return results;
  }, [currentSourceAssets, searchTerm, selectedCategory, headers, sortKey, sortDir, appSettings?.sourceBranding]);

  const paginatedRecords = useMemo(() => processedRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [processedRecords, currentPage]);

  const handleSelectAll = () => {
    if (selectedCategory) {
      const allIds = new Set(processedRecords.map(r => r.id));
      setSelectedIds(selectedIds.size === allIds.size ? new Set() : allIds);
    } else {
      const allCats = new Set(categoryStats.map(c => c.name));
      setSelectedCategories(selectedCategories.size === allCats.size ? new Set() : allCats);
    }
  };

  const isAnySelected = selectedIds.size > 0 || selectedCategories.size > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* 1. Categories & Inventories Title & Scope Header */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-[#111] rounded-xl border border-white/5 shadow-inner">
            <LayoutGrid className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-black uppercase text-white tracking-tight">Categories & Inventories</h2>
        </div>

        <div className="flex items-center gap-8">
          {/* Overall Project Scope Selector - Screenshot Parity */}
          <div className="flex flex-col items-end gap-1">
            <button className="flex items-center gap-3 px-6 py-2 rounded-2xl bg-black border border-white/10 hover:border-primary/40 transition-all group min-w-[240px]">
              <div className="flex flex-col items-start flex-1 leading-none">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-black uppercase text-white">Overall Project Scope</span>
                  <span className="text-[9px] font-bold text-primary">{totalVerified}/{totalAssets}</span>
                </div>
                <div className="w-full h-[3px] bg-white/5 rounded-full mt-2 overflow-hidden relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${verificationPercent}%` }}
                    className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_8px_rgba(255,193,7,0.4)]" 
                  />
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-white/40 group-hover:text-primary transition-colors" />
            </button>
          </div>

          <button onClick={handleSelectAll} className="flex items-center gap-3 group px-4 py-2 hover:bg-white/5 rounded-xl transition-all">
            <span className="text-[11px] font-black uppercase tracking-widest text-white/40 group-hover:text-white">SELECT ALL</span>
            <div className={cn(
              "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
              isAnySelected ? "bg-primary border-primary text-black" : "border-white/10"
            )}>
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </button>
        </div>
      </div>

      {/* 2. Floating Gold Selection Bar - Screenshot Parity */}
      <AnimatePresence>
        {isAnySelected && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }}
            className="px-1"
          >
            <div className="bg-primary shadow-2xl shadow-primary/20 rounded-[3rem] h-16 flex items-center px-4 gap-6 overflow-hidden">
              <div className="h-10 px-6 rounded-[2rem] bg-white/20 flex items-center justify-center shadow-inner shrink-0">
                <span className="text-[11px] font-black uppercase text-black">
                  {selectedCategory ? selectedIds.size : selectedCategories.size} Selected
                </span>
              </div>
              <div className="w-px h-8 bg-black/10 shrink-0" />
              
              <ScrollArea className="flex-1">
                <div className="flex items-center gap-8 py-2 overflow-x-auto no-scrollbar pr-10">
                  <button onClick={manualUpload} className="flex items-center gap-2 text-black font-black uppercase text-[10px] tracking-widest shrink-0 hover:opacity-70 transition-opacity">
                    <CloudUpload className="h-4 w-4" /> Upload Selection
                  </button>
                  <button onClick={handleCopyToSandbox} className="flex items-center gap-2 text-black font-black uppercase text-[10px] tracking-widest shrink-0 hover:opacity-70 transition-opacity">
                    <Layers className="h-4 w-4" /> Copy to Sandbox
                  </button>
                  <button onClick={() => setIsBatchEditOpen(true)} className="flex items-center gap-2 text-black font-black uppercase text-[10px] tracking-widest shrink-0 hover:opacity-70 transition-opacity">
                    <Edit3 className="h-4 w-4" /> Batch Edit
                  </button>
                  <button onClick={handleExcelExport} className="flex items-center gap-2 text-black font-black uppercase text-[10px] tracking-widest shrink-0 hover:opacity-70 transition-opacity">
                    <FileSpreadsheet className="h-4 w-4" /> Export Excel
                  </button>
                  <button onClick={handleWipeSelected} className="flex items-center gap-2 text-black font-black uppercase text-[10px] tracking-widest shrink-0 hover:opacity-70 transition-opacity">
                    <Trash2 className="h-4 w-4" /> Wipe Selected
                  </button>
                </div>
                <ScrollBar orientation="horizontal" className="hidden" />
              </ScrollArea>

              <button 
                onClick={() => { setSelectedIds(new Set()); setSelectedCategories(new Set()); }}
                className="h-10 w-10 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5 text-black" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Adaptive Inventory Grid */}
      <AnimatePresence mode="wait">
        {!selectedCategory ? (
          <motion.div key="cat-grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {categoryStats.map(cat => (
              <Card key={cat.name} className="bg-[#050505] border-2 border-white/5 rounded-[2rem] hover:border-primary/40 transition-all group cursor-pointer shadow-xl overflow-hidden" onClick={() => setSelectedCategory(cat.name)}>
                <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                  <h3 className="text-white font-black uppercase text-xs leading-none truncate max-w-[80%] tracking-tight">{cat.name}</h3>
                  <div onClick={(e) => { e.stopPropagation(); toggleCategorySelection(cat.name); }} className={cn("h-5 w-5 rounded-full border-2 transition-all", selectedCategories.has(cat.name) ? "bg-primary border-primary text-black" : "border-white/10")}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-6">
                  <div className="flex items-end justify-between">
                    <div className="text-5xl font-black text-white tracking-tighter leading-none">{cat.total}</div>
                    <Badge variant="outline" className="h-6 border-primary/20 text-primary text-[8px] font-black tracking-widest">{cat.total > 0 ? Math.round((cat.verified/cat.total)*100) : 0}% VERIFIED</Badge>
                  </div>
                  <Button variant="ghost" className="w-full h-12 rounded-xl bg-white/5 border border-white/5 text-white/60 font-black text-[10px] uppercase group-hover:bg-primary group-hover:text-black group-hover:border-primary transition-all">View Category <ChevronRight className="ml-2 h-4 w-4" /></Button>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        ) : (
          <motion.div key="rec-grid" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <Button variant="ghost" onClick={() => setSelectedCategory(null)} className="h-12 px-6 rounded-xl border-2 border-white/5 text-white/60 font-black uppercase text-[10px] tracking-widest hover:text-white hover:bg-white/5 transition-all">
                <ArrowLeft className="mr-3 h-4 w-4" /> Back to Categories
              </Button>
              <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase h-8 px-4 rounded-full text-[9px] tracking-widest">
                CATEGORY: {selectedCategory}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {paginatedRecords.map(record => (
                <RegistryCard 
                  key={record.id} 
                  record={record} 
                  onInspect={() => { setSelectedRecord(record); setIsDetailOpen(true); }} 
                  selected={selectedIds.has(record.id)} 
                  onToggleSelect={(id) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); }} 
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AssetDetailSheet isOpen={isDetailOpen} onOpenChange={setIsDetailOpen} record={selectedRecord} onEdit={() => setIsFormOpen(true)} />
      <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={selectedRecord?.rawRow as Asset} onSave={async (a) => { await refreshRegistry(); setIsFormOpen(false); }} onQuickSave={async () => {}} isReadOnly={false} />
      <AssetBatchEditForm isOpen={isBatchEditOpen} onOpenChange={setIsBatchEditOpen} selectedAssetCount={selectedIds.size} onSave={async (d) => { await refreshRegistry(); setSelectedIds(new Set()); }} />
    </div>
  );

  function toggleCategorySelection(name: string) {
    const next = new Set(selectedCategories);
    if (next.has(name)) next.delete(name); else next.add(name);
    setSelectedCategories(next);
  }
}
