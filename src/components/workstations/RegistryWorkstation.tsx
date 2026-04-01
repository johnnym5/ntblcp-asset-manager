'use client';

/**
 * @fileOverview RegistryWorkstation - Overhauled to match requested Category Grid design.
 * Phase 96: High-fidelity category cards with deterministic drill-down pulse.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Plus, 
  Boxes, 
  Loader2, 
  Database,
  DatabaseZap,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Zap,
  Edit3,
  Trash2,
  Settings2,
  Palette,
  Globe,
  CloudOff,
  FolderKanban,
  ArrowRightLeft,
  Printer,
  FileJson,
  FileSpreadsheet,
  LayoutGrid,
  MoreHorizontal,
  ArrowLeft
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { RegistryTable } from '@/components/registry/RegistryTable';
import { HeaderManagerDrawer } from '@/components/registry/HeaderManagerDrawer';
import { FilterDrawer } from '@/components/registry/FilterDrawer';
import { SortDrawer } from '@/components/registry/SortDrawer';
import { SourceBrandingDrawer } from '@/components/registry/SourceBrandingDrawer';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import AssetForm from '@/components/asset-form';
import { AssetBatchEditForm } from '@/components/asset-batch-edit-form';
import { TagPrintDialog } from '@/components/registry/TagPrintDialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ExcelService } from '@/services/excel-service';
import { storage } from '@/offline/storage';
import { enqueueMutation } from '@/offline/queue';
import { DEFAULT_REGISTRY_HEADERS, transformAssetToRecord } from '@/lib/registry-utils';
import type { RegistryHeader, AssetRecord, HeaderFilter } from '@/types/registry';
import type { Asset } from '@/types/domain';

const ITEMS_PER_PAGE = 24;

export function RegistryWorkstation() {
  const { 
    assets, 
    sandboxAssets, 
    dataSource, 
    setDataSource, 
    refreshRegistry, 
    appSettings,
    isOnline,
    searchTerm,
    setSearchTerm
  } = useAppState();
  
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [headers, setHeaders] = useState<RegistryHeader[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Logic State
  const [filters, setFilters] = useState<HeaderFilter[]>([]);
  const [sortKey, setSortKey] = useState<string>('sn');
  const [sortDir, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRecord, setSelectedRecord] = useState<AssetRecord | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isHeaderManagerOpen, setIsHeaderManagerOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  useEffect(() => {
    const savedHeaders = localStorage.getItem('registry-header-prefs');
    if (savedHeaders) {
      setHeaders(JSON.parse(savedHeaders));
    } else {
      const initial = DEFAULT_REGISTRY_HEADERS.map((h, i) => ({ ...h, id: `h-${i}`, orderIndex: i }));
      setHeaders(initial as RegistryHeader[]);
    }
  }, []);

  const saveHeaderPrefs = (updated: RegistryHeader[]) => {
    setHeaders(updated);
    localStorage.setItem('registry-header-prefs', JSON.stringify(updated));
  };

  const handleExcelExport = async () => {
    setIsExportingExcel(true);
    try {
      await ExcelService.exportRegistry(assets, headers);
      toast({ title: "Excel Pulse Complete" });
    } catch (e: any) {
      toast({ 
        variant: "destructive", 
        title: "Export Failed", 
        description: e.message || "Workbook creation interrupted." 
      });
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

    filters.forEach(f => {
      results = results.filter(r => {
        const field = r.fields.find(field => field.headerId === f.headerId);
        const val = String(field?.rawValue || '').toLowerCase();
        const filterVal = String(f.value || '').toLowerCase();
        switch(f.operator) {
          case 'equals': return val === filterVal;
          case 'contains': return val.includes(filterVal);
          case 'exists': return val !== '' && val !== '---';
          default: return true;
        }
      });
    });

    results.sort((a, b) => {
      const fieldA = a.fields.find(f => f.headerId === sortKey)?.rawValue || '';
      const fieldB = b.fields.find(f => f.headerId === sortKey)?.rawValue || '';
      const comparison = String(fieldA).localeCompare(String(fieldB), undefined, { numeric: true });
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return results;
  }, [assets, sandboxAssets, dataSource, searchTerm, selectedCategory, headers, filters, sortKey, sortDir, appSettings?.sourceBranding]);

  const paginatedRecords = useMemo(() => {
    return processedRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [processedRecords, currentPage]);

  const totalPages = Math.ceil(processedRecords.length / ITEMS_PER_PAGE);

  const handleInspect = (id: string) => {
    const record = processedRecords.find(r => r.id === id);
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  if (!selectedCategory) {
    return (
      <div className="space-y-10 animate-in fade-in duration-700 pb-32">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
          <div className="space-y-1">
            <h2 className="text-4xl font-black tracking-tighter text-white uppercase flex items-center gap-4 leading-none">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Boxes className="h-8 w-8 text-primary" />
              </div>
              Asset Registry
            </h2>
            <p className="font-bold uppercase text-[10px] tracking-[0.3em] text-muted-foreground opacity-70">
              Select an Asset Class to view individual record pulses
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleExcelExport} disabled={isExportingExcel} className="h-12 px-6 rounded-xl font-black text-[9px] uppercase tracking-widest border-white/10 hover:bg-white/5 text-white gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Export All
            </Button>
            <Button onClick={() => setIsFormOpen(true)} className="h-12 px-8 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> New Registration
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 px-1">
          {categoryStats.map((cat) => (
            <Card key={cat.name} className="bg-black border-2 border-primary/10 rounded-[2rem] overflow-hidden hover:border-primary/40 transition-all group shadow-2xl relative">
              <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                <h3 className="text-white font-black uppercase text-sm tracking-tight truncate max-w-[80%] leading-tight">{cat.name}</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-white rounded-xl transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-8">
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <div className="text-5xl font-black text-white tracking-tighter leading-none">{cat.total}</div>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">ASSET RECORDS</p>
                  </div>
                  <LayoutGrid className="h-10 w-10 text-primary opacity-10 group-hover:opacity-40 transition-all" />
                </div>

                <div className="space-y-4 pt-4 border-t border-dashed border-white/10">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                    <span>VERIFICATION</span>
                    <span className="text-primary font-mono">{cat.verified}/{cat.total}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${(cat.verified / cat.total) * 100}%` }} />
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => setSelectedCategory(cat.name)}
                  className="w-full h-14 rounded-2xl bg-transparent border-primary/20 text-white font-black uppercase text-[10px] tracking-[0.2em] group-hover:bg-primary group-hover:text-black group-hover:border-primary transition-all shadow-inner"
                >
                  View Records <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          
          {categoryStats.length === 0 && (
            <div className="col-span-full h-[400px] flex flex-col items-center justify-center opacity-20 border-4 border-dashed rounded-[4rem] space-y-6">
              <Boxes className="h-24 w-24 mb-2" />
              <h3 className="text-2xl font-black uppercase tracking-[0.2em]">Registry Silent</h3>
              <p className="text-sm font-medium italic">Import a workbook to initialize the class grid.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-6 pb-32">
      <motion.div layout className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between px-1">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { setSelectedCategory(null); setSearchTerm(""); }} 
            className="h-14 w-14 rounded-[1.5rem] bg-black border-2 border-white/5 hover:border-primary/20 hover:text-primary transition-all shadow-xl"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-3xl lg:text-4xl font-black tracking-tighter text-white uppercase leading-tight">
              {selectedCategory}
            </h2>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="h-6 px-3 text-[9px] font-black tracking-widest rounded-full border-2 border-primary/20 bg-primary/5 text-primary uppercase">
                {processedRecords.length} RECORDS IN PULSE
              </Badge>
              {isOnline ? <Globe className="h-3 w-3 text-green-600 animate-pulse" /> : <CloudOff className="h-3 w-3 text-orange-600" />}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExcelExport} disabled={isExportingExcel} className="h-10 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest border-white/10 hover:bg-white/5 text-white gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" /> Excel Export
          </Button>
          <Button variant="outline" size="icon" onClick={() => setIsHeaderManagerOpen(true)} className="h-10 w-10 rounded-xl border-2 border-primary/10 bg-card shadow-sm"><Settings2 className="h-4 w-4 text-primary" /></Button>
        </div>
      </motion.div>

      <div className="flex flex-col gap-4 px-1">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-all" />
            <Input 
              placeholder={`Scan ${selectedCategory} pulse...`} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 rounded-2xl bg-card border-none shadow-xl focus-visible:ring-primary/20 text-sm font-medium"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsFilterOpen(true)} className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-lg">
              <Filter className="h-4 w-4" /> Logic Filters
            </Button>
            <Button variant="outline" onClick={() => setIsSortOpen(true)} className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-lg">
              <ArrowUpDown className="h-4 w-4" /> Sort Sequence
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-1">
        {paginatedRecords.length > 0 ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            <AnimatePresence mode="popLayout">
              {paginatedRecords.map((record) => (
                <motion.div key={record.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} layout>
                  <RegistryCard 
                    record={record} 
                    onInspect={handleInspect} 
                    selected={selectedIds.has(record.id)} 
                    onToggleSelect={(id) => {
                      const next = new Set(selectedIds);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      setSelectedIds(next);
                    }} 
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="h-[400px] flex flex-col items-center justify-center opacity-20 border-4 border-dashed rounded-[3rem] space-y-6 text-center">
            <Boxes className="h-24 w-24 mb-2" />
            <div className="space-y-1">
              <h3 className="text-2xl font-black uppercase tracking-[0.2em]">Category Silent</h3>
              <p className="text-sm font-medium italic">Your query did not return any records in this scope.</p>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-background/80 backdrop-blur-2xl px-6 py-3 rounded-[2.5rem] border-2 border-primary/10 shadow-2xl flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-10 w-10 rounded-xl"><ChevronLeft className="h-5 w-5" /></Button>
          <span className="text-[10px] font-black uppercase tracking-widest px-4 tabular-nums">Page {currentPage} of {totalPages || 1}</span>
          <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p + 1)} className="h-10 w-10 rounded-xl"><ChevronRight className="h-5 w-5" /></Button>
        </div>
        <div className="h-6 w-px bg-border/40" />
        <Button className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-primary shadow-xl shadow-primary/20 text-black" onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Asset
        </Button>
      </div>

      <HeaderManagerDrawer isOpen={isHeaderManagerOpen} onOpenChange={setIsHeaderManagerOpen} headers={headers} onUpdateHeaders={saveHeaderPrefs} onReset={() => {}} />
      <FilterDrawer isOpen={isFilterOpen} onOpenChange={setIsFilterOpen} headers={headers} activeFilters={filters} onUpdateFilters={setFilters} />
      <SortDrawer isOpen={isSortOpen} onOpenChange={setIsSortOpen} headers={headers} sortBy={sortKey} sortDirection={sortDir} onUpdateSort={(k, dir) => { setSortKey(k); setSortDirection(dir); }} />
      <AssetDetailSheet isOpen={isDetailOpen} onOpenChange={setIsDetailOpen} record={selectedRecord} onEdit={(id) => {}} />
      <AssetForm 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        asset={processedRecords.find(r => r.id === selectedRecord?.id)?.rawRow as unknown as Asset}
        onSave={async (a) => { 
          const isUpdate = assets.some(x => x.id === a.id);
          await enqueueMutation(isUpdate ? 'UPDATE' : 'CREATE', 'assets', a);
          const local = await storage.getAssets();
          const next = isUpdate ? local.map(x => x.id === a.id ? a : x) : [a, ...local];
          await storage.saveAssets(next);
          await refreshRegistry();
          setIsFormOpen(false); 
          toast({ title: "Modification Staged", description: "Record pulse saved on device." });
        }} 
        isReadOnly={false} 
        onQuickSave={async () => {}} 
      />
    </div>
  );
}
