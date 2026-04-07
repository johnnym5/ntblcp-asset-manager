'use client';

/**
 * @fileOverview RegistryWorkstation - Technical Inventory Browser.
 * Phase 1013: Upgraded to multi-select Group Orchestrator with metrics and renaming.
 * Phase 1014: Optimized Sticky Header Pulse for enclosed workstation cage.
 * Phase 1015: Added Grid View Select All logic.
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
  Plus,
  Check,
  MoreVertical,
  Type,
  Globe,
  CloudOff
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { FirestoreService } from '@/services/firebase/firestore';
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
    setAppSettings,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    selectedCategories,
    setSelectedCategories,
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
  
  // Category Management State
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [categoryToRename, setCategoryToRename] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const isVerificationMode = appSettings?.appMode === 'verification';

  const activeGrant = useMemo(() => appSettings?.grants.find(g => g.id === activeGrantId), [appSettings, activeGrantId]);
  const categories = useMemo(() => Object.keys(activeGrant?.sheetDefinitions || {}).sort(), [activeGrant]);

  const activeAssets = useMemo(() => dataSource === 'PRODUCTION' ? assets : sandboxAssets, [dataSource, assets, sandboxAssets]);

  const groupStats = useMemo(() => {
    const stats: Record<string, { total: number, verified: number }> = {};
    activeAssets.forEach(a => {
      const cat = a.category || 'Uncategorized';
      if (!stats[cat]) stats[cat] = { total: 0, verified: 0 };
      stats[cat].total++;
      if (a.status === 'VERIFIED') stats[cat].verified++;
    });
    return stats;
  }, [activeAssets]);

  const selectionMetrics = useMemo(() => {
    const stats = { total: 0, verified: 0 };
    const targetAssets = selectedCategories.length > 0 
      ? activeAssets.filter(a => selectedCategories.includes(a.category))
      : activeAssets;
    
    targetAssets.forEach(a => {
      stats.total++;
      if (a.status === 'VERIFIED') stats.verified++;
    });
    return stats;
  }, [activeAssets, selectedCategories]);

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
    if (selectedCategories.length > 0) results = results.filter(a => selectedCategories.includes(a.category));
    
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
  }, [activeAssets, searchTerm, sortKey, sortDir, selectedCategories, filters, headers]);

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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssetIds(new Set(processedAssets.map(a => a.id)));
    } else {
      setSelectedAssetIds(new Set());
    }
  };

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

  const toggleCategorySelection = (cat: string) => {
    const next = new Set(selectedCategories);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    setSelectedCategories(Array.from(next));
    setCurrentPage(1);
  };

  const handleRenameGroup = async () => {
    if (!categoryToRename || !newCategoryName.trim() || !appSettings || !activeGrantId) return;
    setIsProcessing(true);
    try {
      const assetsToUpdate = activeAssets.filter(a => a.category === categoryToRename);
      for (const asset of assetsToUpdate) {
        await enqueueMutation('UPDATE', 'assets', { ...asset, category: newCategoryName });
      }
      
      const nextSettings = { ...appSettings };
      const grantIdx = nextSettings.grants.findIndex(g => g.id === activeGrantId);
      if (grantIdx > -1) {
        const defs = { ...nextSettings.grants[grantIdx].sheetDefinitions };
        if (defs[categoryToRename]) {
          defs[newCategoryName] = { ...defs[categoryToRename], name: newCategoryName };
          delete defs[categoryToRename];
          nextSettings.grants[grantIdx].sheetDefinitions = defs;
        }
      }
      
      await storage.saveSettings(nextSettings);
      if (isOnline) await FirestoreService.updateSettings(nextSettings);
      setAppSettings(nextSettings);
      await refreshRegistry();
      toast({ title: "Group Renamed" });
      setIsRenameDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const allInViewSelected = processedAssets.length > 0 && processedAssets.every(a => selectedAssetIds.has(a.id));

  return (
    <div className="space-y-4 h-full flex flex-col animate-in fade-in duration-700 relative">
      
      {/* 
          Workstation Sticky Header Pulse:
          Persistent within the windowed cage during scrolling.
      */}
      <div className="sticky top-[-1rem] sm:top-[-2rem] lg:top-[-2.5rem] z-40 bg-[#050505]/95 backdrop-blur-2xl pt-2 pb-4 px-1 border-b border-white/5 mb-4 -mx-1">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
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

        {/* Multifunctional Group Selector Pulse */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2">
          {viewMode === 'grid' && (
            <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-full border border-white/5 mr-2 shrink-0">
              <Checkbox 
                id="grid-select-all" 
                checked={allInViewSelected} 
                onCheckedChange={handleSelectAll}
                className="h-4 w-4 rounded-full border-white/20"
              />
              <label htmlFor="grid-select-all" className="text-[8px] font-black uppercase tracking-widest text-white/40 cursor-pointer pr-1">Mark All</label>
            </div>
          )}

          <Badge variant="outline" className="h-7 px-3 rounded-full border-primary/20 bg-primary/5 text-primary font-black uppercase text-[8px] tracking-widest whitespace-nowrap shrink-0">{processedAssets.length} Records</Badge>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-7 px-3 rounded-full border-white/10 bg-white/5 text-white/40 font-black uppercase text-[8px] tracking-widest whitespace-nowrap gap-1.5 hover:text-white hover:border-primary/20 transition-all shrink-0">
                <FolderOpen className="h-3 w-3 text-primary opacity-60" />
                {selectedCategories.length === 0 ? 'Overall Register' : 
                 selectedCategories.length === 1 ? `Group: ${selectedCategories[0]}` : 
                 `${selectedCategories.length} Groups Selected`}
                
                {isVerificationMode && selectionMetrics.total > 0 && (
                  <div className="flex items-center gap-2 ml-2 border-l border-white/10 pl-2">
                    <span className="text-white/60 font-mono">{selectionMetrics.verified}/{selectionMetrics.total}</span>
                    <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(selectionMetrics.verified / selectionMetrics.total) * 100}%` }} />
                    </div>
                  </div>
                )}
                <ChevronDown className="h-2.5 w-2.5 opacity-40 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[320px] p-0 bg-[#0A0A0A] border-white/10 shadow-3xl overflow-hidden rounded-2xl">
              <div className="p-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Technical Containers</span>
                  <span className="text-[8px] font-bold text-white/20 uppercase">ORCHESTRATION PULSE</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCategories([])} className="h-7 px-2 text-[8px] font-black uppercase hover:bg-white/5">Clear Selection</Button>
              </div>
              
              <ScrollArea className="h-72">
                <div className="p-2 space-y-1">
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer" onClick={() => {
                    if (selectedCategories.length === categories.length) setSelectedCategories([]);
                    else setSelectedCategories(categories);
                  }}>
                    <Checkbox checked={selectedCategories.length === categories.length && categories.length > 0} onCheckedChange={(c) => {
                      if (c) setSelectedCategories(categories);
                      else setSelectedCategories([]);
                    }} className="h-4 w-4 border-white/20" />
                    <span className="text-[11px] font-black uppercase text-white/40">Select All Groups</span>
                  </div>
                  <div className="h-px bg-white/5 my-1" />
                  {categories.map(cat => {
                    const stats = groupStats[cat] || { total: 0, verified: 0 };
                    const isSelected = selectedCategories.includes(cat);
                    const percent = stats.total > 0 ? (stats.verified / stats.total) * 100 : 0;

                    return (
                      <div key={cat} className={cn("flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group", isSelected ? "bg-primary/10" : "hover:bg-white/5")}>
                        <Checkbox 
                          checked={isSelected} 
                          onCheckedChange={() => toggleCategorySelection(cat)}
                          className="h-4 w-4 border-white/20"
                        />
                        <div className="flex-1 min-w-0" onClick={() => toggleCategorySelection(cat)}>
                          <div className="flex items-center justify-between">
                            <span className={cn("text-[11px] font-black uppercase truncate pr-4 transition-colors", isSelected ? "text-primary" : "text-white/60")}>{cat}</span>
                            <span className="text-[9px] font-mono font-bold text-white/20 shrink-0">{stats.total}</span>
                          </div>
                          {isVerificationMode && (
                            <div className="mt-1.5 space-y-1">
                              <div className="flex justify-between text-[7px] font-black uppercase opacity-40">
                                <span>Coverage</span>
                                <span>{Math.round(percent)}%</span>
                              </div>
                              <Progress value={percent} className="h-0.5 bg-white/5" />
                            </div>
                          )}
                        </div>
                        
                        {isAdmin && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setCategoryToRename(cat); setNewCategoryName(cat); setIsRenameDialogOpen(true); }}
                            className="p-1.5 rounded-lg text-white/10 hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {selectedCategories.length > 0 && (
                <div className="p-4 bg-primary/5 border-t border-white/5 flex gap-2">
                  <Button onClick={() => setIsBatchEditOpen(true)} className="flex-1 h-9 rounded-xl bg-primary text-black font-black uppercase text-[9px] tracking-widest gap-2">
                    <Zap className="h-3.5 w-3.5 fill-current" /> Bulk Modify Groups
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Primary Registry Grid / Table */}
      <div className="flex-1 min-h-0 px-1 pt-4">
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
            onSelectAll={handleSelectAll}
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
          const targets = selectedAssetIds.size > 0 ? Array.from(selectedAssetIds) : activeAssets.filter(a => selectedCategories.includes(a.category)).map(a => a.id);
          for (const id of targets) { 
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
      
      {/* Rename Logic Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="max-w-md rounded-[2rem] border-primary/10 bg-black text-white p-8">
          <DialogHeader className="space-y-4">
            <div className="p-3 bg-primary/10 rounded-2xl w-fit"><Type className="h-8 w-8 text-primary" /></div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Rename Container</DialogTitle>
            <DialogDescription className="text-sm font-medium italic text-white/40 leading-relaxed">
              Modifying the group name will update the identity pulse for all {groupStats[categoryToRename!]?.total || 0} records in this technical block.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-2">
            <Label className="text-[10px] font-black uppercase text-white/20 tracking-widest pl-1">New Category Identity</Label>
            <Input 
              value={newCategoryName} 
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="h-14 rounded-xl bg-white/5 border-2 border-white/5 text-sm font-black uppercase focus:border-primary/40 transition-all"
            />
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setIsRenameDialogOpen(false)} className="h-12 rounded-xl font-bold">Cancel</Button>
            <Button 
              onClick={handleRenameGroup}
              disabled={isProcessing || !newCategoryName.trim() || newCategoryName === categoryToRename}
              className="h-12 px-8 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Commit Identity Pulse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
