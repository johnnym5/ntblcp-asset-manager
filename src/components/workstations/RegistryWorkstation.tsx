'use client';

/**
 * @fileOverview Asset Hub - Main Registry Workstation.
 * Overhauled for Selection Pulses & Batch Operational Workflows.
 * Phase 800: Implemented Asset Multi-Selection & Floating Action Bar.
 * Phase 801: Integrated Batch Edit, Merge, and Export for selected records.
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
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { FirestoreService } from '@/services/firebase/firestore';
import { CategoryBatchEditForm, type CategoryBatchUpdateData } from '@/components/category-batch-edit-form';
import { AssetBatchEditForm, type BatchUpdateData } from '@/components/asset-batch-edit-form';
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
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHeaderManagerOpen, setIsHeaderManagerOpen] = useState(false);
  const [selectedAssetIdForEdit, setSelectedAssetIdForEdit] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Category & Asset Actions State
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

  const showList = isExplored || viewAll;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssetIds(new Set(processedAssets.map(a => a.id)));
    } else {
      setSelectedAssetIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedAssetIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedAssetIds(next);
  };

  const handleToggleExpand = (id: string) => {
    setExpandedAssetId(expandedAssetId === id ? null : id);
  };

  const handleEditAsset = (id: string) => {
    setSelectedAssetIdForEdit(id);
    setIsFormOpen(true);
  };

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

  // Asset Actions
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
      addNotification({ title: "Asset Batch Updated", variant: "success" });
    } finally {
      setIsProcessing(false);
      setIsAssetBatchEditOpen(false);
    }
  };

  const handleExportAssets = async () => {
    try {
      const assetsToExport = filteredAssets.filter(a => selectedAssetIds.has(a.id));
      await ExcelService.exportRegistry(assetsToExport, headers);
      addNotification({ title: "Excel Export Generated", variant: "success" });
    } catch (e) {
      addNotification({ title: "Export Pulse Failed", variant: "destructive" });
    }
  };

  const handlePurgeAssets = async () => {
    setIsProcessing(true);
    try {
      for (const id of Array.from(selectedAssetIds)) {
        await enqueueMutation('DELETE', 'assets', { id });
      }
      const currentLocal = await storage.getAssets();
      await storage.saveAssets(currentLocal.filter(a => !selectedAssetIds.has(a.id)));
      await refreshRegistry();
      setSelectedAssetIds(new Set());
      setIsAssetDeleteOpen(false);
      addNotification({ title: "Registry Records Purged", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col relative">
      {/* 1. Controller Header */}
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
            <div className="flex items-center gap-3 pr-4 border-r border-border shrink-0">
              <Checkbox 
                id="sel-all-master" 
                checked={showList ? (selectedAssetIds.size === paginatedAssets.length && paginatedAssets.length > 0) : (selectedCategories.length === categories.length && categories.length > 0)} 
                onCheckedChange={(c) => {
                  if (showList) handleSelectAll(!!c);
                  else setSelectedCategories(c ? categories : []);
                }} 
                className="h-5 w-5 rounded-lg border-2 border-border data-[state=checked]:bg-primary" 
              />
              <label htmlFor="sel-all-master" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer">Select All</label>
            </div>

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

      {/* 2. Main Registry Content */}
      <div className="flex-1 min-h-0 relative">
        {/* Focus Backdrop Overlay */}
        <AnimatePresence>
          {expandedAssetId && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpandedAssetId(null)}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-md cursor-zoom-out"
            />
          )}
        </AnimatePresence>

        <ScrollArea className={cn(
          "flex-1 px-1 h-full transition-all duration-500",
          expandedAssetId && "blur-[2px] grayscale-[0.2] pointer-events-none select-none scale-[0.995]"
        )}>
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
                    <Checkbox checked={selectedCategories.includes(cat)} onCheckedChange={() => handleToggleCategorySelection(cat)} className="h-5 w-5 rounded-lg border-2 border-border data-[state=checked]:bg-primary" />
                  </div>
                  <div className="flex justify-between items-start mb-8 pl-8">
                    <h3 className="text-sm font-black uppercase text-foreground tracking-tight leading-none truncate pr-4">{cat}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><button className="h-6 w-6 flex items-center justify-center text-muted-foreground/40 hover:text-foreground" onClick={(e) => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border text-foreground p-1">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setCategoryToRename(cat); setNewCategoryName(cat); setIsRenameDialogOpen(true); }} className="gap-2 p-2 rounded-lg focus:bg-primary/10"><Type className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Rename</span></DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExploreFolder(cat); }} className="gap-2 p-2 rounded-lg focus:bg-primary/10"><ChevronRight className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Open</span></DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setCategoriesToPurge([cat]); setIsPurgeDialogOpen(true); }} className="gap-2 p-2 rounded-lg focus:bg-destructive/10 text-destructive/60"><Trash2 className="h-3.5 w-3.5" /> <span className="text-[10px] font-black uppercase">Delete</span></DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-1 mb-8 pl-8">
                    <p className="text-4xl font-black tracking-tighter text-foreground">{groupStats[cat]?.total || 0}</p>
                    <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em]">RECORDS</p>
                  </div>
                  <Button 
                    onClick={(e) => { e.stopPropagation(); handleExploreFolder(cat); }} 
                    variant="outline" 
                    className="w-full h-12 mt-auto rounded-xl border-border text-foreground font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-muted transition-all"
                  >
                    Explore <ChevronRight className="h-3 w-3" />
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
              <div className="mt-auto pt-8 border-t border-border">
                <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} totalItems={processedAssets.length} />
              </div>
            </div>
          )}
        </ScrollArea>

        {/* 3. Focused Overlay Expansion */}
        <AnimatePresence>
          {expandedAssetId && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-[15vh] left-[5vw] right-[5vw] bottom-[10vh] z-50 bg-background border-2 border-primary/20 rounded-[2.5rem] shadow-3xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-border bg-muted/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-xl"><Database className="h-5 w-5 text-primary" /></div>
                  <div className="space-y-0.5">
                    <h3 className="text-xl font-black uppercase text-foreground leading-none">Record Focus</h3>
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">DETAILED DOSSIER PULSE</p>
                  </div>
                </div>
                <button onClick={() => setExpandedAssetId(null)} className="h-10 w-10 flex items-center justify-center bg-muted/50 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <ScrollArea className="flex-1 custom-scrollbar">
                <div className="p-8">
                  {processedAssets.find(a => a.id === expandedAssetId) && (
                    <AssetDossier 
                      record={transformAssetToRecord(processedAssets.find(a => a.id === expandedAssetId)!, headers, appSettings?.sourceBranding)} 
                      onEdit={handleEditAsset}
                    />
                  )}
                </div>
              </ScrollArea>

              <div className="p-6 bg-muted/5 border-t border-border flex justify-center">
                <Button variant="ghost" onClick={() => setExpandedAssetId(null)} className="font-black uppercase text-[10px] tracking-widest opacity-40 hover:opacity-100 transition-all">Dismiss Dossier</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Batch Pulse Floating Action Bar */}
      <AnimatePresence>
        {(selectedAssetIds.size > 0 || selectedCategories.length > 0) && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 40 }} 
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#0A0A0A]/95 border-2 border-primary/20 rounded-2xl p-3 flex items-center gap-8 shadow-3xl backdrop-blur-3xl"
          >
            <div className="flex items-center gap-3 pl-3">
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-black font-black text-[10px]">
                {showList ? selectedAssetIds.size : selectedCategories.length}
              </div>
              <span className="text-[10px] font-black uppercase text-white tracking-widest">Selected</span>
            </div>
            
            <div className="h-8 w-px bg-white/10" />
            
            <div className="flex items-center gap-2">
              <Button onClick={() => showList ? setIsAssetBatchEditOpen(true) : setIsCategoryBatchEditOpen(true)} className="h-11 px-6 rounded-xl font-black uppercase text-[10px] gap-2 shadow-xl hover:scale-105 transition-all">
                <Edit3 className="h-4 w-4" /> Batch Edit
              </Button>
              <Button variant="outline" onClick={showList ? handleExportAssets : handleExportCategories} className="h-11 px-6 rounded-xl font-black uppercase text-[10px] gap-2 border-white/10 text-white/60 hover:bg-white/5">
                <FileDown className="h-4 w-4" /> Export
              </Button>
              <Button variant="outline" onClick={() => showList ? setIsMergeDialogOpen(true) : setIsMergeDialogOpen(true)} className="h-11 px-6 rounded-xl font-black uppercase text-[10px] gap-2 border-white/10 text-white/60 hover:bg-white/5">
                <GitMerge className="h-4 w-4" /> Merge
              </Button>
              <Button variant="outline" onClick={() => showList ? setIsAssetDeleteOpen(true) : setIsPurgeDialogOpen(true)} className="h-11 px-6 rounded-xl font-black uppercase text-[10px] gap-2 text-destructive border-destructive/20 hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
              
              <button onClick={() => showList ? setSelectedAssetIds(new Set()) : setSelectedCategories([])} className="p-2 text-white/20 hover:text-white transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Modals & Sheets */}
      <AssetForm 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        asset={filteredAssets.find(a => a.id === selectedAssetIdForEdit)} 
        isReadOnly={false} 
        onSave={async (a) => { await enqueueMutation('UPDATE', 'assets', a); await refreshRegistry(); setIsFormOpen(false); }} 
      />
      <HeaderManagerDrawer isOpen={isHeaderManagerOpen} onOpenChange={setIsHeaderManagerOpen} headers={headers} onUpdateHeaders={setHeaders} onReset={() => {}} />
      
      <CategoryBatchEditForm isOpen={isCategoryBatchEditOpen} onOpenChange={setIsCategoryBatchEditOpen} selectedCategoryCount={selectedCategories.length} onSave={handleSaveCategoryBatchEdit} />
      <AssetBatchEditForm isOpen={isAssetBatchEditOpen} onOpenChange={setIsAssetBatchEditOpen} selectedAssetCount={selectedAssetIds.size} onSave={handleSaveAssetBatch} />
      
      <FilterDrawer isOpen={isLogicFilterOpen} onOpenChange={setIsLogicFilterOpen} headers={headers} activeFilters={filters} onUpdateFilters={setFilters} optionsMap={optionsMap} />
      <SortDrawer isOpen={isSortOpen} onOpenChange={setIsSortOpen} headers={headers} sortBy={sortKey} sortDirection={sortDir} onUpdateSort={(k, dir) => { setSortKey(k); setSortDir(dir); }} />

      {/* Merge Confirmation */}
      <AlertDialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-primary/10 shadow-3xl bg-black">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase text-white">Merge Selection?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic text-white/40">Select the target folder for this migration pulse.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-6">
            <Select value={targetMergeCategory} onValueChange={setTargetMergeCategory}>
              <SelectTrigger className="h-14 rounded-2xl bg-white/5 border-2 border-white/10 font-black text-[10px] uppercase">
                <SelectValue placeholder="Target Category..." />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10 rounded-2xl">
                {categories.map(c => <SelectItem key={c} value={c} className="text-[10px] font-black uppercase">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 border-white/10 m-0 text-white hover:bg-white/5">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={showList ? handleMergeAssets : handleMergeCategories} disabled={isProcessing || !targetMergeCategory} className="h-12 px-10 rounded-2xl font-black uppercase text-[10px] bg-primary text-black m-0">
              Confirm Merge Pulse
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Asset Purge Confirmation */}
      <AlertDialog open={isAssetDeleteOpen} onOpenChange={setIsAssetDeleteOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 shadow-3xl bg-black">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase text-destructive">Purge Records?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic text-white/40">You are about to destroy {selectedAssetIds.size} records. This action is immutable.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 border-white/10 m-0 text-white">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={handlePurgeAssets} disabled={isProcessing} className="h-12 px-10 rounded-2xl font-black uppercase text-[10px] bg-destructive text-white m-0">
              Execute Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <AlertDialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-primary/10 shadow-3xl bg-black">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase text-white">Rename Folder</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="py-6">
            <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="h-14 bg-white/5 border-2 border-white/10 rounded-2xl font-black uppercase text-sm" />
          </div>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 border-white/10 m-0 text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRenameCommit} className="h-12 px-10 rounded-2xl font-black uppercase text-[10px] bg-primary text-black m-0">Commit Name</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Purge Confirmation */}
      <AlertDialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 shadow-3xl bg-black">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase text-destructive">Destroy Folder(s)?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic text-white/40">Permanently removing {selectedCategories.length || 1} asset folder(s).</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold border-2 border-white/10 m-0 text-white">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecutePurge} disabled={isProcessing} className="h-12 px-10 rounded-2xl font-black uppercase text-[10px] bg-destructive text-white m-0">
              Execute Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  function handleExploreFolder(cat: string) {
    setSelectedCategories([cat]);
    setIsExplored(true);
    setCurrentPage(1);
  }

  function handleToggleCategorySelection(cat: string) {
    const next = selectedCategories.includes(cat) ? selectedCategories.filter(c => c !== cat) : [...selectedCategories, cat];
    setSelectedCategories(next);
  }

  async function handleSaveCategoryBatchEdit(data: CategoryBatchUpdateData) {
    setIsProcessing(true);
    try {
      const targetAssets = filteredAssets.filter(a => selectedCategories.includes(a.category));
      for (const asset of targetAssets) {
        const updated = {
          ...asset,
          ...(data.status && { status: data.status.toUpperCase() as any }),
          lastModified: new Date().toISOString(),
          lastModifiedBy: userProfile?.displayName || 'Batch Processor'
        };
        await enqueueMutation('UPDATE', 'assets', updated);
      }
      await refreshRegistry();
      addNotification({ title: "Folders Updated Successfully", variant: "success" });
    } finally {
      setIsProcessing(false);
      setIsCategoryBatchEditOpen(false);
    }
  }

  async function handleExportCategories() {
    try {
      const assetsToExport = filteredAssets.filter(a => selectedCategories.includes(a.category));
      await ExcelService.exportRegistry(assetsToExport, headers);
      addNotification({ title: "Excel Export Complete", variant: "success" });
    } catch (e) {
      addNotification({ title: "Export Failed", variant: "destructive" });
    }
  }

  async function handleMergeCategories() {
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
  }

  async function handleMergeAssets() {
    if (!targetMergeCategory) return;
    setIsProcessing(true);
    try {
      const assetsToMerge = filteredAssets.filter(a => selectedAssetIds.has(a.id));
      for (const asset of assetsToMerge) {
        await enqueueMutation('UPDATE', 'assets', { ...asset, category: targetMergeCategory });
      }
      await refreshRegistry();
      setSelectedAssetIds(new Set());
      setIsMergeDialogOpen(false);
      addNotification({ title: `Migration to ${targetMergeCategory} complete`, variant: "success" });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleExecutePurge() {
    if (categoriesToPurge.length === 0 && selectedCategories.length === 0) return;
    const targets = categoriesToPurge.length > 0 ? categoriesToPurge : selectedCategories;
    
    setIsProcessing(true);
    try {
      const idsToDelete = filteredAssets.filter(a => targets.includes(a.category)).map(a => a.id);
      for (const id of idsToDelete) await enqueueMutation('DELETE', 'assets', { id });
      const currentLocal = await storage.getAssets();
      await storage.saveAssets(currentLocal.filter(a => !idsToDelete.includes(a.id)));
      await refreshRegistry();
      setSelectedCategories([]);
      setCategoriesToPurge([]);
      setIsPurgeDialogOpen(false);
      addNotification({ title: "Folders Removed", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }

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
