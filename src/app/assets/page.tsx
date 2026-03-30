'use client';

/**
 * @fileOverview Registry Workspace - Decentralized Hierarchical Register.
 * Phase 24: Implemented Arrangement Profiles and Synchronized Export.
 */

import React, { useMemo, useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Plus, 
  Boxes, 
  Loader2, 
  FileDown, 
  Database,
  DatabaseZap,
  X,
  Columns,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FilterX,
  LayoutGrid,
  List,
  Zap,
  Edit3,
  Trash2,
  Settings2,
  ShieldCheck
} from 'lucide-react';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { RegistryTable } from '@/components/registry/RegistryTable';
import { HeaderManagerDrawer } from '@/components/registry/HeaderManagerDrawer';
import { FilterDrawer } from '@/components/registry/FilterDrawer';
import { SortDrawer } from '@/components/registry/SortDrawer';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import { AssetForm } from '@/components/asset-form';
import { AssetBatchEditForm } from '@/components/asset-batch-edit-form';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/domain';
import type { RegistryHeader, AssetRecord, HeaderFilter, DensityMode, RegistryPreset } from '@/types/registry';
import { DEFAULT_REGISTRY_HEADERS, transformAssetToRecord, REGISTRY_PRESETS } from '@/lib/registry-utils';
import { Badge } from '@/components/ui/badge';
import { ExcelService } from '@/services/excel-service';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

const ITEMS_PER_PAGE = 24;

