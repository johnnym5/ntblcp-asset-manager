
'use client';

/**
 * @fileOverview Registry Workspace - Header-Aware High-Performance Browser.
 * Phase 21: Integrated advanced filtering, multi-sort, and detail sheet orchestration.
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
  FileUp, 
  LayoutGrid, 
  List, 
  Database,
  DatabaseZap,
  X,
  Columns,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FilterX
} from 'lucide-react';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { HeaderManagerDrawer } from '@/components/registry/HeaderManagerDrawer';
import { FilterDrawer } from '@/components/registry/FilterDrawer';
import { SortDrawer } from '@/components/registry/SortDrawer';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import { AssetForm } from '@/components/asset-form';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/domain';
import type { RegistryHeader, AssetRecord, HeaderFilter } from '@/types/registry';
import { DEFAULT_REGISTRY_HEADERS, transformAssetToRecord } from '@/lib/registry-utils';
import { Badge } from '@/components/ui/badge';
import { ExcelService } from '@/services/excel-service';

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
  
  // --- Drawers ---
  const [isHeaderManagerOpen, setIsHeaderManagerOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // --- Logic State ---
  const [filters, setFilters] = useState<HeaderFilter[]>([]);
  const [sortKey, setSortKey] = useState<string>('sn');
  const [sortDir, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRecord, setSelectedRecord] = useState<AssetRecord | undefined>();
  const [selectedAssetForForm, setSelectedAssetForForm] = useState<Asset | undefined>();

  // Initialize Headers from Template
  useEffect(() => {
    const saved = localStorage.getItem('registry-header-prefs');
    if (saved) {
      setHeaders(JSON.parse(saved));
    } else {
      const initial = DEFAULT_REGISTRY_HEADERS.map((h, i) => ({ ...h, id: `h-${i}`, orderIndex: i }));
      setHeaders(initial as RegistryHeader[]);
    }
  }, []);

  const saveHeaderPrefs = (updated: RegistryHeader[]) => {
    setHeaders(updated);
    localStorage.setItem('registry-header-prefs', JSON.stringify(updated));
  };

  const currentRegistry = dataSource === 'PRODUCTION' ? assets : sandboxAssets;

  // --- Filtering & Sorting Logic Pulse ---
  const processedRecords = useMemo(() => {
    let results = currentRegistry.map(a => transformAssetToRecord(a, headers));

    // 1. Keyword Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(r => 
        r.rawRow.description?.toLowerCase().includes(term) || 
        r.rawRow.serialNumber?.toLowerCase().includes(term) ||
        r.rawRow.assetIdCode?.toLowerCase().includes(term)
      );
    }

    // 2. Logic Filters
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

    // 3. Sorting
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

  // --- Navigation Helpers ---
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

  const handleNext = () => {
    if (!selectedRecord) return;
    const idx = processedRecords.findIndex(r => r.id === selectedRecord.id);
    if (idx < processedRecords.length - 1) setSelectedRecord(processedRecords[idx + 1]);
  };

  const handlePrev = () => {
    if (!selectedRecord) return;
    const idx = processedRecords.findIndex(r => r.id === selectedRecord.id);
    if (idx > 0) setSelectedRecord(processedRecords[idx - 1]);
  };

  if (authLoading || !settingsLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const activeProjectName = appSettings?.grants.find(g => g.id === activeGrantId)?.name || 'Registry Hub';

  return (
    <AppLayout>
      <div className="flex flex-col h-full gap-6 relative pb-32">
        {/* Header Pulse */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter text-foreground uppercase leading-none">{activeProjectName}</h2>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={cn(
                "h-6 px-3 text-[9px] font-black tracking-widest rounded-full border-2",
                dataSource === 'SANDBOX' ? "border-orange-500/20 bg-orange-50 text-orange-600" : "border-primary/20 bg-primary/5 text-primary shadow-sm"
              )}>
                {processedRecords.length} RECORDS IN PULSE
              </Badge>
              {dataSource === 'SANDBOX' && (
                <Badge className="h-6 px-3 text-[9px] font-black tracking-widest bg-orange-500 text-white rounded-full shadow-lg shadow-orange-500/20">
                  SANDBOX ACTIVE
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
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
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsHeaderManagerOpen(true)}
              className="h-12 w-12 rounded-2xl border-2 border-primary/10 shadow-sm tactile-pulse"
            >
              <Columns className="h-5 w-5 text-primary" />
            </Button>
          </div>
        </div>

        {/* Toolbar Pulse */}
        <div className="flex flex-col gap-4 px-2">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40 group-focus-within:text-primary transition-all" />
              <Input 
                placeholder="Search by ID, Serial, or Description..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-12 h-14 rounded-2xl bg-card border-none shadow-xl focus-visible:ring-primary/20 text-sm font-medium transition-all"
              />
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsFilterOpen(true)}
                className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-lg hover:bg-primary/5 transition-all relative"
              >
                <Filter className="h-4 w-4" /> 
                Advanced Filter
                {filters.length > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-white text-[10px] rounded-full flex items-center justify-center border-4 border-background animate-in zoom-in">{filters.length}</span>}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsSortOpen(true)}
                className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 bg-card border-none shadow-lg hover:bg-primary/5 transition-all"
              >
                <ArrowUpDown className="h-4 w-4" /> Sort Registry
              </Button>
            </div>
          </div>

          {/* Filter Chips Pulse */}
          <AnimatePresence>
            {filters.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-wrap gap-2 items-center px-2"
              >
                <div className="p-2 bg-primary/10 rounded-lg mr-2">
                  <FilterX className="h-3 w-3 text-primary" onClick={() => setFilters([])} />
                </div>
                {filters.map((f, i) => {
                  const h = headers.find(header => header.id === f.headerId);
                  return (
                    <Badge key={`chip-${i}`} variant="secondary" className="h-8 pl-3 pr-1 rounded-xl bg-card border-2 border-border/40 font-bold text-[9px] uppercase tracking-tighter gap-2">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {paginatedRecords.map((record) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                  >
                    <RegistryCard 
                      record={record}
                      onInspect={handleInspect}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-center p-10 opacity-20 border-4 border-dashed rounded-[3rem]">
              <Boxes className="h-24 w-24 mb-6" />
              <h3 className="text-2xl font-black uppercase tracking-[0.2em]">Registry Pulse Silent</h3>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Zero records detected matching current logic pulse.</p>
            </div>
          )}
        </div>

        {/* Bottom Pagination Pulse */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-background/80 backdrop-blur-2xl px-6 py-3 rounded-[2.5rem] border-2 border-primary/10 shadow-2xl flex items-center gap-6 ring-1 ring-white/10">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="h-10 w-10 rounded-xl tactile-pulse"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-[10px] font-black uppercase tracking-widest px-4 tabular-nums">
              Page {currentPage} <span className="opacity-30">of</span> {totalPages || 1}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="h-10 w-10 rounded-xl tactile-pulse"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <div className="h-6 w-px bg-border/40" />
          <div className="flex items-center gap-2">
            <Button 
              className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-primary shadow-xl shadow-primary/20 tactile-pulse"
              onClick={() => { setSelectedAssetForForm(undefined); setIsFormOpen(true); }}
            >
              <Plus className="mr-2 h-4 w-4" /> New Pulse
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => ExcelService.exportRegistry(currentRegistry)}
              className="h-12 w-12 rounded-2xl tactile-pulse opacity-60 hover:opacity-100"
            >
              <FileDown className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <HeaderManagerDrawer 
        isOpen={isHeaderManagerOpen}
        onOpenChange={setIsHeaderManagerOpen}
        headers={headers}
        onUpdateHeaders={saveHeaderPrefs}
        onReset={() => {
          const initial = DEFAULT_REGISTRY_HEADERS.map((h, i) => ({ ...h, id: `h-${i}`, orderIndex: i }));
          saveHeaderPrefs(initial as RegistryHeader[]);
        }}
      />

      <FilterDrawer 
        isOpen={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        headers={headers}
        activeFilters={filters}
        onUpdateFilters={setFilters}
      />

      <SortDrawer 
        isOpen={isSortOpen}
        onOpenChange={setIsSortOpen}
        headers={headers}
        sortBy={sortKey}
        sortDirection={sortDir}
        onUpdateSort={(k, dir) => { setSortKey(k); setSortDirection(dir); }}
      />

      <AssetDetailSheet 
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        record={selectedRecord}
        onEdit={handleEdit}
        onNext={handleNext}
        onPrevious={handlePrev}
      />

      <AssetForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        asset={selectedAssetForForm}
        isReadOnly={dataSource === 'PRODUCTION' && appSettings?.appMode === 'management'}
        onSave={async (a) => {
          await refreshRegistry();
          setIsFormOpen(false);
        }}
        onQuickSave={async () => {}}
      />
    </AppLayout>
  );
}
