'use client';

/**
 * @fileOverview RegistryWorkstation - Overhauled to match requested High-Fidelity Design.
 * Phase 108: Enhanced Mobile Responsiveness for Category Grid and Gold Bar.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Boxes, 
  Loader2, 
  ArrowUpDown,
  ChevronRight,
  Zap,
  Edit3,
  Trash2,
  Settings2,
  ArrowLeft,
  LayoutGrid,
  Activity,
  ChevronsUpDown,
  CheckCircle2,
  ArrowRightLeft,
  Copy,
  FileSpreadsheet,
  X,
  MoreHorizontal,
  PlusCircle
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { HeaderManagerDrawer } from '@/components/registry/HeaderManagerDrawer';
import { FilterDrawer } from '@/components/registry/FilterDrawer';
import { SortDrawer } from '@/components/registry/SortDrawer';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import AssetForm from '@/components/asset-form';
import { AssetBatchEditForm } from '@/components/asset-batch-edit-form';
import { AssetFilterSheet } from '@/components/asset-filter-sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ExcelService } from '@/services/excel-service';
import { storage } from '@/offline/storage';
import { enqueueMutation } from '@/offline/queue';
import { DEFAULT_REGISTRY_HEADERS, transformAssetToRecord } from '@/lib/registry-utils';
import { cn } from '@/lib/utils';
import type { RegistryHeader, AssetRecord, HeaderFilter } from '@/types/registry';
import type { Asset } from '@/types/domain';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const ITEMS_PER_PAGE = 24;

export function RegistryWorkstation() {
  const { 
    assets, 
    sandboxAssets, 
    dataSource, 
    refreshRegistry, 
    appSettings,
    isOnline,
    searchTerm,
    setSearchTerm,
    selectedLocations,
    setSelectedLocations,
    selectedAssignees,
    setSelectedAssignees,
    selectedStatuses,
    setSelectedStatuses,
    selectedConditions,
    setSelectedConditions,
    missingFieldFilter,
    setMissingFieldFilter
  } = useAppState();
  
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [headers, setHeaders] = useState<RegistryHeader[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  // UI State
  const [isHeaderManagerOpen, setIsHeaderManagerOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [pulseView, setPulseView] = useState<'stats' | 'insights'>('stats');

  // Sorting Logic State
  const [sortKey, setSortKey] = useState<string>('sn');
  const [sortDir, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRecord, setSelectedRecord] = useState<AssetRecord | undefined>();

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
    const sourceAssets = dataSource === 'PRODUCTION' ? assets : sandboxAssets;
    if (sourceAssets.length === 0) {
      toast({ variant: "destructive", title: "Export Failed", description: "Registry is empty." });
      return;
    }

    setIsExportingExcel(true);
    try {
      const targetAssets = selectedIds.size > 0 
        ? sourceAssets.filter(a => selectedIds.has(a.id)) 
        : sourceAssets;
      
      await ExcelService.exportRegistry(targetAssets, headers);
      toast({ title: "Excel Pulse Complete" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Export Interrupted", description: e.message });
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

  // Derived Filter Options with Counts
  const locationOptions = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => {
      const loc = a.location || 'Global';
      counts.set(loc, (counts.get(loc) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, value: label, count }));
  }, [assets]);

  const assigneeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => {
      if (a.custodian) counts.set(a.custodian, (counts.get(a.custodian) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, value: label, count }));
  }, [assets]);

  const conditionOptions = useMemo(() => {
    const counts = new Map<string, number>();
    assets.forEach(a => {
      if (a.condition) counts.set(a.condition, (counts.get(a.condition) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, value: label, count }));
  }, [assets]);

  const statusOptions = [
    { label: 'Verified', value: 'VERIFIED' },
    { label: 'Unverified', value: 'UNVERIFIED' },
    { label: 'Discrepancy', value: 'DISCREPANCY' }
  ];

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
        String(r.rawRow.assetIdCode || '').toLowerCase().includes(term) ||
        String(r.rawRow.location || '').toLowerCase().includes(term)
      );
    }

    if (selectedLocations.length > 0) results = results.filter(r => selectedLocations.includes(String(r.rawRow.location)));
    if (selectedAssignees.length > 0) results = results.filter(r => selectedAssignees.includes(String(r.rawRow.custodian)));
    if (selectedStatuses.length > 0) results = results.filter(r => selectedStatuses.includes(String(r.rawRow.status)));
    if (selectedConditions.length > 0) results = results.filter(r => selectedConditions.includes(String(r.rawRow.condition)));
    
    if (missingFieldFilter) {
      results = results.filter(r => {
        const val = (r.rawRow as any)[missingFieldFilter];
        return !val || val === 'N/A' || val === '---';
      });
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

  const totalPages = Math.ceil(processedRecords.length / ITEMS_PER_PAGE);

  const toggleCategorySelection = (name: string) => {
    const next = new Set(selectedCategories);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedCategories(next);
  };

  const handleSelectAll = () => {
    if (selectedCategory) {
      const allIds = new Set(processedRecords.map(r => r.id));
      if (selectedIds.size === allIds.size) setSelectedIds(new Set());
      else setSelectedIds(allIds);
    } else {
      const allCats = new Set(categoryStats.map(c => c.name));
      if (selectedCategories.size === allCats.size) setSelectedCategories(new Set());
      else setSelectedCategories(allCats);
    }
  };

  const isAnySelected = selectedIds.size > 0 || selectedCategories.size > 0;

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
      
      {/* 1. Unified Search & Logic Bar */}
      <div className="relative group px-1 sm:px-0">
        <div className="absolute left-5 top-1/2 -translate-y-1/2">
          <Search className="h-5 w-5 text-muted-foreground opacity-40 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" />
        </div>
        <Input 
          placeholder="Search Registry Pulse..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-14 sm:h-16 pl-12 sm:pl-14 pr-24 sm:pr-32 rounded-2xl bg-[#0A0A0A] border-none text-sm font-medium shadow-2xl focus-visible:ring-primary/20 transition-all placeholder:text-muted-foreground/30 text-white"
        />
        <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsSortOpen(true)} className="h-9 w-9 sm:h-10 sm:w-10 text-white opacity-40 hover:opacity-100 hover:bg-white/5 rounded-xl transition-all">
            <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsFilterOpen(true)} className="h-9 w-9 sm:h-10 sm:w-10 text-white opacity-40 hover:opacity-100 hover:bg-white/5 rounded-xl transition-all">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>

      {/* 2. Inventory Pulse Card */}
      <Card className="bg-[#0A0A0A] border-none shadow-3xl rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden group hover:scale-[1.005] transition-transform duration-500 mx-1 sm:mx-0">
        <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="p-3 sm:p-4 bg-primary/10 rounded-2xl shadow-inner group-hover:bg-primary/20 transition-colors">
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white leading-none">Inventory Pulse</h3>
              <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60">Global Asset Telemetry</p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
            <div className="flex items-center bg-black/60 p-1 rounded-2xl border border-white/5 shadow-inner flex-1 sm:flex-none">
              <button 
                onClick={() => setPulseView('stats')}
                className={cn(
                  "flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest transition-all",
                  pulseView === 'stats' ? "bg-white/10 text-white shadow-lg" : "text-muted-foreground hover:text-white"
                )}
              >
                Key Stats
              </button>
              <button 
                onClick={() => setPulseView('insights')}
                className={cn(
                  "flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest transition-all",
                  pulseView === 'insights' ? "bg-white/10 text-white shadow-lg" : "text-muted-foreground hover:text-white"
                )}
              >
                Insights
              </button>
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl text-white/20 hover:text-white transition-all hidden xs:flex">
              <ChevronsUpDown className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Categories & Inventories Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2 py-2">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="p-2 sm:p-3 bg-primary/10 rounded-xl">
            <LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-white uppercase leading-none truncate max-w-[200px] sm:max-w-none">
            {selectedCategory || 'Registry Hub'}
          </h2>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="relative group cursor-pointer bg-black/40 border border-white/10 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl flex items-center gap-4 sm:gap-10 hover:border-primary/40 transition-all shadow-xl flex-1 sm:flex-none justify-between">
                <span className="text-[9px] sm:text-[11px] font-black uppercase text-white tracking-widest leading-none">
                  Scope
                  <span className="ml-2 text-primary font-mono opacity-80">{processedRecords.length}</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-white/40 rotate-90" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-black border-white/10 rounded-2xl shadow-3xl text-white">
              {appSettings?.grants.map(g => (
                <DropdownMenuItem key={g.id} onClick={() => refreshRegistry()} className="h-12 uppercase font-black text-[10px] tracking-widest cursor-pointer hover:bg-white/5">{g.name}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button 
            onClick={handleSelectAll}
            className="flex items-center gap-2 sm:gap-3 group px-3 py-2 hover:bg-white/5 rounded-xl transition-all"
          >
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white hidden xxs:inline">ALL</span>
            <div className={cn(
              "h-5 w-5 sm:h-6 sm:w-6 rounded-full border-2 flex items-center justify-center transition-all",
              ((selectedCategory && selectedIds.size === processedRecords.length) || (!selectedCategory && selectedCategories.size === categoryStats.length)) && categoryStats.length > 0
                ? "bg-primary border-primary text-black" 
                : "border-white/10 group-hover:border-white/30"
            )}>
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </button>
        </div>
      </div>

      {/* 4. Operational Pulse Bar (The Gold Bar) */}
      <AnimatePresence>
        {isAnySelected && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="sticky top-2 z-50 px-1 sm:px-2"
          >
            <div className="bg-primary shadow-3xl shadow-primary/30 rounded-[1.5rem] sm:rounded-[2rem] h-16 sm:h-20 flex items-center px-4 sm:px-8 gap-4 sm:gap-10 overflow-hidden relative">
              <div className="flex items-center gap-2 sm:gap-4 bg-white/20 px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl backdrop-blur-md shrink-0">
                <span className="text-[10px] sm:text-sm font-black uppercase text-black">
                  {selectedCategory ? selectedIds.size : selectedCategories.size} Selected
                </span>
              </div>
              
              <Separator orientation="vertical" className="h-8 bg-black/10 hidden sm:block" />

              <ScrollArea className="flex-1 h-full">
                <div className="flex items-center gap-4 sm:gap-8 h-full py-2">
                  <button onClick={() => {}} className="flex items-center gap-2 sm:gap-3 text-black font-black uppercase text-[9px] sm:text-[11px] tracking-widest shrink-0"><ArrowRightLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Merge</button>
                  <button onClick={() => setIsBatchEditOpen(true)} className="flex items-center gap-2 sm:gap-3 text-black font-black uppercase text-[9px] sm:text-[11px] tracking-widest shrink-0"><Edit3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Batch Edit</button>
                  <button onClick={handleExcelExport} className="flex items-center gap-2 sm:gap-3 text-black font-black uppercase text-[9px] sm:text-[11px] tracking-widest shrink-0"><FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Excel</button>
                  <button onClick={() => {}} className="flex items-center gap-2 sm:gap-3 text-black font-black uppercase text-[9px] sm:text-[11px] tracking-widest shrink-0"><Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Wipe</button>
                </div>
                <ScrollBar orientation="horizontal" className="h-1 opacity-20" />
              </ScrollArea>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { setSelectedIds(new Set()); setSelectedCategories(new Set()); }}
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-full hover:bg-black/5 text-black shrink-0"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Registry Surface */}
      {!selectedCategory ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 px-1">
          {categoryStats.map((cat) => (
            <Card key={cat.name} className="bg-black border-2 border-primary/10 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden hover:border-primary/40 transition-all group shadow-2xl relative">
              <CardHeader className="p-6 sm:p-8 pb-4 flex flex-row items-center justify-between">
                <h3 className="text-white font-black uppercase text-[11px] sm:text-sm tracking-tight truncate max-w-[80%] leading-none">{cat.name}</h3>
                <div onClick={(e) => { e.stopPropagation(); toggleCategorySelection(cat.name); }} className="cursor-pointer">
                  <div className={cn(
                    "h-5 w-5 sm:h-6 sm:w-6 rounded-full border-2 transition-all flex items-center justify-center",
                    selectedCategories.has(cat.name) ? "bg-primary border-primary text-black" : "border-white/10 hover:border-white/30"
                  )}>
                    <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 pt-0 space-y-6 sm:space-y-8">
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <div className="text-4xl sm:text-5xl font-black text-white tracking-tighter leading-none">{cat.total}</div>
                    <p className="text-[8px] sm:text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">RECORDS</p>
                  </div>
                  <LayoutGrid className="h-8 w-8 sm:h-10 sm:w-10 text-primary opacity-10 group-hover:opacity-40 transition-all" />
                </div>

                <div className="space-y-3 pt-4 border-t border-dashed border-white/10">
                  <div className="flex items-center justify-between text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/40">
                    <span>PROGRESS</span>
                    <span className="text-primary font-mono">{cat.verified}/{cat.total}</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${(cat.verified / cat.total) * 100}%` }} />
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => setSelectedCategory(cat.name)}
                  className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-transparent border-primary/20 text-white font-black uppercase text-[9px] sm:text-[10px] tracking-[0.2em] group-hover:bg-primary group-hover:text-black transition-all shadow-inner"
                >
                  View Records <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedCategory(null)} 
              className="h-11 sm:h-12 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-black border-2 border-white/5 hover:border-primary/20 text-white font-black uppercase text-[9px] sm:text-[10px] tracking-widest w-full sm:w-auto"
            >
              <ArrowLeft className="mr-3 h-4 w-4" /> Back to hub
            </Button>
            <Badge variant="outline" className="h-8 px-4 rounded-xl border-primary/20 bg-primary/5 text-primary font-black uppercase text-[9px] sm:text-[10px] w-full sm:w-auto justify-center">
              {processedRecords.length} CATEGORY RECORDS
            </Badge>
          </div>

          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 px-1">
            {paginatedRecords.map((record) => (
              <RegistryCard 
                key={record.id} 
                record={record} 
                onInspect={() => { setSelectedRecord(record); setIsDetailOpen(true); }} 
                selected={selectedIds.has(record.id)} 
                onToggleSelect={(id) => {
                  const next = new Set(selectedIds);
                  if (next.has(id)) next.delete(id); else next.add(id);
                  setSelectedIds(next);
                }} 
              />
            ))}
          </div>

          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-background/80 backdrop-blur-2xl px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl sm:rounded-[2.5rem] border-2 border-primary/10 shadow-2xl flex items-center gap-4 sm:gap-6 w-[95vw] sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl"><ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 sm:px-4 tabular-nums text-white">Page {currentPage} of {totalPages || 1}</span>
              <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p + 1)} className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl"><ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
            </div>
            <div className="h-6 w-px bg-border/40 hidden xs:block" />
            <Button className="h-10 sm:h-12 px-4 sm:px-8 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest bg-primary shadow-xl shadow-primary/20 text-black shrink-0" onClick={() => setIsFormOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4 hidden xs:inline" /> New
            </Button>
          </div>
        </div>
      )}

      {/* Global Drawers & Dialogs */}
      <HeaderManagerDrawer isOpen={isHeaderManagerOpen} onOpenChange={setIsHeaderManagerOpen} headers={headers} onUpdateHeaders={saveHeaderPrefs} onReset={() => {}} />
      <AssetFilterSheet 
        isOpen={isFilterOpen} 
        onOpenChange={setIsFilterOpen} 
        locationOptions={locationOptions}
        selectedLocations={selectedLocations}
        setSelectedLocations={setSelectedLocations}
        assigneeOptions={assigneeOptions}
        selectedAssignees={selectedAssignees}
        setSelectedAssignees={setSelectedAssignees}
        statusOptions={statusOptions}
        selectedStatuses={selectedStatuses}
        setSelectedStatuses={setSelectedStatuses}
        conditionOptions={conditionOptions}
        selectedConditions={selectedConditions}
        setSelectedConditions={setSelectedConditions}
        missingFieldFilter={missingFieldFilter}
        setMissingFieldFilter={setMissingFieldFilter}
      />
      <SortDrawer isOpen={isSortOpen} onOpenChange={setIsSortOpen} headers={headers} sortBy={sortKey} sortDirection={sortDir} onUpdateSort={(k, dir) => { setSortKey(k); setSortDirection(dir); }} />
      <AssetDetailSheet isOpen={isDetailOpen} onOpenChange={setIsDetailOpen} record={selectedRecord} onEdit={() => setIsFormOpen(true)} />
      <AssetForm 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        asset={processedRecords.find(r => r.id === selectedRecord?.id)?.rawRow as unknown as Asset}
        onSave={async (a) => { 
          const isUpdate = assets.some(x => x.id === a.id);
          await enqueueMutation(isUpdate ? 'UPDATE' : 'CREATE', 'assets', a);
          await refreshRegistry();
          setIsFormOpen(false); 
          toast({ title: "Pulse Saved" });
        }} 
        isReadOnly={false} 
        onQuickSave={async () => {}} 
      />
      <AssetBatchEditForm isOpen={isBatchEditOpen} onOpenChange={setIsBatchEditOpen} selectedAssetCount={selectedIds.size} onSave={async (d) => { await refreshRegistry(); setSelectedIds(new Set()); }} />
    </div>
  );
}
