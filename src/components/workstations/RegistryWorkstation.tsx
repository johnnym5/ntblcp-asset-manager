'use client';

/**
 * @fileOverview RegistryWorkstation - Technical Inventory Browser.
 * Optimized for Responsive Fidelity & Dense Data Navigation.
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database,
  Grid,
  Edit3,
  Trash2,
  Loader2,
  X,
  ShieldCheck,
  Settings2,
  Search,
  Filter,
  ArrowUpDown,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Boxes,
  PlusCircle,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ListFilter,
  Download,
  Upload,
  Zap,
  Plus
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { RegistryTable } from '@/components/registry/RegistryTable';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import AssetForm from '@/components/asset-form';
import { AssetBatchEditForm } from '@/components/asset-batch-edit-form';
import { HeaderManagerDrawer } from '@/components/registry/HeaderManagerDrawer';
import { FilterDrawer } from '@/components/registry/FilterDrawer';
import { SortDrawer } from '@/components/registry/SortDrawer';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { cn, sanitizeSearch } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SheetDefinition, Asset } from '@/types/domain';

const ITEMS_PER_PAGE = 60;

export function RegistryWorkstation({ viewAll = false }: { viewAll?: boolean }) {
  const { 
    assets, 
    sandboxAssets,
    dataSource,
    searchTerm,
    setSearchTerm,
    headers,
    setHeaders,
    refreshRegistry,
    appSettings,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    selectedCategory,
    setSelectedCategory,
    isOnline,
    activeGrantId,
    filters,
    setFilters,
    isFilterOpen,
    setIsFilterOpen,
    isSortOpen,
    setIsSortOpen,
    manualDownload,
    manualUpload,
    isSyncing
  } = useAppState();
  
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isHeaderManagerOpen, setIsHeaderManagerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const activeGrant = useMemo(() => appSettings?.grants.find(g => g.id === activeGrantId), [appSettings, activeGrantId]);
  const categories = useMemo(() => Object.keys(activeGrant?.sheetDefinitions || {}).sort(), [activeGrant]);

  const activeAssets = useMemo(() => dataSource === 'PRODUCTION' ? assets : sandboxAssets, [dataSource, assets, sandboxAssets]);

  const optionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    headers.forEach(h => {
      const values = new Set<string>();
      activeAssets.forEach(a => {
        let val: any = "";
        switch(h.normalizedName) {
          case "sn": val = a.sn; break;
          case "location": val = a.location; break;
          case "assignee_location": val = a.custodian; break;
          case "asset_description": val = a.description; break;
          case "asset_id_code": val = a.assetIdCode; break;
          case "asset_class": val = a.category; break;
          case "condition": val = a.condition; break;
          case "serial_number": val = a.serialNumber; break;
          default: val = a.metadata?.[h.rawName] || a.metadata?.[h.normalizedName];
        }
        if (val !== undefined && val !== null && val !== "") values.add(String(val));
      });
      map[h.id] = Array.from(values).sort();
    });
    return map;
  }, [headers, activeAssets]);

  const processedAssets = useMemo(() => {
    let results = [...activeAssets];
    if (selectedCategory) results = results.filter(a => a.category === selectedCategory);
    
    filters.forEach(f => {
      results = results.filter(a => {
        const header = headers.find(h => h.id === f.headerId);
        if (!header) return true;
        let val: any = "";
        switch(header.normalizedName) {
          case "sn": val = a.sn; break;
          case "location": val = a.location; break;
          case "assignee_location": val = a.custodian; break;
          case "asset_description": val = a.description; break;
          case "asset_id_code": val = a.assetIdCode; break;
          case "asset_class": val = a.category; break;
          case "condition": val = a.condition; break;
          case "serial_number": val = a.serialNumber; break;
          default: val = a.metadata?.[header.rawName] || a.metadata?.[header.normalizedName];
        }
        if (f.operator === 'in' && Array.isArray(f.value)) {
          if (f.value.length === 0) return true;
          return f.value.includes(String(val || ""));
        }
        return true;
      });
    });

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(a => 
        (a.description || '').toLowerCase().includes(term) || 
        (a.assetIdCode || '').toLowerCase().includes(term) ||
        (a.serialNumber || '').toLowerCase().includes(term)
      );
    }

    if (sortKey) {
      const sortHeader = headers.find(h => h.id === sortKey);
      results.sort((a, b) => {
        const getVal = (item: Asset) => {
          if (!sortHeader) return "";
          switch(sortHeader.normalizedName) {
            case "sn": return item.sn || "";
            case "location": return item.location || "";
            case "assignee_location": return item.custodian || "";
            case "asset_description": return item.description || "";
            case "asset_id_code": return item.assetIdCode || "";
            case "asset_class": return item.category || "";
            case "condition": return item.condition || "";
            case "serial_number": return item.serialNumber || "";
            default: return String(item.metadata?.[sortHeader.rawName] || "");
          }
        };
        const valA = String(getVal(a));
        const valB = String(getVal(b));
        return sortDir === 'asc' ? valA.localeCompare(valB, undefined, { numeric: true }) : valB.localeCompare(valA, undefined, { numeric: true });
      });
    }
    return results;
  }, [activeAssets, searchTerm, sortKey, sortDir, selectedCategory, filters, headers]);

  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedAssets.slice(start, start + ITEMS_PER_PAGE);
  }, [processedAssets, currentPage]);

  const currentIndex = useMemo(() => selectedAssetId ? processedAssets.findIndex(a => a.id === selectedAssetId) : -1, [selectedAssetId, processedAssets]);
  const handleNext = useCallback(() => currentIndex < processedAssets.length - 1 && setSelectedAssetId(processedAssets[currentIndex + 1].id), [currentIndex, processedAssets]);
  const handlePrevious = useCallback(() => currentIndex > 0 && setSelectedAssetId(processedAssets[currentIndex - 1].id), [currentIndex, processedAssets]);

  const selectedRecord = useMemo(() => {
    if (!selectedAssetId) return undefined;
    const asset = activeAssets.find(a => a.id === selectedAssetId);
    return asset ? transformAssetToRecord(asset, headers, appSettings?.sourceBranding) : undefined;
  }, [selectedAssetId, activeAssets, headers, appSettings?.sourceBranding]);

  const handleInspect = (id: string) => { setSelectedAssetId(id); setIsDetailOpen(true); };
  const handleToggleSelect = (id: string) => { const next = new Set(selectedAssetIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedAssetIds(next); };
  const handleSearchChange = (val: string) => { setSearchTerm(sanitizeSearch(val)); setCurrentPage(1); };
  const handleExpandSearch = () => { setIsSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 100); };

  const handleDeleteSelected = async () => {
    if (selectedAssetIds.size === 0) return;
    setIsProcessing(true);
    try {
      for (const id of Array.from(selectedAssetIds)) { await enqueueMutation('DELETE', 'assets', { id }); }
      const currentLocal = await storage.getAssets();
      await storage.saveAssets(currentLocal.filter(a => !selectedAssetIds.has(a.id)));
      await refreshRegistry();
      setSelectedAssetIds(new Set());
      toast({ title: "Records Removed" });
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="space-y-4 h-full flex flex-col animate-in fade-in duration-700 relative">
      {/* Responsive Header Pulse */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 px-1 shrink-0">
        <div className="flex items-center gap-3 self-start">
          <div className="p-2 bg-primary/10 rounded-xl shadow-inner"><Database className="h-5 w-5 text-primary" /></div>
          <div className="space-y-0.5">
            <h2 className="text-lg font-black uppercase text-white tracking-tight leading-none">Inventory</h2>
            <p className="text-[8px] font-bold text-white/40 uppercase tracking-[0.2em]">Registry Pulse</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/5 mr-1 shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="h-9 w-9 rounded-lg text-white/40 hover:text-primary"
            >
              {viewMode === 'grid' ? <Grid className="h-4 w-4" /> : <Boxes className="h-4 w-4" />}
            </Button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={manualDownload} disabled={isSyncing || !isOnline} className="h-9 w-9 rounded-lg hover:bg-primary/10 text-white/40 hover:text-primary"><Download className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Pull from Cloud</TooltipContent></Tooltip></TooltipProvider>
            <div className="w-px h-4 bg-white/10 mx-1" /><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={manualUpload} disabled={isSyncing || !isOnline} className="h-9 w-9 rounded-lg hover:bg-primary/10 text-white/40 hover:text-primary"><Upload className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Push to Cloud</TooltipContent></Tooltip></TooltipProvider>
          </div>

          <div className="flex items-center justify-end flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {!isSearchExpanded ? (
                <Button variant="outline" size="icon" onClick={handleExpandSearch} className="h-10 w-10 rounded-lg border-white/10 bg-white/5 hover:bg-primary/10 text-primary shrink-0"><Search className="h-4 w-4" /></Button>
              ) : (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: isMobile ? "100%" : "280px", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="relative group min-w-[120px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
                  <Input ref={searchInputRef} placeholder="Search..." value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} onBlur={() => !searchTerm && setIsSearchExpanded(false)} className="h-10 pl-9 pr-8 rounded-lg bg-white/[0.05] border-2 border-primary/20 text-white text-xs focus:border-primary" />
                  <button onClick={() => { setSearchTerm(''); setIsSearchExpanded(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"><X className="h-3.5 w-3.5" /></button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="outline" size="icon" onClick={() => setIsFormOpen(true)} className="h-10 w-10 rounded-lg border-primary/20 bg-primary/5 text-primary"><Plus className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => setIsFilterOpen(true)} className={cn("h-10 w-10 rounded-lg border-white/10 bg-white/5 text-primary relative", filters.length > 0 && "border-primary/40")}>
              <ListFilter className="h-4 w-4" />
              {filters.length > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-black text-[8px] font-black rounded-full flex items-center justify-center border-2 border-black">{filters.length}</span>}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setIsSortOpen(true)} className="h-10 w-10 rounded-lg border-white/10 bg-white/5 text-primary"><ArrowUpDown className="h-4 w-4" /></Button>
            {!isMobile && (
              <Button variant="outline" size="icon" onClick={() => setIsHeaderManagerOpen(true)} className="h-10 w-10 rounded-lg border-white/10 bg-white/5 text-primary"><Settings2 className="h-4 w-4" /></Button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-navigation & Pill Indicators */}
      <div className="px-1 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 pb-2">
        <Badge variant="outline" className="h-7 px-3 rounded-full border-primary/20 bg-primary/5 text-primary font-black uppercase text-[8px] tracking-widest whitespace-nowrap shrink-0">{processedAssets.length} Records</Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-7 px-3 rounded-full border-white/10 bg-white/5 text-white/40 font-black uppercase text-[8px] tracking-widest whitespace-nowrap gap-1.5 hover:text-white hover:border-primary/20 transition-all shrink-0">
              <FolderOpen className="h-3 w-3 text-primary opacity-60" />
              Group: {selectedCategory || 'Overall'}
              <ChevronDown className="h-2.5 w-2.5 opacity-40" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-black border-white/10 rounded-xl p-1 shadow-3xl text-white">
            <DropdownMenuItem onClick={() => setSelectedCategory(null)} className="rounded-lg p-2 focus:bg-primary/10 gap-2"><Database className="h-3.5 w-3.5 opacity-40" /><span className="text-[10px] font-black uppercase">Overall Registry</span></DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <ScrollArea className="h-48">{categories.map(cat => <DropdownMenuItem key={cat} onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }} className="rounded-lg p-2 focus:bg-primary/10 gap-2"><Boxes className="h-3.5 w-3.5 opacity-40" /><span className="text-[10px] font-black uppercase truncate">{cat}</span></DropdownMenuItem>)}</ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Primary Registry Grid / Table */}
      <div className="flex-1 min-h-0 px-1">
        {viewMode === 'grid' ? (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 pb-40">
            <AnimatePresence mode="popLayout">
              {paginatedAssets.map(asset => (
                <motion.div key={asset.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} layout>
                  <RegistryCard 
                    record={transformAssetToRecord(asset, headers, appSettings?.sourceBranding)} 
                    onInspect={handleInspect} 
                    selected={selectedAssetIds.has(asset.id)} 
                    onToggleSelect={handleToggleSelect} 
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <RegistryTable 
            records={paginatedAssets.map(a => transformAssetToRecord(a, headers, appSettings?.sourceBranding))}
            onInspect={handleInspect}
            selectedIds={selectedAssetIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={(checked) => setSelectedAssetIds(checked ? new Set(paginatedAssets.map(a => a.id)) : new Set())}
          />
        )}
        
        {processedAssets.length === 0 && (
          <div className="py-24 text-center opacity-20 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center gap-4">
            <Database className="h-12 w-12 text-white" />
            <h3 className="text-lg font-black uppercase tracking-widest text-white">Registry Silent</h3>
          </div>
        )}
      </div>

      {/* Floating Interactive Controls */}
      <div className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 z-50 flex flex-col items-center gap-3">
        {Math.ceil(processedAssets.length / ITEMS_PER_PAGE) > 1 && (
          <div className="bg-[#0A0A0A]/90 border border-white/10 rounded-full px-4 py-1.5 shadow-2xl backdrop-blur-xl flex items-center gap-4 scale-90 sm:scale-100">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1 text-white/40 hover:text-primary disabled:opacity-5"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/60">P.{currentPage} / {Math.ceil(processedAssets.length / ITEMS_PER_PAGE)}</span>
            <button disabled={currentPage === Math.ceil(processedAssets.length / ITEMS_PER_PAGE)} onClick={() => setCurrentPage(p + 1)} className="p-1 text-white/40 hover:text-primary disabled:opacity-5"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
        
        <AnimatePresence>
          {selectedAssetIds.size > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 30 }} 
              className="w-full sm:w-auto bg-[#0A0A0A]/95 border-2 border-primary/20 rounded-2xl p-2 flex items-center justify-between sm:justify-start gap-4 shadow-3xl backdrop-blur-3xl"
            >
              <div className="flex items-center gap-2 pl-2">
                <div className="h-7 w-7 bg-primary rounded-full flex items-center justify-center text-black font-black text-[9px]">{selectedAssetIds.size}</div>
                <span className="text-[9px] font-black uppercase text-white hidden sm:inline">Selected</span>
              </div>
              <div className="h-6 w-px bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => setIsBatchEditOpen(true)} className="h-9 px-3 sm:px-4 rounded-lg font-black uppercase text-[9px] gap-2 text-white/60 hover:text-white">
                  <Edit3 className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Edit</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDeleteSelected} className="h-9 px-3 sm:px-4 rounded-lg font-black uppercase text-[9px] gap-2 text-destructive/60 hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Delete</span>
                </Button>
              </div>
              <button onClick={() => setSelectedAssetIds(new Set())} className="p-1.5 text-white/20 hover:text-white transition-all"><X className="h-4 w-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AssetDetailSheet 
        isOpen={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        record={selectedRecord} 
        onEdit={(id) => { setSelectedAssetId(id); setIsFormOpen(true); setIsDetailOpen(false); }} 
        onNext={handleNext} 
        onPrevious={handlePrevious} 
      />
      
      <AssetForm 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        asset={activeAssets.find(a => a.id === selectedAssetId)} 
        isReadOnly={false} 
        onSave={async (a) => { await enqueueMutation('UPDATE', 'assets', a); await refreshRegistry(); setIsFormOpen(false); }} 
      />
      
      <AssetBatchEditForm 
        isOpen={isBatchEditOpen} 
        onOpenChange={setIsBatchEditOpen} 
        selectedAssetCount={selectedAssetIds.size} 
        onSave={async (data) => { 
          for (const id of Array.from(selectedAssetIds)) { 
            const asset = activeAssets.find(a => a.id === id); 
            if (asset) await enqueueMutation('UPDATE', 'assets', { ...asset, ...data }); 
          } 
          await refreshRegistry(); 
          setSelectedAssetIds(new Set()); 
        }} 
      />
      
      <HeaderManagerDrawer isOpen={isHeaderManagerOpen} onOpenChange={setIsHeaderManagerOpen} headers={headers} onUpdateHeaders={setHeaders} onReset={() => {}} />
      <FilterDrawer isOpen={isFilterOpen} onOpenChange={setIsFilterOpen} headers={headers} activeFilters={filters} onUpdateFilters={setFilters} optionsMap={optionsMap} />
      <SortDrawer isOpen={isSortOpen} onOpenChange={setIsSortOpen} headers={headers} sortBy={sortKey} sortDirection={sortDir} onUpdateSort={(k, dir) => { setSortKey(k); setSortDir(dir); }} />
    </div>
  );
}