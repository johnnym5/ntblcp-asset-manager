'use client';

/**
 * @fileOverview Asset Hub - Main Registry Workstation.
 * Phase 600: Restored Filter Logic trigger and high-density operational header.
 * Phase 601: Optimized for responsive dossier navigation.
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
  Search,
  ArrowUpDown,
  ChevronRight,
  ChevronDown,
  ClipboardCheck,
  Plus,
  MoreVertical,
  Type,
  RefreshCw,
  ListFilter,
  Filter,
  Eye,
  Settings2,
  ArrowLeft,
  LayoutGrid,
  CloudUpload,
  Download,
  FileDown,
  EyeOff,
  GitMerge,
  Columns,
  Zap,
  CheckCircle2,
  Activity,
  ArrowRightLeft
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { RegistryTable } from '@/components/registry/RegistryTable';
import { AssetDetailSheet } from '@/components/registry/AssetDetailSheet';
import AssetForm from '@/components/asset-form';
import { FilterDrawer } from '@/components/registry/FilterDrawer';
import { SortDrawer } from '@/components/registry/SortDrawer';
import { HeaderManagerDrawer } from '@/components/registry/HeaderManagerDrawer';
import { PaginationControls } from '@/components/pagination-controls';
import { transformAssetToRecord } from '@/lib/registry-utils';
import { cn, sanitizeSearch } from '@/lib/utils';
import { enqueueMutation } from '@/offline/queue';
import { storage } from '@/offline/storage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addNotification } from '@/hooks/use-notifications';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExcelService } from '@/services/excel-service';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { FirestoreService } from '@/services/firebase/firestore';
import { CategoryBatchEditForm, type CategoryBatchUpdateData } from '@/components/category-batch-edit-form';
import type { Asset } from '@/types/domain';

export function RegistryWorkstation({ viewAll = false }: { viewAll?: boolean }) {
  const { 
    filteredAssets,
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
    isExplored,
    setIsExplored,
    isOnline,
    activeGrantId,
    filters,
    setFilters,
    isFilterOpen,
    setIsFilterOpen,
    isLogicFilterOpen,
    setIsLogicFilterOpen,
    isSortOpen,
    setIsSortOpen,
    itemsPerPage,
    setItemsPerPage,
    activeFilterCount,
    goBack,
    manualDownload
  } = useAppState();
  
  const { userProfile } = useAuth();
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHeaderManagerOpen, setIsHeaderManagerOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Category Actions State
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [targetMergeCategory, setTargetMergeCategory] = useState<string>('');
  
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [categoryToRename, setCategoryToRename] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [categoriesToPurge, setCategoriesToPurge] = useState<string[]>([]);

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const activeGrant = useMemo(() => appSettings?.grants.find(g => g.id === activeGrantId), [appSettings, activeGrantId]);

  const optionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    headers.forEach(header => {
      const uniqueValues = new Set<string>();
      filteredAssets.forEach(asset => {
        let val: any = "";
        switch(header.normalizedName) {
          case "sn": val = asset.sn; break;
          case "location": val = asset.location; break;
          case "asset_description": val = asset.description; break;
          case "asset_id_code": val = asset.assetIdCode; break;
          case "asset_class": val = asset.category; break;
          case "condition": val = asset.condition; break;
          default:
            val = (asset.metadata as any)?.[header.rawName] || (asset.metadata as any)?.[header.normalizedName];
        }
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          uniqueValues.add(String(val).trim());
        }
      });
      map[header.id] = Array.from(uniqueValues).sort();
    });
    return map;
  }, [filteredAssets, headers]);

  const groupStats = useMemo(() => {
    const stats: Record<string, { total: number, verified: number }> = {};
    filteredAssets.forEach(a => {
      const cat = a.category || 'Uncategorized';
      if (!stats[cat]) stats[cat] = { total: 0, verified: 0 };
      stats[cat].total++;
      if (a.status === 'VERIFIED') stats[cat].verified++;
    });
    return stats;
  }, [filteredAssets]);

  const categories = useMemo(() => {
    if (!activeGrant) return [];
    const allInProject = Object.keys(activeGrant.sheetDefinitions || {}).sort();
    return allInProject.filter(cat => {
      const stats = groupStats[cat];
      const hasData = stats && stats.total > 0;
      const isManuallyEnabled = appSettings?.enabledSheets?.includes(cat);
      return hasData || isManuallyEnabled;
    });
  }, [activeGrant, groupStats, appSettings?.enabledSheets]);

  const processedAssets = useMemo(() => {
    let results = [...filteredAssets];
    if (selectedCategories.length > 0) results = results.filter(a => selectedCategories.includes(a.category));
    
    if (sortKey) {
      const sortHeader = headers.find(h => h.id === sortKey);
      results.sort((a, b) => {
        const getVal = (item: Asset) => {
          if (!sortHeader) return "";
          switch(sortHeader.normalizedName) {
            case "sn": return item.sn || "";
            case "asset_description": return item.description || "";
            default: return String((item.metadata as any)?.[sortHeader.rawName] || (item.metadata as any)?.[sortHeader.normalizedName] || "");
          }
        };
        const valA = String(getVal(a));
        const valB = String(getVal(b));
        return sortDir === 'asc' ? valA.localeCompare(valB, undefined, { numeric: true }) : valB.localeCompare(valA, undefined, { numeric: true });
      });
    }
    return results;
  }, [filteredAssets, sortKey, sortDir, selectedCategories, headers]);

  const totalPages = useMemo(() => itemsPerPage === 'all' ? 1 : Math.ceil(processedAssets.length / itemsPerPage), [processedAssets.length, itemsPerPage]);
  const paginatedAssets = useMemo(() => itemsPerPage === 'all' ? processedAssets : processedAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [processedAssets, currentPage, itemsPerPage]);

  const handleInspect = (id: string) => { setSelectedAssetId(id); setIsDetailOpen(true); };
  const handleToggleSelect = (id: string) => { const next = new Set(selectedAssetIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedAssetIds(next); };
  
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) setSelectedAssetIds(new Set(processedAssets.map(a => a.id)));
    else setSelectedAssetIds(new Set());
  }, [processedAssets]);

  const handleExploreFolder = (cat: string) => {
    setSelectedCategories([cat]);
    setIsExplored(true);
    setCurrentPage(1);
  };

  const handleToggleCategorySelection = (cat: string) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter(c => c !== cat)
      : [...selectedCategories, cat];
    setSelectedCategories(next);
  };

  const handleSaveCategoryBatchEdit = async (data: CategoryBatchUpdateData) => {
    setIsProcessing(true);
    try {
      const targetAssets = filteredAssets.filter(a => selectedCategories.includes(a.category));
      for (const asset of targetAssets) {
        const updated = {
          ...asset,
          ...(data.status && { status: data.status.toUpperCase() as any }),
          ...(data.condition && { condition: data.condition }),
          ...(data.description && { description: data.description }),
          lastModified: new Date().toISOString(),
          lastModifiedBy: userProfile?.displayName || 'Batch Processor'
        };
        await enqueueMutation('UPDATE', 'assets', updated);
      }
      await refreshRegistry();
      addNotification({ title: "Batch Update Applied", variant: "success" });
    } finally {
      setIsProcessing(false);
      setIsBatchEditOpen(false);
    }
  };

  const handleExportCategories = async () => {
    try {
      const assetsToExport = filteredAssets.filter(a => selectedCategories.includes(a.category));
      await ExcelService.exportRegistry(assetsToExport, headers);
      addNotification({ title: "Excel Export Complete", variant: "success" });
    } catch (e) {
      addNotification({ title: "Export Failed", variant: "destructive" });
    }
  };

  const handleHideCategories = async () => {
    if (!appSettings) return;
    const nextEnabled = appSettings.enabledSheets.filter(s => !selectedCategories.includes(s));
    const next = { ...appSettings, enabledSheets: nextEnabled };
    await storage.saveSettings(next);
    if (isOnline) await FirestoreService.updateSettings(next);
    setAppSettings(next);
    setSelectedCategories([]);
    addNotification({ title: "Folders Hidden" });
  };

  const handleMergeCategories = async () => {
    if (!targetMergeCategory) return;
    setIsProcessing(true);
    try {
      const assetsToMerge = filteredAssets.filter(a => selectedCategories.includes(a.category));
      for (const asset of assetsToMerge) {
        await enqueueMutation('UPDATE', 'assets', { ...asset, category: targetMergeCategory });
      }
      await refreshRegistry();
      setSelectedCategories([]);
      setIsMergeDialogOpen(false);
      addNotification({ title: `Merged into ${targetMergeCategory}`, variant: "success" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncUnverified = async () => {
    if (!isOnline) {
      addNotification({ title: "Offline Pulse Locked", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      await manualDownload();
      addNotification({ title: "Unverified Pulse Reconciled", description: "Updated regional unverified records." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecutePurge = async () => {
    if (categoriesToPurge.length === 0) return;
    setIsProcessing(true);
    try {
      const idsToDelete = filteredAssets.filter(a => categoriesToPurge.includes(a.category)).map(a => a.id);
      for (const id of idsToDelete) await enqueueMutation('DELETE', 'assets', { id });
      const currentLocal = await storage.getAssets();
      await storage.saveAssets(currentLocal.filter(a => !idsToDelete.includes(a.id)));
      await refreshRegistry();
      setSelectedCategories([]);
      setIsPurgeDialogOpen(false);
      addNotification({ title: "Folder Removed", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedRecord = useMemo(() => {
    if (!selectedAssetId) return undefined;
    const asset = filteredAssets.find(a => a.id === selectedAssetId);
    return asset ? transformAssetToRecord(asset, headers, appSettings?.sourceBranding) : undefined;
  }, [selectedAssetId, filteredAssets, headers, appSettings?.sourceBranding]);

  const showList = isExplored || viewAll;

  return (
    <div className="space-y-4 h-full flex flex-col relative">
      {/* 1. Dynamic Workstation Header */}
      <div className="sticky top-[-1rem] sm:top-[-2rem] lg:top-[-2.5rem] z-40 bg-background/95 backdrop-blur-2xl pt-2 pb-4 px-1 border-b border-border mb-4 -mx-1 shrink-0">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-3 self-start">
            <AnimatePresence mode="wait">
              {showList ? (
                <motion.button
                  key="back-btn"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={goBack}
                  className="h-10 w-10 flex items-center justify-center bg-muted/50 hover:bg-muted border border-border rounded-xl transition-all"
                >
                  <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                </motion.button>
              ) : (
                <div key="logo-icon" className="p-2 bg-primary/10 rounded-xl shadow-inner border border-primary/5">
                  <Database className="h-5 w-5 text-primary" />
                </div>
              )}
            </AnimatePresence>
            
            <div className="space-y-0.5">
              <h2 className="text-lg font-black uppercase text-foreground tracking-tight leading-none">
                {showList ? selectedCategories[0] : (activeGrant?.name || 'Asset Hub')}
              </h2>
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                {showList 
                  ? `${groupStats[selectedCategories[0]]?.total || 0} RECORDS IN THIS FOLDER` 
                  : `${filteredAssets.length} TOTAL ASSETS IN SCOPE`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
            {!showList && (
              <div className="flex items-center gap-3 pr-4 border-r border-border shrink-0">
                <Checkbox id="sel-all-hub" checked={selectedCategories.length === categories.length && categories.length > 0} onCheckedChange={(c) => setSelectedCategories(c ? categories : [])} className="h-5 w-5 rounded-lg border-2 border-border data-[state=checked]:bg-primary" />
                <label htmlFor="sel-all-hub" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer">Select All</label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {!isSearchExpanded ? (
                  <Button variant="outline" size="icon" onClick={() => setIsSearchExpanded(true)} className="h-10 w-10 rounded-lg border-border bg-muted/50 text-primary shrink-0"><Search className="h-4 w-4" /></Button>
                ) : (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: "220px", sm: "280px", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
                    <Input ref={searchInputRef} placeholder="Find assets..." value={searchTerm} onChange={(e) => setSearchTerm(sanitizeSearch(e.target.value))} onBlur={() => !searchTerm && setIsSearchExpanded(false)} className="h-10 pl-9 pr-8 rounded-lg bg-muted/50 border-2 border-primary/20 text-foreground text-xs focus:border-primary" />
                    <button onClick={() => { setSearchTerm(''); setIsSearchExpanded(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex items-center gap-1.5 shrink-0">
                {/* RESTORED FILTER ENGINE TRIGGER */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setIsLogicFilterOpen(true)} 
                        className="h-10 w-10 rounded-lg border-border bg-muted/50 text-primary relative"
                      >
                        <Filter className="h-4 w-4" />
                        {activeFilterCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-black text-black border-2 border-background shadow-lg">
                            {activeFilterCount}
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[8px] font-black uppercase">Logic Engine</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {showList && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => setIsHeaderManagerOpen(true)} className="h-10 w-10 rounded-lg border-border bg-muted/50 text-primary">
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-[8px] font-black uppercase">Field Setup</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {isAdmin && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => setIsFormOpen(true)} className="h-10 w-10 rounded-lg border-primary/20 bg-primary/5 text-primary">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-[8px] font-black uppercase">New Record</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => setIsSortOpen(true)} className="h-10 w-10 rounded-lg border-border bg-muted/50 text-primary">
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[8px] font-black uppercase">Sort Pulse</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Workstation Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pt-4 pb-safe">
        {!showList ? (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 pb-40">
            {categories.map(cat => (
              <Card 
                key={cat} 
                onClick={() => handleToggleCategorySelection(cat)}
                className={cn(
                  "bg-card border-2 rounded-3xl overflow-hidden group hover:border-primary/40 transition-all shadow-xl flex flex-col p-6 relative cursor-pointer", 
                  selectedCategories.includes(cat) ? "border-primary/40 bg-primary/[0.02]" : "border-border"
                )}
              >
                <div className="absolute top-4 left-4 z-20">
                  <Checkbox checked={selectedCategories.includes(cat)} onCheckedChange={(c) => handleToggleCategorySelection(cat)} className="h-5 w-5 rounded-lg border-2 border-border data-[state=checked]:bg-primary" />
                </div>
                <div className="flex justify-between items-start mb-8 pl-8">
                  <h3 className="text-sm font-black uppercase text-foreground tracking-tight leading-none truncate pr-4">{cat}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button className="h-6 w-6 flex items-center justify-center text-muted-foreground/40 hover:text-foreground" onClick={(e) => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border text-foreground p-1">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setCategoryToRename(cat); setNewCategoryName(cat); setIsRenameDialogOpen(true); }} className="gap-2 p-2 rounded-lg focus:bg-primary/10"><Type className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Rename Folder</span></DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExploreFolder(cat); }} className="gap-2 p-2 rounded-lg focus:bg-primary/10"><ChevronRight className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Open Folder</span></DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setCategoriesToPurge([cat]); setIsPurgeDialogOpen(true); }} className="gap-2 p-2 rounded-lg focus:bg-destructive/10 text-destructive/60"><Trash2 className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Delete Folder</span></DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-1 mb-8 pl-8">
                  <p className="text-4xl font-black tracking-tighter text-foreground">{groupStats[cat]?.total || 0}</p>
                  <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em]">RECORDS DISCOVERED</p>
                </div>
                <Button 
                  onClick={(e) => { e.stopPropagation(); handleExploreFolder(cat); }} 
                  variant="outline" 
                  className="w-full h-12 mt-auto rounded-xl border-border text-foreground font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-muted transition-all"
                >
                  Explore Folder <ChevronRight className="h-3 w-3" />
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className={viewMode === 'grid' ? "grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 pb-10" : ""}>
              <AnimatePresence mode="popLayout">
                {viewMode === 'grid' ? paginatedAssets.map(asset => (
                  <motion.div key={asset.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <RegistryCard record={transformAssetToRecord(asset, headers, appSettings?.sourceBranding)} onInspect={handleInspect} selected={selectedAssetIds.has(asset.id)} onToggleSelect={handleToggleSelect} />
                  </motion.div>
                )) : (
                  <RegistryTable records={paginatedAssets.map(a => transformAssetToRecord(a, headers, appSettings?.sourceBranding))} onInspect={handleInspect} selectedIds={selectedAssetIds} onToggleSelect={handleToggleSelect} onSelectAll={handleSelectAll} />
                )}
              </AnimatePresence>
            </div>
            <div className="mt-auto pt-8 border-t border-border">
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} totalItems={processedAssets.length} />
            </div>
          </div>
        )}
      </div>

      {/* 3. Floating Action Bar - Expanded Operational Command Pulse */}
      <AnimatePresence>
        {selectedCategories.length > 0 && !showList && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-background/95 border-2 border-primary/20 rounded-2xl p-2.5 flex flex-wrap items-center justify-center gap-4 sm:gap-6 shadow-3xl backdrop-blur-3xl w-[90vw] sm:w-auto">
            <div className="flex items-center gap-3 pl-3">
              <div className="h-7 w-7 bg-primary rounded-full flex items-center justify-center text-black font-black text-[9px]">{selectedCategories.length}</div>
              <span className="text-[9px] font-black uppercase text-foreground tracking-widest hidden sm:inline">Folders Selected</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setIsExplored(true)} className="h-9 px-4 rounded-lg font-black uppercase text-[9px] gap-2 text-primary hover:bg-primary/10">
                <Eye className="h-3.5 w-3.5" /> <span className="hidden xs:inline">View</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 px-4 rounded-lg font-black uppercase text-[9px] gap-2 text-foreground hover:bg-muted">
                    <Edit3 className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Bulk</span> <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 bg-card border-border text-foreground p-1">
                  <DropdownMenuItem onClick={() => setIsBatchEditOpen(true)} className="gap-2 p-2 rounded-lg"><ClipboardCheck className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Edit Descriptions/Status</span></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSyncUnverified} className="gap-2 p-2 rounded-lg"><Activity className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Sync Unverified only</span></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 px-4 rounded-lg font-black uppercase text-[9px] gap-2 text-foreground hover:bg-muted">
                    <RefreshCw className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Sync</span> <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 bg-card border-border text-foreground p-1">
                  <DropdownMenuItem onClick={() => addNotification({ title: "Uploading Selection..." })} className="gap-2 p-2 rounded-lg"><CloudUpload className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Upload to Cloud</span></DropdownMenuItem>
                  <DropdownMenuItem onClick={manualDownload} className="gap-2 p-2 rounded-lg"><Download className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Download from Cloud</span></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 px-4 rounded-lg font-black uppercase text-[9px] gap-2 text-foreground hover:bg-muted">
                    <LayoutGrid className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Structure</span> <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 bg-card border-border text-foreground p-1">
                  <DropdownMenuItem onClick={() => setIsHeaderManagerOpen(true)} className="gap-2 p-2 rounded-lg"><Columns className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Manage Headers</span></DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsMergeDialogOpen(true)} className="gap-2 p-2 rounded-lg"><GitMerge className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Merge with Folder</span></DropdownMenuItem>
                  <DropdownMenuItem onClick={handleHideCategories} className="gap-2 p-2 rounded-lg"><EyeOff className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Hide Folders</span></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="sm" onClick={handleExportCategories} className="h-9 px-4 rounded-lg font-black uppercase text-[9px] gap-2 text-green-600 hover:bg-green-500/10">
                <FileDown className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Excel</span>
              </Button>

              <div className="w-px h-6 bg-border mx-2 hidden sm:block" />

              <Button variant="ghost" size="sm" onClick={() => setSelectedCategories([])} className="h-9 w-9 p-0 rounded-lg text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AssetDetailSheet isOpen={isDetailOpen} onOpenChange={setIsDetailOpen} record={selectedRecord} onEdit={(id) => { setSelectedAssetId(id); setIsFormOpen(true); setIsDetailOpen(false); }} />
      <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={filteredAssets.find(a => a.id === selectedAssetId)} isReadOnly={false} onSave={async (a) => { await enqueueMutation('UPDATE', 'assets', a); await refreshRegistry(); setIsFormOpen(false); }} />
      <HeaderManagerDrawer isOpen={isHeaderManagerOpen} onOpenChange={setIsHeaderManagerOpen} headers={headers} onUpdateHeaders={setHeaders} onReset={() => {}} />
      <CategoryBatchEditForm isOpen={isBatchEditOpen} onOpenChange={setIsBatchEditOpen} selectedCategoryCount={selectedCategories.length} onSave={handleSaveCategoryBatchEdit} />
      
      {/* Merge Logic Dialog */}
      <Dialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
        <DialogContent className="max-w-md bg-background border-border rounded-[2.5rem] p-8 shadow-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Merge Folders</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Structural consolidation pulse</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <Label className="text-[10px] font-black uppercase text-primary">Destination Folder</Label>
            <Select value={targetMergeCategory} onValueChange={setTargetMergeCategory}>
              <SelectTrigger className="h-12 rounded-xl border-2 font-black uppercase text-xs">
                <SelectValue placeholder="Select target..." />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10">
                {categories.filter(c => !selectedCategories.includes(c)).map(cat => (
                  <SelectItem key={cat} value={cat} className="text-[9px] font-bold uppercase">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsMergeDialogOpen(false)} className="font-bold uppercase text-[10px]">Cancel</Button>
            <Button onClick={handleMergeCategories} disabled={!targetMergeCategory || isProcessing} className="h-12 px-8 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest">
              {isProcessing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <GitMerge className="h-4 w-4 mr-2" />}
              Commit Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="max-w-md bg-background border-border text-foreground p-8 rounded-[2.5rem]">
          <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight">Rename Folder</DialogTitle></DialogHeader>
          <div className="py-6 space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary">New Folder Label</Label>
            <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="h-12 bg-muted/50 border-border rounded-xl font-black uppercase text-sm" />
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setIsRenameDialogOpen(false)} className="h-12 px-6 rounded-xl font-black uppercase text-[10px] text-muted-foreground">Cancel</Button>
            <Button onClick={handleRenameCommit} disabled={isProcessing || !newCategoryName.trim()} className="h-12 px-10 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">{isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Save Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 bg-background p-10">
          <AlertDialogHeader className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit"><X className="h-10 w-10 text-destructive" /></div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-destructive">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed italic text-muted-foreground">This will permanently delete {categoriesToPurge.length} folders and all records within them from both local and cloud storage. This action is irreversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogAction onClick={handleExecutePurge} disabled={isProcessing} className="h-12 px-10 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-destructive/30 bg-destructive text-white m-0">{isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin mr-2" /> : <Trash2 className="mr-2 h-4 w-4 mr-2" />} Confirm Deletion</AlertDialogAction>
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 border-border m-0 hover:bg-muted">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FilterDrawer isOpen={isLogicFilterOpen} onOpenChange={setIsLogicFilterOpen} headers={headers} activeFilters={filters} onUpdateFilters={setFilters} optionsMap={optionsMap} />
      <SortDrawer isOpen={isSortOpen} onOpenChange={setIsSortOpen} headers={headers} sortBy={sortKey} sortDirection={sortDir} onUpdateSort={(k, dir) => { setSortKey(k); setSortDir(dir); }} />
    </div>
  );

  async function handleRenameCommit() {
    if (!categoryToRename || !newCategoryName.trim() || !appSettings || !activeGrant) return;
    setIsProcessing(true);
    try {
      const assetsToUpdate = filteredAssets.filter(a => a.category === categoryToRename);
      for (const asset of assetsToUpdate) await enqueueMutation('UPDATE', 'assets', { ...asset, category: newCategoryName.trim() });
      const nextSettings = { ...appSettings, grants: appSettings.grants.map(g => g.id === activeGrantId ? { ...g, sheetDefinitions: { ...g.sheetDefinitions, [newCategoryName.trim()]: { ...g.sheetDefinitions[categoryToRename], name: newCategoryName.trim() } } } : g) };
      await storage.saveSettings(nextSettings);
      if (isOnline) await FirestoreService.updateSettings(nextSettings);
      setAppSettings(nextSettings);
      await refreshRegistry();
      setIsRenameDialogOpen(false);
      addNotification({ title: "Folder Renamed", variant: "success" });
    } finally {
      setIsProcessing(false);
    }
  }
}
