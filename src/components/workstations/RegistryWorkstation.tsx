'use client';

/**
 * @fileOverview Asset Hub - Main Registry Workstation.
 * Phase 907: Integrated Tactile Menus for header actions.
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
  ArrowRightLeft,
  Maximize2,
  FileUp,
  Printer
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { RegistryTable } from '@/components/registry/RegistryTable';
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
import { AssetDossier } from '@/components/registry/AssetDossier';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
  SelectValue,
} from "@/components/ui/select";
import { FirestoreService } from '@/services/firebase/firestore';
import { CategoryBatchEditForm, type CategoryBatchUpdateData } from '@/components/category-batch-edit-form';
import { AssetBatchEditForm, type BatchUpdateData } from '@/components/asset-batch-edit-form';
import type { Asset } from '@/types/domain';
import { useIsMobile } from '@/hooks/use-mobile';
import { TactileMenu } from '@/components/TactileMenu';

export function RegistryWorkstation({ viewAll = false }: { viewAll?: boolean }) {
  const { 
    filteredAssets,
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
    isLogicFilterOpen,
    setIsLogicFilterOpen,
    isSortOpen,
    setIsSortOpen,
    itemsPerPage,
    setItemsPerPage,
    activeFilterCount,
    goBack,
    searchTerm,
    setSearchTerm,
    optionsMap = {}
  } = useAppState();
  
  const { userProfile } = useAuth();
  const isMobile = useIsMobile();
  
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHeaderEditingMode, setIsHeaderEditingMode] = useState(false);
  const [isHeaderManagerOpen, setIsHeaderManagerOpen] = useState(false);
  const [selectedAssetIdForEdit, setSelectedAssetIdForEdit] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [isCategoryBatchEditOpen, setIsCategoryBatchEditOpen] = useState(false);
  const [isAssetBatchEditOpen, setIsAssetBatchEditOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [targetMergeCategory, setTargetMergeCategory] = useState<string>('');
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [categoryToRename, setCategoryToRename] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [categoriesToPurge, setCategoriesToPurge] = useState<string[]>([]);
  const [isAssetDeleteOpen, setIsAssetDeleteOpen] = useState(false);

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const activeGrant = useMemo(() => appSettings?.grants.find(g => g.id === activeGrantId), [appSettings, activeGrantId]);

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
      return (stats && stats.total > 0) || appSettings?.enabledSheets?.includes(cat);
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
            default: return String((item.metadata as any)?.[sortHeader.rawName] || "");
          }
        };
        const valA = String(getVal(a));
        const valB = String(getVal(b));
        return sortDir === 'asc' ? valA.localeCompare(valB, undefined, { numeric: true }) : valB.localeCompare(valA, undefined, { numeric: true });
      });
    }
    return results;
  }, [filteredAssets, sortKey, sortDir, selectedCategories, headers]);

  const totalPages = useMemo(() => itemsPerPage === 'all' ? 1 : Math.ceil(processedAssets.length / (itemsPerPage as number)), [processedAssets.length, itemsPerPage]);
  const paginatedAssets = useMemo(() => itemsPerPage === 'all' ? processedAssets : processedAssets.slice((currentPage - 1) * (itemsPerPage as number), currentPage * (itemsPerPage as number)), [processedAssets, currentPage, itemsPerPage]);

  const showList = isExplored || viewAll;

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedAssetIds(new Set(processedAssets.map(a => a.id)));
    else setSelectedAssetIds(new Set());
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedAssetIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedAssetIds(next);
  };

  const handleToggleExpand = (id: string) => {
    setExpandedAssetId(expandedAssetId === id ? null : id);
    setIsHeaderEditingMode(false);
  };

  const handleEditAsset = (id: string) => {
    setSelectedAssetIdForEdit(id);
    setIsFormOpen(true);
  };

  const handleSaveAssetBatch = async (data: BatchUpdateData) => {
    setIsProcessing(true);
    try {
      const targetAssets = filteredAssets.filter(a => selectedAssetIds.has(a.id));
      for (const asset of targetAssets) {
        const updated = {
          ...asset,
          ...(data.status && { status: data.status.toUpperCase() as any }),
          ...(data.condition && { condition: data.condition }),
          ...(data.location && { location: data.location }),
          lastModified: new Date().toISOString(),
          lastModifiedBy: userProfile?.displayName || 'Batch Auditor'
        };
        await enqueueMutation('UPDATE', 'assets', updated);
      }
      await refreshRegistry();
      setSelectedAssetIds(new Set());
      addNotification({ title: "Batch Update Applied", variant: "success" });
    } finally {
      setIsProcessing(false);
      setIsAssetBatchEditOpen(false);
    }
  };

  const handleSaveCategoryBatchEdit = async (data: CategoryBatchUpdateData) => {
    addNotification({ title: "Folder pulse updated", variant: "success" });
    setIsCategoryBatchEditOpen(false);
  };

  const handleExploreFolder = (cat: string) => {
    setSelectedCategories([cat]);
    setIsExplored(true);
    setCurrentPage(1);
  };

  const handleMergeSelection = async () => {
    if (!targetMergeCategory) return;
    setIsProcessing(true);
    try {
      const targetAssets = filteredAssets.filter(a => selectedAssetIds.has(a.id));
      for (const asset of targetAssets) {
        const updated = {
          ...asset,
          category: targetMergeCategory,
          lastModified: new Date().toISOString(),
          lastModifiedBy: userProfile?.displayName || 'Registry Orchestrator'
        };
        await enqueueMutation('UPDATE', 'assets', updated);
      }
      await refreshRegistry();
      setSelectedAssetIds(new Set());
      setIsMergeDialogOpen(false);
      addNotification({ title: "Assets Merged", variant: "success" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRenameCategory = async () => {
    if (!categoryToRename || !newCategoryName.trim()) return;
    setIsProcessing(true);
    try {
      const affectedAssets = filteredAssets.filter(a => a.category === categoryToRename);
      for (const asset of affectedAssets) {
        const updated = {
          ...asset,
          category: newCategoryName.trim(),
          lastModified: new Date().toISOString()
        };
        await enqueueMutation('UPDATE', 'assets', updated);
      }
      await refreshRegistry();
      setIsRenameDialogOpen(false);
      addNotification({ title: "Folder Renamed", variant: "success" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurgeCategories = async () => {
    setIsProcessing(true);
    try {
      const idsToPurge = filteredAssets
        .filter(a => categoriesToPurge.includes(a.category))
        .map(a => a.id);
      
      for (const id of idsToPurge) {
        await enqueueMutation('DELETE', 'assets', { id });
      }
      await refreshRegistry();
      setIsPurgeDialogOpen(false);
      setCategoriesToPurge([]);
      setSelectedCategories([]);
      addNotification({ title: "Folders Purged", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchDeleteAssets = async () => {
    setIsProcessing(true);
    try {
      for (const id of Array.from(selectedAssetIds)) {
        await enqueueMutation('DELETE', 'assets', { id });
      }
      await refreshRegistry();
      setSelectedAssetIds(new Set());
      setIsAssetDeleteOpen(false);
      addNotification({ title: "Records Purged", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col relative pb-safe">
      {/* Controller Header */}
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
              <h2 className="text-lg font-black uppercase text-foreground tracking-tight leading-none truncate max-w-[200px]">
                {showList ? (selectedCategories[0] || 'Asset List') : (activeGrant?.name || 'Asset Hub')}
              </h2>
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                {showList ? `${processedAssets.length} RECORDS` : `${filteredAssets.length} TOTAL IN SCOPE`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-3 pr-4 border-r border-border shrink-0">
              <Checkbox 
                id="sel-all-master" 
                checked={showList ? (selectedAssetIds.size === paginatedAssets.length && paginatedAssets.length > 0) : (selectedCategories.length === categories.length && categories.length > 0)} 
                onCheckedChange={(c) => showList ? handleSelectAll(!!c) : setSelectedCategories(c ? categories : [])} 
                className="h-5 w-5 rounded-lg border-2 border-border data-[state=checked]:bg-primary" 
              />
              <label htmlFor="sel-all-master" className="text-[9px] font-black uppercase text-muted-foreground cursor-pointer">All</label>
            </div>

            <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {!isSearchExpanded ? (
                  <Button variant="outline" size="icon" onClick={() => setIsSearchExpanded(true)} className="h-10 w-10 rounded-lg border-border bg-muted/50 text-primary shrink-0"><Search className="h-4 w-4" /></Button>
                ) : (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: isMobile ? "100%" : "280px", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
                    <Input ref={searchInputRef} placeholder="Find assets..." value={searchTerm} onChange={(e) => setSearchTerm(sanitizeSearch(e.target.value))} onBlur={() => !searchTerm && setIsSearchExpanded(false)} className="h-10 pl-9 pr-8 rounded-lg bg-muted/50 border-2 border-primary/20 text-foreground text-xs" />
                    <button onClick={() => { setSearchTerm(''); setIsSearchExpanded(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <TactileMenu
                  title="Filter Logic"
                  options={[
                    { label: 'Open Filter Engine', icon: Filter, onClick: () => setIsLogicFilterOpen(true) },
                    { label: 'Purge all filters', icon: Trash2, onClick: () => setFilters([]), destructive: true }
                  ]}
                >
                  <Button variant="outline" size="icon" onClick={() => setIsLogicFilterOpen(true)} className="h-10 w-10 rounded-lg border-border relative"><Filter className="h-4 w-4" />{activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-black text-black border-2 border-background">{activeFilterCount}</span>}</Button>
                </TactileMenu>

                <TactileMenu
                  title="Sort Sequence"
                  options={[
                    { label: 'Modify Sequence', icon: ArrowUpDown, onClick: () => setIsSortOpen(true) },
                    { label: 'Sort by S/N', icon: Type, onClick: () => { setSortKey('sn'); setSortDir('asc'); } }
                  ]}
                >
                  <Button variant="outline" size="icon" onClick={() => setIsSortOpen(true)} className="h-10 w-10 rounded-lg border-border"><ArrowUpDown className="h-4 w-4" /></Button>
                </TactileMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Surface */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence>
          {expandedAssetId && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExpandedAssetId(null)} className="fixed inset-0 z-40 bg-background/60 backdrop-blur-md" />
          )}
        </AnimatePresence>

        <ScrollArea className={cn("flex-1 px-1 h-full transition-all duration-500", expandedAssetId && "blur-sm grayscale-[0.2] pointer-events-none")}>
          {!showList ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 pb-40">
              {categories.map(cat => (
                <Card 
                  key={cat} 
                  onClick={() => handleExploreFolder(cat)}
                  className={cn(
                    "bg-card border-2 rounded-3xl group hover:border-primary/40 transition-all shadow-xl p-6 relative cursor-pointer", 
                    selectedCategories.includes(cat) ? "border-primary/40 bg-primary/[0.02]" : "border-border"
                  )}
                >
                  <div className="flex justify-between items-start mb-8">
                    <div className="p-2.5 bg-primary/10 rounded-xl"><LayoutGrid className="h-5 w-5 text-primary" /></div>
                    <Checkbox checked={selectedCategories.includes(cat)} onCheckedChange={() => setSelectedCategories(selectedCategories.includes(cat) ? selectedCategories.filter(c => c !== cat) : [...selectedCategories, cat])} className="h-5 w-5 rounded-lg border-border" />
                  </div>
                  <h3 className="text-sm font-black uppercase text-foreground tracking-tight truncate mb-4">{cat}</h3>
                  <p className="text-3xl font-black tracking-tighter text-foreground">{groupStats[cat]?.total || 0}</p>
                  <p className="text-[8px] font-black uppercase text-primary tracking-[0.2em]">RECORDS</p>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className={viewMode === 'grid' ? "grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 pb-10" : ""}>
                <AnimatePresence mode="popLayout">
                  {viewMode === 'grid' ? paginatedAssets.map(asset => (
                    <motion.div key={asset.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <RegistryCard 
                        record={transformAssetToRecord(asset, headers, appSettings?.sourceBranding)} 
                        onInspect={handleEditAsset} 
                        selected={selectedAssetIds.has(asset.id)} 
                        onToggleSelect={handleToggleSelect} 
                        onToggleExpand={() => handleToggleExpand(asset.id)}
                      />
                    </motion.div>
                  )) : (
                    <RegistryTable records={paginatedAssets.map(a => transformAssetToRecord(a, headers, appSettings?.sourceBranding))} onInspect={handleEditAsset} selectedIds={selectedAssetIds} onToggleSelect={handleToggleSelect} onSelectAll={handleSelectAll} onToggleExpand={handleToggleExpand} />
                  )}
                </AnimatePresence>
              </div>
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} totalItems={processedAssets.length} />
            </div>
          )}
        </ScrollArea>

        {/* Focused Overlay */}
        <AnimatePresence>
          {expandedAssetId && (
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed top-[15vh] left-[5vw] right-[5vw] bottom-[10vh] z-50 bg-background border-2 border-primary/20 rounded-[2.5rem] shadow-3xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-border bg-muted/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-xl"><Database className="h-5 w-5 text-primary" /></div>
                  <h3 className="text-xl font-black uppercase text-foreground leading-none">Record Focus</h3>
                </div>
                <div className="flex items-center gap-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setIsHeaderEditingMode(!isHeaderEditingMode)}
                          className={cn("h-10 w-10 rounded-xl transition-all", isHeaderEditingMode ? "bg-primary text-black" : "bg-muted hover:bg-primary/10 hover:text-primary")}
                        >
                          <Columns className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-[8px] font-black uppercase">Field Orchestrator</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <button onClick={() => setExpandedAssetId(null)} className="h-10 w-10 flex items-center justify-center bg-muted/50 rounded-xl hover:bg-destructive/10"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <ScrollArea className="flex-1 custom-scrollbar">
                <div className="p-8">
                  {processedAssets.find(a => a.id === expandedAssetId) && (
                    <AssetDossier 
                      record={transformAssetToRecord(processedAssets.find(a => a.id === expandedAssetId)!, headers, appSettings?.sourceBranding)} 
                      onEdit={handleEditAsset}
                      isHeaderEditingMode={isHeaderEditingMode}
                    />
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Batch Bar - Adaptive Stream */}
      <AnimatePresence>
        {(selectedAssetIds.size > 0 || selectedCategories.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 40, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 40, x: "-50%" }} className="fixed bottom-8 left-1/2 z-50 w-full sm:w-auto max-w-[calc(100vw-2rem)] bg-[#0A0A0A]/95 border-2 border-primary/20 rounded-2xl p-2.5 flex items-center shadow-3xl backdrop-blur-3xl">
            <div className="flex items-center gap-3 pl-3 pr-6 border-r border-white/10 shrink-0">
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-black font-black text-[10px]">{showList ? selectedAssetIds.size : selectedCategories.length}</div>
              <span className="text-[9px] font-black uppercase text-white tracking-widest hidden xs:block">Selected</span>
            </div>
            <ScrollArea className="flex-1 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-1">
                <TactileMenu
                  title="Batch Actions"
                  options={[
                    { label: showList && selectedAssetIds.size === 1 ? 'Edit Record' : 'Batch Edit', icon: Edit3, onClick: () => showList ? (selectedAssetIds.size === 1 ? handleEditAsset(Array.from(selectedAssetIds)[0]) : setIsAssetBatchEditOpen(true)) : setIsCategoryBatchEditOpen(true) },
                    { label: 'Merge Selection', icon: GitMerge, onClick: () => setIsMergeDialogOpen(true) },
                    { label: 'Export Selection', icon: FileDown, onClick: () => {} },
                    { label: 'Print Labels', icon: Printer, onClick: () => {} },
                    { label: 'Delete Records', icon: Trash2, onClick: () => showList ? setIsAssetDeleteOpen(true) : setIsPurgeDialogOpen(true), destructive: true }
                  ]}
                >
                  {showList && selectedAssetIds.size === 1 ? (
                    <Button onClick={() => handleEditAsset(Array.from(selectedAssetIds)[0])} className="h-11 px-6 rounded-xl font-black uppercase text-[10px] gap-2 shadow-xl shrink-0"><Edit3 className="h-4 w-4" /> Edit Record</Button>
                  ) : (
                    <Button onClick={() => showList ? setIsAssetBatchEditOpen(true) : setIsCategoryBatchEditOpen(true)} className="h-11 px-6 rounded-xl font-black uppercase text-[10px] gap-2 shadow-xl shrink-0"><Edit3 className="h-4 w-4" /> Batch Edit</Button>
                  )}
                </TactileMenu>
                <Button variant="outline" onClick={() => setIsMergeDialogOpen(true)} className="h-11 px-6 rounded-xl font-black uppercase text-[10px] gap-2 border-white/10 text-white/60 shrink-0"><GitMerge className="h-4 w-4" /> Merge</Button>
                <Button variant="outline" className="h-11 px-6 rounded-xl font-black uppercase text-[10px] gap-2 text-destructive border-destructive/20 shrink-0" onClick={() => showList ? setIsAssetDeleteOpen(true) : setIsPurgeDialogOpen(true)}><Trash2 className="h-4 w-4" /> Delete</Button>
              </div>
              <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>
            <button onClick={() => showList ? setSelectedAssetIds(new Set()) : setSelectedCategories([])} className="p-2.5 text-white/20 hover:text-white rounded-xl"><X className="h-5 w-5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <AssetForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} asset={filteredAssets.find(a => a.id === selectedAssetIdForEdit)} isReadOnly={false} onSave={async (a) => { await enqueueMutation('UPDATE', 'assets', a); await refreshRegistry(); setIsFormOpen(false); }} />
      <HeaderManagerDrawer isOpen={isHeaderManagerOpen} onOpenChange={setIsHeaderManagerOpen} headers={headers} onUpdateHeaders={setHeaders} onReset={() => {}} />
      <CategoryBatchEditForm isOpen={isCategoryBatchEditOpen} onOpenChange={setIsCategoryBatchEditOpen} selectedCategoryCount={selectedCategories.length} onSave={handleSaveCategoryBatchEdit} />
      <AssetBatchEditForm isOpen={isAssetBatchEditOpen} onOpenChange={setIsAssetBatchEditOpen} selectedAssetCount={selectedAssetIds.size} onSave={handleSaveAssetBatch} />
      <FilterDrawer isOpen={isLogicFilterOpen} onOpenChange={setIsLogicFilterOpen} headers={headers} activeFilters={filters} onUpdateFilters={setFilters} optionsMap={optionsMap} />
      <SortDrawer isOpen={isSortOpen} onOpenChange={setIsSortOpen} headers={headers} sortBy={sortKey} sortDirection={sortDir} onUpdateSort={(k, dir) => { setSortKey(k); setSortDir(dir); }} />

      {/* Action Dialogs */}
      <AlertDialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-primary/10 bg-black text-white shadow-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Merge Selection</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic text-white/40">Select target folder for migration pulse.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-6">
            <Select value={targetMergeCategory} onValueChange={setTargetMergeCategory}>
              <SelectTrigger className="h-14 rounded-2xl bg-white/5 border-2 border-white/10 font-black text-[10px] uppercase">
                <SelectValue placeholder="Target Category..." />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10">
                {categories.map(c => <SelectItem key={c} value={c} className="text-[10px] font-black uppercase">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold border-2 m-0 h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMergeSelection} disabled={isProcessing || !targetMergeCategory} className="bg-primary text-black font-black uppercase text-[10px] tracking-widest px-8 rounded-xl m-0 h-12">Confirm Merge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isAssetDeleteOpen} onOpenChange={setIsAssetDeleteOpen}>
        <AlertDialogContent className="rounded-[2rem] border-destructive/20 bg-black text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase text-destructive tracking-tight">Purge Selection?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic text-white/40">This will permanently destroy {selectedAssetIds.size} records from the registry.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-xl font-bold border-2 m-0 h-12">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDeleteAssets} disabled={isProcessing} className="bg-destructive text-white font-black uppercase text-[10px] tracking-widest px-8 rounded-xl m-0 h-12">Execute Purge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-destructive/20 bg-black text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase text-destructive tracking-tight">Destroy Folders?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic text-white/40">Confirm permanent deletion of {selectedCategories.length} registry folders and all contained nodes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-xl font-bold border-2 m-0 h-12">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={handlePurgeCategories} disabled={isProcessing} className="bg-destructive text-white font-black uppercase text-[10px] tracking-widest px-8 rounded-xl m-0 h-12">Commit Destruction</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