export default function AssetRegistryPage() {
  const { 
    assets, 
    sandboxAssets, 
    dataSource, 
    setDataSource, 
    refreshRegistry, 
    settingsLoaded, 
    activeGrantId, 
    appSettings 
  } = useAppState();
  
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // --- UI State ---
  const [headers, setHeaders] = useState<RegistryHeader[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activePresetId, setActivePresetId] = useState<string>("quick");
  
  // --- Selection State ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- Drawers ---
  const [isHeaderManagerOpen, setIsHeaderManagerOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);

  // --- Logic State ---
  const [filters, setFilters] = useState<HeaderFilter[]>([]);
  const [sortKey, setSortKey] = useState<string>('sn');
  const [sortDir, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRecord, setSelectedRecord] = useState<AssetRecord | undefined>();
  const [selectedAssetForForm, setSelectedAssetForForm] = useState<Asset | undefined>();

  // Initialize Headers & Preferences
  useEffect(() => {
    const savedHeaders = localStorage.getItem('registry-header-prefs');
    const savedPreset = localStorage.getItem('registry-active-preset') || 'quick';
    
    if (savedHeaders) {
      setHeaders(JSON.parse(savedHeaders));
    } else {
      const initial = DEFAULT_REGISTRY_HEADERS.map((h, i) => ({ ...h, id: `h-${i}`, orderIndex: i }));
      setHeaders(initial as RegistryHeader[]);
    }
    setActivePresetId(savedPreset);
  }, []);

  const saveHeaderPrefs = (updated: RegistryHeader[]) => {
    setHeaders(updated);
    localStorage.setItem('registry-header-prefs', JSON.stringify(updated));
  };

  const handleApplyPreset = (preset: RegistryPreset) => {
    const updated = headers.map(h => ({
      ...h,
      visible: preset.visibleHeaderNames.includes(h.normalizedName)
    }));
    saveHeaderPrefs(updated);
    setActivePresetId(preset.id);
    localStorage.setItem('registry-active-preset', preset.id);
    toast({ title: "Arrangement Applied", description: `Registry pulse set to ${preset.name}.` });
  };

  const currentRegistry = dataSource === 'PRODUCTION' ? assets : sandboxAssets;

  // --- Filtering & Sorting logic ---
  const processedRecords = useMemo(() => {
    let results = currentRegistry.map(a => transformAssetToRecord(a, headers));

    // Search Pulse
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(r => 
        String(r.rawRow.description || '').toLowerCase().includes(term) || 
        String(r.rawRow.serialNumber || '').toLowerCase().includes(term) ||
        String(r.rawRow.assetIdCode || '').toLowerCase().includes(term)
      );
    }

    // Logic Pulse (Filters)
    filters.forEach(f => {
      results = results.filter(r => {
        const field = r.fields.find(field => field.headerId === f.headerId);
        const val = String(field?.rawValue || '').toLowerCase();
        const filterVal = String(f.value || '').toLowerCase();

        switch(f.operator) {
          case 'equals': return val === filterVal;
          case 'contains': return val.includes(filterVal);
          case 'startsWith': return val.startsWith(filterVal);
          case 'endsWith': return val.endsWith(filterVal);
          case 'exists': return val !== '' && val !== '---';
          default: return true;
        }
      });
    });

    // Sequence Pulse (Sort)
    results.sort((a, b) => {
      const fieldA = a.fields.find(f => f.headerId === sortKey)?.rawValue || '';
      const fieldB = b.fields.find(f => f.headerId === sortKey)?.rawValue || '';
      
      const comparison = String(fieldA).localeCompare(String(fieldB), undefined, { numeric: true });
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return results;
  }, [currentRegistry, searchTerm, headers, filters, sortKey, sortDir]);

  const paginatedRecords = useMemo(() => {
    return processedRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [processedRecords, currentPage]);

  const totalPages = Math.ceil(processedRecords.length / ITEMS_PER_PAGE);

  // --- Handlers ---
  const handleInspect = (id: string) => {
    const record = processedRecords.find(r => r.id === id);
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  const handleEdit = (id: string) => {
    const asset = currentRegistry.find(a => a.id === id);
    setSelectedAssetForForm(asset);
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedRecords.map(r => r.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBatchPurge = async () => {
    setIsBatchDeleteDialogOpen(false);
    toast({ title: "Purge Initiated", description: `Discarding ${selectedIds.size} records from registry pulse.` });
    setSelectedIds(new Set());
    await refreshRegistry();
  };

  const handleExport = async () => {
    toast({ title: "Constructing Export", description: "Synchronizing custom arrangement labels..." });
    await ExcelService.exportRegistry(currentRegistry, headers);
  };

  const activeProjectName = appSettings?.grants.find(g => g.id === activeGrantId)?.name || 'Registry Hub';

  if (authLoading || !settingsLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full gap-6 relative pb-32">
        {/* Header Section: Arrangement & Preset Pulse */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between px-2 gap-6">
          <div className="space-y-1">
            <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase leading-none">{activeProjectName}</h2>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="h-6 px-3 text-[9px] font-black tracking-widest rounded-full border-2 border-primary/20 bg-primary/5 text-primary">
                {processedRecords.length} PULSES DISCOVERED
              </Badge>
              {dataSource === 'SANDBOX' && (
                <Badge className="h-6 px-3 text-[9px] font-black tracking-widest bg-orange-500 text-white rounded-full">SANDBOX ACTIVE</Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Data Layer Switcher */}
            <div className="flex items-center bg-muted/50 p-1.5 rounded-2xl border-2 border-border/40 shadow-inner">
              <Button 
                variant={dataSource === 'PRODUCTION' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setDataSource('PRODUCTION')}
                className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
              >
                <Database className="h-3.5 w-3.5" /> Production
              </Button>
              <Button 
                variant={dataSource === 'SANDBOX' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setDataSource('SANDBOX')}
                className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
              >
                <DatabaseZap className="h-3.5 w-3.5" /> Sandbox
              </Button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-muted/50 p-1.5 rounded-2xl border-2 border-border/40">
              <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-9 w-9 p-0 rounded-xl" title="Grid View"><LayoutGrid className="h-4 w-4" /></Button>
              <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-9 w-9 p-0 rounded-xl" title="List View"><List className="h-4 w-4" /></Button>
            </div>

            {/* Arrangement Preset Pulse */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 border-2 shadow-sm bg-card hover:bg-primary/5 transition-all">
                  <Zap className="h-4 w-4 text-primary fill-current" />
                  {REGISTRY_PRESETS.find(p => p.id === activePresetId)?.name || 'Arrangement'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-2xl border-2 shadow-2xl p-2" align="end">
                <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest opacity-40 px-2 py-3">Select Arrangement Pulse</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {REGISTRY_PRESETS.map((preset) => (
                  <DropdownMenuItem 
                    key={preset.id} 
                    onClick={() => handleApplyPreset(preset)}
                    className="rounded-xl px-3 py-2.5 font-bold text-xs flex items-center justify-between cursor-pointer group"
                  >
                    {preset.name}
                    {activePresetId === preset.id && <ShieldCheck className="h-4 w-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsHeaderManagerOpen(true)}
              className="h-12 w-12 rounded-2xl border-2 border-primary/10 shadow-sm bg-card tactile-pulse"
              title="Header Manager"
            >
              <Settings2 className="h-5 w-5 text-primary" />
            </Button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-col gap-4 px-2">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-all" />
              <Input 
                placeholder="Segment Registry by ID, S/N, or Description..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-12 h-14 rounded-2xl bg-card border-none shadow-xl focus-visible:ring-primary/20 text-sm font-medium transition-all"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsFilterOpen(true)}
                className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-lg hover:bg-primary/5 relative"
              >
                <Filter className="h-4 w-4" /> 
                Logic Engine
                {filters.length > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-white text-[10px] rounded-full flex items-center justify-center border-4 border-background">{filters.length}</span>}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsSortOpen(true)}
                className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-lg hover:bg-primary/5"
              >
                <ArrowUpDown className="h-4 w-4" /> Sort Registry
              </Button>
            </div>
          </div>

          {/* Logic Pulse Chip Bar */}
          <AnimatePresence>
            {filters.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-wrap gap-2 items-center px-2"
              >
                <div className="p-2 bg-primary/10 rounded-lg mr-2 cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => setFilters([])}>
                  <FilterX className="h-3 w-3 text-primary" />
                </div>
                {filters.map((f, i) => {
                  const h = headers.find(header => header.id === f.headerId);
                  return (
                    <Badge key={`chip-${i}`} variant="secondary" className="h-8 pl-3 pr-1 rounded-xl bg-card border-2 border-border/40 font-bold text-[9px] uppercase tracking-tighter gap-2 shadow-sm">
                      <span className="opacity-40">{h?.displayName}:</span> {String(f.value || f.operator)}
                      <button onClick={() => setFilters(filters.filter((_, idx) => idx !== i))} className="p-1 hover:bg-muted rounded-lg transition-colors"><X className="h-3 w-3" /></button>
                    </Badge>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Registry Surface */}
        <div className="flex-1 px-2">
          {paginatedRecords.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {paginatedRecords.map((record) => (
                    <motion.div key={record.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} layout>
                      <RegistryCard 
                        record={record}
                        onInspect={handleInspect}
                        densityMode={activePresetId === 'quick' ? 'compact' : 'expanded'}
                        selected={selectedIds.has(record.id)}
                        onToggleSelect={handleToggleSelect}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <RegistryTable 
                records={paginatedRecords}
                onInspect={handleInspect}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
              />
            )
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-center p-10 opacity-20 border-4 border-dashed rounded-[3rem]">
              <Boxes className="h-24 w-24 mb-6" />
              <h3 className="text-2xl font-black uppercase tracking-[0.2em]">Registry Pulse Silent</h3>
            </div>
          )}
        </div>

        {/* Operational Pulse Bar */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-background/80 backdrop-blur-2xl px-6 py-3 rounded-[2.5rem] border-2 border-primary/10 shadow-2xl flex items-center gap-6 ring-1 ring-white/10 transition-all">
          {selectedIds.size > 0 ? (
            <div className="flex items-center gap-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-primary leading-none">{selectedIds.size} Pulses</span>
                <span className="text-[8px] font-bold uppercase opacity-40 tracking-widest mt-1">Selection Stack</span>
              </div>
              <div className="h-8 w-px bg-border/40" />
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsBatchEditOpen(true)} className="h-11 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 text-primary hover:bg-primary/5">
                  <Edit3 className="h-3.5 w-3.5" /> Batch Pulse
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsBatchDeleteDialogOpen(true)} className="h-11 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 text-destructive hover:bg-destructive/5">
                  <Trash2 className="h-3.5 w-3.5" /> Purge Stack
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSelectedIds(new Set())} className="h-11 w-11 rounded-xl opacity-40 hover:opacity-100">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-10 w-10 rounded-xl tactile-pulse"><ChevronLeft className="h-5 w-5" /></Button>
                <span className="text-[10px] font-black uppercase tracking-widest px-4 tabular-nums">Page {currentPage} <span className="opacity-30">of</span> {totalPages || 1}</span>
                <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-10 w-10 rounded-xl tactile-pulse"><ChevronRight className="h-5 w-5" /></Button>
              </div>
              <div className="h-6 w-px bg-border/40" />
              <div className="flex items-center gap-2">
                <Button className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-primary shadow-xl shadow-primary/20 tactile-pulse text-white" onClick={() => { setSelectedAssetForForm(undefined); setIsFormOpen(true); }}><Plus className="mr-2 h-4 w-4" /> New Registration</Button>
                <Button variant="ghost" size="icon" onClick={handleExport} className="h-12 w-12 rounded-2xl opacity-60 hover:opacity-100" title="Export Arrangement"><FileDown className="h-5 w-5" /></Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Orchestration Drawers */}
      <HeaderManagerDrawer isOpen={isHeaderManagerOpen} onOpenChange={setIsHeaderManagerOpen} headers={headers} onUpdateHeaders={saveHeaderPrefs} onReset={() => { const initial = DEFAULT_REGISTRY_HEADERS.map((h, i) => ({ ...h, id: `h-${i}`, orderIndex: i })); saveHeaderPrefs(initial as RegistryHeader[]); }} />
      <FilterDrawer isOpen={isFilterOpen} onOpenChange={setIsFilterOpen} headers={headers} activeFilters={filters} onUpdateFilters={setFilters} />
      <SortDrawer isOpen={isSortOpen} onOpenChange={setIsSortOpen} headers={headers} sortBy={sortKey} sortDirection={sortDir} onUpdateSort={(k, dir) => { setSortKey(k); setSortDirection(dir); }} />
      <AssetDetailSheet isOpen={isDetailOpen} onOpenChange={setIsDetailOpen} record={selectedRecord} onEdit={handleEdit} onNext={() => { if (!selectedRecord) return; const idx = processedRecords.findIndex(r => r.id === selectedRecord.id); if (idx < processedRecords.length - 1) setSelectedRecord(processedRecords[idx + 1]); }} onPrevious={() => { if (!selectedRecord) return; const idx = processedRecords.findIndex(r => r.id === selectedRecord.id); if (idx > 0) setSelectedRecord(processedRecords[idx - 1]); }} />
      <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={selectedAssetForForm} headers={headers} isReadOnly={dataSource === 'PRODUCTION' && appSettings?.appMode === 'management'} onSave={async (a) => { await refreshRegistry(); setIsFormOpen(false); }} onQuickSave={async () => {}} />
      <AssetBatchEditForm isOpen={isBatchEditOpen} onOpenChange={setIsBatchEditOpen} selectedAssetCount={selectedIds.size} onSave={async (d) => { toast({ title: "Batch Pulse Applied" }); setSelectedIds(new Set()); await refreshRegistry(); }} />
      
      <AlertDialog open={isBatchDeleteDialogOpen} onOpenChange={setIsBatchDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-primary/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Purge {selectedIds.size} Pulses?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium">This will permanently discard the selected records from the registry. This action is irreversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl font-bold">Cancel Action</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchPurge} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black uppercase text-[10px] tracking-widest h-11 px-6">Confirm Purge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
