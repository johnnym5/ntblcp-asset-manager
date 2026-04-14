'use client';

/**
 * @fileOverview Asset List Hub - Main Management Page.
 * Phase 1914: Updated with simple terminology (List, Folders, Setup).
 * Phase 1915: Integrated Tactile Menus for Folder Cards.
 * Phase 1916: Limited grid to 5 columns max for improved card detail visibility.
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppState } from '@/contexts/app-state-context';
import { useAuth } from '@/contexts/auth-context';
import { 
  Database,
  X,
  Loader2,
  ShieldCheck,
  Search,
  ArrowUpDown,
  Filter,
  ArrowLeft,
  LayoutGrid,
  Columns,
  Maximize2,
  Save,
  Edit3,
  Trash2,
  TrendingUp,
  Activity,
  Wrench,
  Tag,
  CheckCircle2,
  XCircle,
  FolderOpen,
  FileDown,
  ArrowRight,
  FileUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RegistryCard } from '@/components/registry/RegistryCard';
import { RegistryTable } from '@/components/registry/RegistryTable';
import AssetForm from '@/components/asset-form';
import { SortDrawer } from '@/components/registry/SortDrawer';
import { FilterDrawer } from '@/components/registry/FilterDrawer';
import { PaginationControls } from '@/components/pagination-controls';
import { transformAssetToRecord, normalizeHeaderName } from '@/lib/registry-utils';
import { cn, sanitizeSearch, getFuzzySignature } from '@/lib/utils';
import { enqueueMutation } from '@/offline/queue';
import { Input } from '@/components/ui/input';
import { addNotification } from '@/hooks/use-notifications';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExcelService } from '@/services/excel-service';
import { AssetDossier } from '@/components/registry/AssetDossier';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { CategoryBatchEditForm, type CategoryBatchUpdateData } from '@/components/category-batch-edit-form';
import { AssetBatchEditForm, type BatchUpdateData } from '@/components/asset-batch-edit-form';
import { ColumnCustomizationSheet } from '@/components/column-customization-sheet';
import { ImportScannerDialog } from '../single-sheet-import-dialog';
import { FirestoreService } from '@/services/firebase/firestore';
import { storage } from '@/offline/storage';
import { TactileMenu } from '@/components/TactileMenu';
import type { Asset, SheetDefinition } from '@/types/domain';
import type { RegistryHeader } from '@/types/registry';
import { useIsMobile } from '@/hooks/use-mobile';

export function RegistryWorkstation({ viewAll = false }: { viewAll?: boolean }) {
  const { 
    filteredAssets,
    assets,
    headers: workstationHeaders,
    setHeaders: setWorkstationHeaders,
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
    activeGrantIds,
    isFilterOpen,
    setIsFilterOpen,
    isSortOpen,
    setIsSortOpen,
    filters,
    setFilters,
    itemsPerPage,
    setItemsPerPage,
    activeFilterCount,
    goBack,
    searchTerm,
    setSearchTerm,
    isSyncing
  } = useAppState();
  
  const { userProfile } = useAuth();
  const isMobile = useIsMobile();
  
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHeaderEditingMode, setIsHeaderEditingMode] = useState(false);
  const [selectedAssetIdForEdit, setSelectedAssetIdForEdit] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [isCategoryBatchEditOpen, setIsCategoryBatchEditOpen] = useState(false);
  const [isAssetBatchEditOpen, setIsAssetBatchEditOpen] = useState(false);
  const [isAssetDeleteOpen, setIsAssetDeleteOpen] = useState(false);
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  
  const [isColumnSheetOpen, setIsColumnSheetOpen] = useState(false);
  const [selectedSheetDef, setSelectedSheetDef] = useState<SheetDefinition | null>(null);
  const [originalSheetName, setOriginalSheetName] = useState<string | null>(null);
  const [activeGrantIdForSchema, setActiveGrantIdForSchema] = useState<string | null>(null);
  
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [isProjectDeleteOpen, setIsProjectDeleteOpen] = useState(false);

  // Single Sheet Import State
  const [isImportScannerOpen, setIsImportScannerOpen] = useState(false);
  const [targetFolderForImport, setTargetFolderForImport] = useState<string | null>(null);

  const isAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN' || !!userProfile?.isZonalAdmin;
  const canEdit = isAdmin || !!userProfile?.canEditAssets;
  const isVerificationMode = appSettings?.appMode === 'verification';
  
  const mergedSheetDefinitions = useMemo(() => {
    const defs: Record<string, SheetDefinition> = {};
    const enabledGrants = appSettings?.grants.filter(g => activeGrantIds.includes(g.id)) || [];
    enabledGrants.forEach(g => {
      Object.entries(g.sheetDefinitions || {}).forEach(([name, def]) => {
        defs[name] = def;
      });
    });
    return defs;
  }, [appSettings?.grants, activeGrantIds]);

  useEffect(() => {
    if (selectedCategories.length === 1) {
      const cat = selectedCategories[0];
      const def = mergedSheetDefinitions[cat];
      if (def && def.displayFields) {
        const folderHeaders: RegistryHeader[] = def.displayFields.map((f, i) => ({
          id: `h-${f.key}-${i}`,
          rawName: f.label,
          displayName: f.label,
          normalizedName: normalizeHeaderName(f.label),
          visible: true,
          table: f.table,
          quickView: f.quickView,
          inChecklist: !!f.inChecklist,
          editable: true,
          filterable: true,
          sortEnabled: true,
          dataType: 'text',
          orderIndex: i
        }));
        setWorkstationHeaders(folderHeaders);
      }
    }
  }, [selectedCategories, mergedSheetDefinitions, setWorkstationHeaders]);

  const groupStats = useMemo(() => {
    const stats: Record<string, { total: number, verified: number }> = {};
    assets.forEach(a => {
      const cat = a.category || 'Uncategorized';
      if (!stats[cat]) stats[cat] = { total: 0, verified: 0 };
      stats[cat].total++;
      if (a.status === 'VERIFIED') stats[cat].verified++;
    });
    return stats;
  }, [assets]);

  const categories = useMemo(() => {
    const allEnabledSheets = new Set<string>();
    appSettings?.grants.forEach(g => {
      if (activeGrantIds.includes(g.id)) {
        g.enabledSheets.forEach(s => allEnabledSheets.add(s));
      }
    });

    const list = Array.from(allEnabledSheets);
    const withAssets = list.filter(cat => (groupStats[cat]?.total || 0) > 0);
    const emptyEnabled = list.filter(cat => (groupStats[cat]?.total || 0) === 0);

    const assetSignatures = new Set(withAssets.map(a => getFuzzySignature(a)));
    const filteredEmpty = emptyEnabled.filter(cat => !assetSignatures.has(getFuzzySignature(cat)));

    return [...withAssets, ...filteredEmpty].sort();
  }, [appSettings?.grants, activeGrantIds, groupStats]);

  const processedAssets = useMemo(() => {
    let results = [...filteredAssets];
    if (selectedCategories.length > 0) results = results.filter(a => selectedCategories.includes(a.category));
    
    if (sortKey) {
      const sortHeader = workstationHeaders.find(h => h.id === sortKey);
      results.sort((a, b) => {
        const getVal = (item: Asset) => {
          if (sortKey === 'sn') return item.sn || "";
          if (sortKey === 'assetIdCode') return item.assetIdCode || "";
          if (!sortHeader) return "";
          switch(sortHeader.normalizedName) {
            case "sn": return item.sn || "";
            case "description": return item.description || "";
            case "assetIdCode": return item.assetIdCode || "";
            case "location": return item.location || "";
            case "condition": return item.condition || "";
            default: return String((item.metadata as any)?.[sortHeader.rawName] || "");
          }
        };
        const valA = String(getVal(a));
        const valB = String(getVal(b));
        return sortDir === 'asc' ? valA.localeCompare(valB, undefined, { numeric: true }) : valB.localeCompare(valA, undefined, { numeric: true });
      });
    }
    return results;
  }, [filteredAssets, sortKey, sortDir, selectedCategories, workstationHeaders]);

  const optionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    workstationHeaders.forEach(header => {
      const values = new Set<string>();
      assets.filter(a => activeGrantIds.includes(a.grantId)).forEach(asset => {
        let val = "";
        switch(header.normalizedName) {
          case "location": val = asset.location; break;
          case "condition": val = asset.condition; break;
          case "status": val = asset.status; break;
          case "category": val = asset.category; break;
          default: val = String((asset.metadata as any)?.[header.rawName] || "");
        }
        if (val && val !== "---") values.add(val);
      });
      map[header.id] = Array.from(values).sort();
    });
    return map;
  }, [workstationHeaders, assets, activeGrantIds]);

  const totalPages = useMemo(() => itemsPerPage === 'all' ? 1 : Math.ceil(processedAssets.length / (itemsPerPage as number)), [processedAssets.length, itemsPerPage]);
  const paginatedAssets = useMemo(() => itemsPerPage === 'all' ? processedAssets : processedAssets.slice((currentPage - 1) * (itemsPerPage as number), currentPage * (itemsPerPage as number)), [processedAssets, currentPage, itemsPerPage]);

  const showList = isExplored || viewAll;

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedAssetIds(new Set(paginatedAssets.map(a => a.id)));
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

  const handleQuickUpdate = async (id: string, updates: Partial<Asset>) => {
    const asset = filteredAssets.find(a => a.id === id);
    if (!asset) return;

    const updatedAsset: Asset = {
      ...asset,
      ...updates,
      lastModified: new Date().toISOString(),
      lastModifiedBy: userProfile?.displayName || 'User',
      lastModifiedByState: userProfile?.state
    };

    try {
      await enqueueMutation('UPDATE', 'assets', updatedAsset);
      const currentLocal = await storage.getAssets();
      await storage.saveAssets(currentLocal.map(a => a.id === id ? updatedAsset : a));
      await refreshRegistry();
    } catch (e) {
      addNotification({ title: "Sync Interrupted", variant: "destructive" });
    }
  };

  const handleSaveGlobalHeaders = async () => {
    if (!isAdmin || !appSettings) return;
    setIsProcessing(true);
    try {
      const updatedSettings = { ...appSettings, globalHeaders: workstationHeaders };
      if (isOnline) await FirestoreService.updateSettings(updatedSettings);
      await storage.saveSettings(updatedSettings);
      setAppSettings(updatedSettings);
      setIsHeaderEditingMode(false);
      addNotification({ title: "Layout Saved", variant: "success" });
    } catch (e) {
      addNotification({ title: "Save Failed", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchDeleteAssets = async () => {
    setIsProcessing(true);
    try {
      const idsToDelete = Array.from(selectedAssetIds);
      for (const id of idsToDelete) {
        await enqueueMutation('DELETE', 'assets', { id });
      }
      
      const currentLocal = await storage.getAssets();
      const updatedLocal = currentLocal.filter(a => !selectedAssetIds.has(a.id));
      await storage.saveAssets(updatedLocal);
      
      await refreshRegistry();
      setSelectedAssetIds(new Set());
      setIsAssetDeleteOpen(false);
      addNotification({ title: "Records Deleted", description: `${idsToDelete.length} records removed locally. Sync to save to cloud.`, variant: "success" });
    } catch (e) {
      addNotification({ title: "Delete Failed", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurgeFolders = async () => {
    setIsProcessing(true);
    try {
      const foldersToPurge = selectedCategories;
      const assetsToPurge = assets.filter(a => foldersToPurge.includes(a.category));
      const idsToPurge = assetsToPurge.map(a => a.id);

      for (const id of idsToPurge) {
        await enqueueMutation('DELETE', 'assets', { id });
      }

      const currentLocal = await storage.getAssets();
      const updatedLocal = currentLocal.filter(a => !foldersToPurge.includes(a.category));
      await storage.saveAssets(updatedLocal);

      await refreshRegistry();
      setSelectedCategories([]);
      setIsPurgeDialogOpen(false);
      addNotification({ title: "Folders Cleared", description: `${foldersToPurge.length} folders emptied. Sync to save changes.`, variant: "success" });
    } catch (e) {
      addNotification({ title: "Clear Failed", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAssetBatch = async (data: BatchUpdateData) => {
    setIsProcessing(true);
    try {
      const targetAssets = filteredAssets.filter(a => selectedAssetIds.has(a.id));
      for (const asset of targetAssets) {
        const updated = {
          ...asset,
          ...(data.verifiedStatus && { status: data.verifiedStatus.toUpperCase() as any }),
          ...(data.condition && { condition: data.condition }),
          ...(data.location && { location: data.location }),
          lastModified: new Date().toISOString(),
          lastModifiedBy: userProfile?.displayName || 'Batch Edit'
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
    setIsProcessing(true);
    try {
      const targetAssets = filteredAssets.filter(a => selectedCategories.includes(a.category));
      for (const asset of targetAssets) {
        const updated = {
          ...asset,
          ...(data.status && { status: data.status.toUpperCase() as any }),
          lastModified: new Date().toISOString(),
          lastModifiedBy: userProfile?.displayName || 'Batch Edit'
        };
        await enqueueMutation('UPDATE', 'assets', updated);
      }
      await refreshRegistry();
      setSelectedCategories([]);
      addNotification({ title: "Folders Updated", variant: "success" });
    } finally {
      setIsProcessing(false);
      setIsCategoryBatchEditOpen(false);
    }
  };

  const handleExploreFolder = (cat: string) => {
    setSelectedCategories([cat]);
    setIsExplored(true);
    setCurrentPage(1);
  };

  const handleSelectionExport = async () => {
    const selectedAssets = filteredAssets.filter(a => selectedAssetIds.has(a.id));
    if (selectedAssets.length === 0) return;
    try {
      await ExcelService.exportRegistry(selectedAssets, workstationHeaders);
      addNotification({ title: "Export Ready", variant: "success" });
    } catch (e) {
      addNotification({ title: "Export Failed", variant: "destructive" });
    }
  };

  const isSelectionBarVisible = (showList && selectedAssetIds.size > 0) || (!showList && selectedCategories.length > 0);

  const totalVerified = useMemo(() => filteredAssets.filter(a => a.status === 'VERIFIED').length, [filteredAssets]);
  const totalCoverage = useMemo(() => filteredAssets.length > 0 ? Math.round((totalVerified / filteredAssets.length) * 100) : 0, [totalVerified, filteredAssets]);

  return (
    <div className="space-y-4 h-full flex flex-col relative pb-safe">
      {/* 1. Header Pulse */}
      <div className="sticky top-[-1rem] sm:top-[-2rem] lg:top-[-2.5rem] z-40 bg-background/95 backdrop-blur-2xl pt-2 pb-4 px-1 border-b border-border mb-4 -mx-1 shrink-0">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-3 self-start min-w-0">
            <AnimatePresence mode="wait">
              {showList ? (
                <motion.button
                  key="back-btn"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={goBack}
                  className="h-10 w-10 flex items-center justify-center bg-muted/50 hover:bg-muted border border-border rounded-xl transition-all shadow-sm shrink-0"
                >
                  <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                </motion.button>
              ) : (
                <div key="logo-icon" className="p-2 bg-primary/10 rounded-xl shadow-inner border border-primary/5 shrink-0">
                  <Database className="h-5 w-5 text-primary" />
                </div>
              )}
            </AnimatePresence>
            <div className="space-y-0.5 min-w-0">
              <h2 className="text-lg font-black uppercase text-foreground tracking-tight leading-none truncate max-w-[300px]">
                {showList ? (selectedCategories[0] || 'Asset List') : 'Asset List'}
              </h2>
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                {showList ? `${processedAssets.length} Records Found` : `${filteredAssets.length} Total Records`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
              {showList && isAdmin && (
                <div className="flex gap-2 shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setTargetFolderForImport(selectedCategories[0]);
                      setIsImportScannerOpen(true);
                    }}
                    className="h-10 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest border-2 gap-2 shadow-sm"
                  >
                    <FileUp className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Import Into Folder</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const cat = selectedCategories[0];
                      if (cat && mergedSheetDefinitions[cat]) {
                        setSelectedSheetDef(mergedSheetDefinitions[cat]);
                        setOriginalSheetName(cat);
                        setIsColumnSheetOpen(true);
                      }
                    }}
                    className="h-10 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest border-2 gap-2 shadow-sm"
                  >
                    <Wrench className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Folder Setup</span>
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-3 pr-4 border-r border-border shrink-0">
                <Checkbox 
                  id="sel-all-master" 
                  checked={showList ? (selectedAssetIds.size === paginatedAssets.length && paginatedAssets.length > 0) : (selectedCategories.length === categories.length && categories.length > 0)} 
                  onCheckedChange={(c) => showList ? handleSelectAll(!!c) : setSelectedCategories(c ? categories : [])} 
                  className="h-5 w-5 rounded-lg border-2 border-border data-[state=checked]:bg-primary" 
                />
                <label htmlFor="sel-all-master" className="text-[9px] font-black uppercase text-muted-foreground cursor-pointer hidden sm:block">Select All</label>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setIsSortOpen(true)}
                        className={cn("h-10 w-10 rounded-lg transition-all", isSortOpen ? "bg-primary text-black" : "bg-muted/50 hover:bg-primary/10 hover:text-primary")}
                      >
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[8px] font-black uppercase">Sort Records</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setIsFilterOpen(true)}
                        className={cn("h-10 w-10 rounded-lg transition-all relative", isFilterOpen ? "bg-primary text-black" : "bg-muted/50 hover:bg-primary/10 hover:text-primary")}
                      >
                        <Filter className="h-4 w-4" />
                        {activeFilterCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-black text-[8px] font-black shadow-lg">
                            {activeFilterCount}
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[8px] font-black uppercase">Filter List</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border shadow-inner shrink-0 hidden sm:flex">
                <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className="h-8 w-8 rounded-lg transition-all"><LayoutGrid className="h-4 w-4" /></Button>
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className="h-8 w-8 rounded-lg transition-all"><Columns className="h-4 w-4" /></Button>
              </div>

              <AnimatePresence mode="wait">
                {!isSearchExpanded ? (
                  <Button variant="outline" size="icon" onClick={() => setIsSearchExpanded(true)} className="h-10 w-10 rounded-lg border-border bg-muted/50 text-primary shrink-0 transition-all"><Search className="h-4 w-4" /></Button>
                ) : (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: isMobile ? "100%" : "280px", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="relative group min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
                    <Input ref={searchInputRef} placeholder="Find record..." value={searchTerm} onChange={(e) => setSearchTerm(sanitizeSearch(e.target.value))} onBlur={() => !searchTerm && setIsSearchExpanded(false)} className="h-10 pl-9 pr-8 rounded-lg bg-muted/50 border-2 border-primary/20 text-foreground text-xs focus-visible:ring-primary/20" />
                    <button onClick={() => { setSearchTerm(''); setIsSearchExpanded(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Workstation Surface */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence>
          {expandedAssetId && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExpandedAssetId(null)} className="fixed inset-0 z-40 bg-background/60 backdrop-blur-md" />
          )}
        </AnimatePresence>

        {isVerificationMode && !showList && (
          <div className="px-1 mb-6">
            <Card className="rounded-3xl border-2 border-primary/20 bg-primary/[0.02] p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp className="h-32 w-32 text-primary" />
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-primary rounded-2xl shadow-xl shadow-primary/20">
                    <ShieldCheck className="h-8 w-8 text-black" />
                  </div>
                  <div className="space-y-1 text-center md:text-left">
                    <h3 className="text-2xl font-black uppercase text-foreground tracking-tight leading-none">Audit Progress</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{totalVerified} of {filteredAssets.length} Verified Records</p>
                  </div>
                </div>
                <div className="flex items-center gap-8 min-w-[200px] w-full md:w-auto">
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-primary">{totalCoverage}%</span></div>
                    <Progress value={totalCoverage} className="h-2 bg-primary/10" />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-black text-foreground tracking-tighter">{totalCoverage}%</span>
                    <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest opacity-40 whitespace-nowrap">Total List</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        <ScrollArea className={cn("flex-1 px-1 h-full transition-all duration-500", expandedAssetId && "blur-sm grayscale-[0.2] pointer-events-none")}>
          {!showList ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 pb-40">
              {categories.map(cat => (
                <TactileMenu
                  key={cat}
                  title="Folder Menu"
                  options={[
                    { label: 'View Records', icon: FolderOpen, onClick: () => handleExploreFolder(cat) },
                    { label: selectedCategories.includes(cat) ? 'Deselect Folder' : 'Select Folder', icon: CheckCircle2, onClick: () => setSelectedCategories(selectedCategories.includes(cat) ? selectedCategories.filter(c => c !== cat) : [...selectedCategories, cat]) },
                    ...(isAdmin ? [
                      { label: 'Import Into Folder', icon: FileUp, onClick: () => { setTargetFolderForImport(cat); setIsImportScannerOpen(true); } },
                      { label: 'Setup Folder', icon: Wrench, onClick: () => {
                        if (mergedSheetDefinitions[cat]) {
                          setSelectedSheetDef(mergedSheetDefinitions[cat]);
                          setOriginalSheetName(cat);
                          setIsColumnSheetOpen(true);
                        }
                      }},
                      { label: 'Delete Records', icon: Trash2, onClick: () => { setSelectedCategories([cat]); setIsPurgeDialogOpen(true); }, destructive: true }
                    ] : [])
                  ]}
                >
                  <Card 
                    onClick={() => handleExploreFolder(cat)}
                    className={cn(
                      "bg-card border-2 rounded-[2rem] group hover:border-primary/40 transition-all shadow-xl p-6 relative cursor-pointer min-h-[220px] flex flex-col justify-between", 
                      selectedCategories.includes(cat) ? "border-primary/40 bg-primary/[0.02]" : "border-border"
                    )}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <div className="p-2.5 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform"><LayoutGrid className="h-5 w-5 text-primary" /></div>
                        <Checkbox checked={selectedCategories.includes(cat)} onCheckedChange={(c) => { setSelectedCategories(!!c ? [...selectedCategories, cat] : selectedCategories.filter(x => x !== cat)); }} className="h-5 w-5 rounded-lg border-border" onClick={e => e.stopPropagation()} />
                      </div>
                      
                      <h3 className="text-[11px] font-black uppercase text-foreground tracking-tight leading-tight mb-4 line-clamp-3 overflow-hidden" title={cat}>
                        {cat}
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black tracking-tighter text-foreground leading-none">{groupStats[cat]?.total || 0}</p>
                        <p className="text-[8px] font-black uppercase text-primary tracking-[0.2em]">ITEMS</p>
                      </div>

                      {isVerificationMode && (
                        <div className="space-y-2 pt-4 border-t border-dashed border-border/40">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase">
                            <span className="text-muted-foreground opacity-60">Status</span>
                            <span className="text-primary font-bold">{groupStats[cat]?.verified || 0} / {groupStats[cat]?.total || 0}</span>
                          </div>
                          <Progress 
                            value={groupStats[cat]?.total > 0 ? (groupStats[cat]?.verified / groupStats[cat]?.total) * 100 : 0} 
                            className="h-1 bg-muted" 
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                </TactileMenu>
              ))}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className={viewMode === 'grid' ? "grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 pb-10" : ""}>
                <AnimatePresence mode="popLayout">
                  {viewMode === 'grid' || isMobile ? paginatedAssets.map(asset => (
                    <motion.div key={asset.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <RegistryCard 
                        record={transformAssetToRecord(asset, workstationHeaders, appSettings?.sourceBranding)} 
                        onInspect={handleEditAsset} 
                        selected={selectedAssetIds.has(asset.id)} 
                        onToggleSelect={handleToggleSelect} 
                        onToggleExpand={() => handleToggleExpand(asset.id)}
                        onQuickUpdate={handleQuickUpdate}
                      />
                    </motion.div>
                  )) : (
                    <RegistryTable 
                      records={paginatedAssets.map(a => transformAssetToRecord(a, workstationHeaders, appSettings?.sourceBranding))} 
                      onInspect={handleEditAsset} 
                      selectedIds={selectedAssetIds} 
                      onToggleSelect={handleToggleSelect} 
                      onSelectAll={handleSelectAll} 
                      onToggleExpand={handleToggleExpand}
                      onQuickUpdate={handleQuickUpdate}
                    />
                  )}
                </AnimatePresence>
              </div>
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} totalItems={processedAssets.length} />
            </div>
          )}
        </ScrollArea>

        {/* 3. Record Overlay (Expanded) */}
        <AnimatePresence>
          {expandedAssetId && (
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed top-[5vh] left-[2.5vw] right-[2.5vw] bottom-[5vh] lg:top-[15vh] lg:left-[5vw] lg:right-[5vw] lg:bottom-[10vh] z-50 bg-background border-2 border-primary/20 rounded-[2.5rem] shadow-3xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-border bg-muted/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-xl shadow-inner"><Database className="h-5 w-5 text-primary" /></div>
                  <h3 className="text-xl font-black uppercase text-foreground leading-none">Asset Profile</h3>
                </div>
                <div className="flex items-center gap-3">
                  {isHeaderEditingMode && isAdmin && (
                    <Button 
                      onClick={handleSaveGlobalHeaders}
                      disabled={isProcessing}
                      className="h-10 px-6 rounded-xl bg-primary text-black font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg"
                    >
                      {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save Labels
                    </Button>
                  )}
                  {isAdmin && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setIsHeaderEditingMode(!isHeaderEditingMode)}
                            className={cn("h-10 w-10 rounded-xl transition-all shadow-sm", isHeaderEditingMode ? "bg-primary text-black" : "bg-muted hover:bg-primary/10 hover:text-primary")}
                          >
                            <Columns className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-[8px] font-black uppercase">Edit Field Labels</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <button onClick={() => setExpandedAssetId(null)} className="h-10 w-10 flex items-center justify-center bg-muted/50 rounded-xl hover:bg-destructive/10 transition-colors shadow-sm"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <ScrollArea className="flex-1 custom-scrollbar">
                <div className="p-4 sm:p-8">
                  {processedAssets.find(a => a.id === expandedAssetId) && (
                    <AssetDossier 
                      record={transformAssetToRecord(processedAssets.find(a => a.id === expandedAssetId)!, workstationHeaders, appSettings?.sourceBranding)} 
                      onEdit={handleEditAsset}
                      onQuickUpdate={handleQuickUpdate}
                      isHeaderEditingMode={isHeaderEditingMode}
                    />
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Selection Hub */}
      <AnimatePresence>
        {isSelectionBarVisible && (
          <motion.div initial={{ opacity: 0, y: 40, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 40, x: "-50%" }} className="fixed bottom-8 left-1/2 z-50 w-full sm:w-auto max-w-[calc(100vw-2rem)] bg-background/95 border-2 border-primary/20 rounded-2xl p-2.5 flex items-center shadow-3xl backdrop-blur-3xl">
            <div className="flex items-center gap-3 pl-3 pr-6 border-r border-border shrink-0">
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-black font-black text-[10px] shadow-lg">{showList ? selectedAssetIds.size : selectedCategories.length}</div>
              <span className="text-[9px] font-black uppercase text-foreground tracking-widest hidden xs:block">Items Selected</span>
            </div>
            <ScrollArea className="flex-1 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-1">
                {showList && selectedAssetIds.size === 1 ? (
                  (canEdit || isVerificationMode) && (
                    <Button onClick={() => handleEditAsset(Array.from(selectedAssetIds)[0])} className="h-11 px-6 rounded-xl font-black uppercase text-[10px] gap-2 shadow-xl shrink-0"><Edit3 className="h-4 w-4" /> Edit Profile</Button>
                  )
                ) : (
                  canEdit && (
                    <Button onClick={() => showList ? setIsAssetBatchEditOpen(true) : setIsCategoryBatchEditOpen(true)} className="h-11 px-6 rounded-xl font-black uppercase text-[10px] gap-2 shadow-xl shrink-0"><Edit3 className="h-4 w-4" /> Batch Change</Button>
                  )
                )}
                
                <Button variant="outline" onClick={handleSelectionExport} className="h-11 px-6 rounded-xl font-black uppercase text-[10px] gap-2 border-border bg-muted/20 shrink-0 hover:border-primary/40 transition-all"><FileDown className="h-4 w-4" /> Export</Button>
                
                <Button variant="outline" className="h-11 px-6 rounded-xl font-black uppercase text-[10px] gap-2 text-destructive border-destructive/20 shrink-0 hover:bg-destructive/5 transition-all" onClick={() => showList ? setIsAssetDeleteOpen(true) : setIsPurgeDialogOpen(true)}><Trash2 className="h-4 w-4" /> Clear</Button>
              </div>
              <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>
            <button onClick={() => showList ? setSelectedAssetIds(new Set()) : setSelectedCategories([])} className="p-2.5 text-muted-foreground hover:text-foreground rounded-xl transition-colors"><X className="h-5 w-5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <AssetForm 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        asset={processedAssets.find(a => a.id === selectedAssetIdForEdit)} 
        isReadOnly={false} 
        onSave={async (a) => { await enqueueMutation('UPDATE', 'assets', a); await refreshRegistry(); setIsFormOpen(false); }} 
      />
      
      <CategoryBatchEditForm 
        isOpen={isCategoryBatchEditOpen} 
        onOpenChange={setIsCategoryBatchEditOpen} 
        selectedCategoryCount={selectedCategories.length} 
        onSave={handleSaveCategoryBatchEdit} 
      />
      
      <AssetBatchEditForm 
        isOpen={isAssetBatchEditOpen} 
        onOpenChange={setIsAssetBatchEditOpen} 
        selectedAssetCount={selectedAssetIds.size} 
        onSave={handleSaveAssetBatch} 
      />
      
      <SortDrawer 
        isOpen={isSortOpen} 
        onOpenChange={setIsSortOpen} 
        headers={workstationHeaders} 
        sortBy={sortKey} 
        sortDirection={sortDir} 
        onUpdateSort={(k, dir) => { setSortKey(k); setSortDir(dir); }} 
      />

      <FilterDrawer 
        isOpen={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        headers={workstationHeaders}
        activeFilters={filters}
        onUpdateFilters={setFilters}
        optionsMap={optionsMap}
      />

      <ImportScannerDialog 
        isOpen={isImportScannerOpen}
        onOpenChange={setIsImportScannerOpen}
        targetFolderName={targetFolderForImport}
      />

      <AlertDialog open={isAssetDeleteOpen} onOpenChange={setIsAssetDeleteOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 bg-background text-foreground shadow-3xl">
          <AlertDialogHeader>
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit mx-auto mb-4 border border-destructive/20 shadow-inner"><Trash2 className="h-8 w-8 text-destructive" /></div>
            <AlertDialogTitle className="text-xl font-black uppercase text-destructive tracking-tight text-center">Delete Selected Records?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic text-muted-foreground text-center leading-relaxed">This will permanently remove {selectedAssetIds.size} items from your list. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-3">
            <AlertDialogCancel className="flex-1 rounded-xl font-bold border-2 m-0 h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDeleteAssets} disabled={isProcessing} className="flex-[2] bg-destructive text-white font-black uppercase text-[10px] tracking-widest px-8 rounded-xl m-0 h-12 shadow-xl shadow-destructive/30">Confirm Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-destructive/20 bg-background text-foreground shadow-3xl">
          <AlertDialogHeader>
            <div className="p-4 bg-destructive/10 rounded-2xl w-fit mx-auto mb-4 border border-destructive/20 shadow-inner"><Trash2 className="h-8 w-8 text-destructive" /></div>
            <AlertDialogTitle className="text-xl font-black uppercase text-destructive tracking-tight text-center">Clear Selected Folders?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium italic text-muted-foreground text-center leading-relaxed">This will delete all records within the {selectedCategories.length} selected folders. This action is permanent.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-3">
            <AlertDialogCancel className="flex-1 rounded-xl font-bold border-2 m-0 h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePurgeFolders} disabled={isProcessing} className="flex-[2] bg-destructive text-white font-black uppercase text-[10px] tracking-widest px-8 rounded-xl m-0 h-12 shadow-xl shadow-destructive/30">Confirm Clear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedSheetDef && (
        <ColumnCustomizationSheet 
          isOpen={isColumnSheetOpen}
          onOpenChange={setIsColumnSheetOpen}
          sheetDefinition={selectedSheetDef}
          originalSheetName={originalSheetName}
          onSave={(orig, newDef, all) => {
            const grant = appSettings?.grants.find(g => g.sheetDefinitions[orig || ''] || g.sheetDefinitions[newDef.name]);
            if (!grant) return;

            const updatedGrants = appSettings?.grants.map(g => {
              if (g.id === grant.id) {
                const newSheetDefs = { ...g.sheetDefinitions };
                if (all) {
                  Object.keys(newSheetDefs).forEach(k => { newSheetDefs[k] = { ...newDef, name: k }; });
                } else {
                  newSheetDefs[newDef.name] = newDef;
                  if (orig && orig !== newDef.name) delete newSheetDefs[orig];
                }
                return { ...grant, sheetDefinitions: newSheetDefs };
              }
              return g;
            });

            if (appSettings) {
              const nextSettings = { ...appSettings, grants: updatedGrants };
              setAppSettings(nextSettings);
              storage.saveSettings(nextSettings);
              if (isOnline) FirestoreService.updateSettings(nextSettings);
              addNotification({ title: "Folder Setup Saved", variant: "success" });
            }
          }}
        />
      )}
    </div>
  );
}
